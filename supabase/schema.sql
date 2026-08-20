-- HCCCR survey schema. Run in the Supabase SQL editor on a new project.
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.form_visibility_enum as enum ('public', 'public_password', 'unlisted');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null check (email = lower(email)),
  created_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default '兒少議題',
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  visibility public.form_visibility_enum not null default 'public',
  access_password_hash text,
  require_terms_consent boolean not null default true,
  is_open boolean not null default true,
  is_edited boolean not null default false,
  estimated_minutes integer not null default 3 check (estimated_minutes > 0),
  start_date timestamptz not null default now(),
  end_date timestamptz,
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date > start_date),
  check (visibility <> 'public_password' or access_password_hash is not null)
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  agreed_terms boolean not null default true,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  started_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  duration_seconds integer generated always as (
    greatest(0, extract(epoch from (submitted_at - started_at))::integer)
  ) stored,
  check (submitted_at >= started_at)
);

create index if not exists form_submissions_form_id_idx on public.form_submissions(form_id);
create index if not exists form_submissions_submitted_at_idx on public.form_submissions(submitted_at desc);

alter table public.admin_users enable row level security;
alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can read whitelist" on public.admin_users;
create policy "Admins can read whitelist" on public.admin_users
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins manage forms" on public.forms;
create policy "Admins manage forms" on public.forms
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage submissions" on public.form_submissions;
create policy "Admins manage submissions" on public.form_submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.form_public_json(target public.forms, include_fields boolean, password_valid boolean default true)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', target.id,
    'title', target.title,
    'description', target.description,
    'category', target.category,
    'slug', target.slug,
    'visibility', target.visibility,
    'require_terms_consent', target.require_terms_consent,
    'is_open', target.is_open,
    'is_edited', target.is_edited,
    'estimated_minutes', target.estimated_minutes,
    'start_date', target.start_date,
    'end_date', target.end_date,
    'fields', case when include_fields then target.fields else '[]'::jsonb end,
    'created_at', target.created_at,
    'updated_at', target.updated_at,
    'password_required', target.visibility = 'public_password',
    'password_valid', password_valid
  );
$$;

create or replace function public.list_public_forms()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.form_public_json(forms, false, visibility <> 'public_password')
  from public.forms
  where visibility in ('public', 'public_password')
  order by created_at desc;
$$;

create or replace function public.get_public_form(p_identifier text, p_password text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target public.forms;
  password_ok boolean;
begin
  select * into target
  from public.forms
  where id::text = p_identifier or slug = p_identifier
  limit 1;

  if target.id is null then return null; end if;
  password_ok := target.visibility <> 'public_password'
    or (p_password is not null and extensions.crypt(p_password, target.access_password_hash) = target.access_password_hash);
  return public.form_public_json(target, password_ok, password_ok);
end;
$$;

create or replace function public.submit_form(
  p_form_id uuid,
  p_answers jsonb,
  p_started_at timestamptz,
  p_agreed_terms boolean,
  p_access_password text default null
)
returns public.form_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.forms;
  saved public.form_submissions;
begin
  select * into target from public.forms where id = p_form_id;
  if target.id is null then raise exception 'Form not found'; end if;
  if not target.is_open or target.start_date > now() or (target.end_date is not null and target.end_date < now()) then
    raise exception 'Form is not accepting responses';
  end if;
  if target.require_terms_consent and not coalesce(p_agreed_terms, false) then
    raise exception 'Terms consent is required';
  end if;
  if target.visibility = 'public_password'
    and (p_access_password is null or extensions.crypt(p_access_password, target.access_password_hash) <> target.access_password_hash) then
    raise exception 'Invalid access password';
  end if;
  if p_started_at > now() or p_started_at < now() - interval '24 hours' then
    raise exception 'Invalid start time';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(target.fields) as field
    where coalesce((field ->> 'required')::boolean, false)
      and (
        not (p_answers ? (field ->> 'id'))
        or p_answers -> (field ->> 'id') is null
        or p_answers -> (field ->> 'id') in ('""'::jsonb, '[]'::jsonb, 'null'::jsonb)
      )
  ) then
    raise exception 'Required answers are missing';
  end if;

  insert into public.form_submissions(form_id, agreed_terms, answers, started_at)
  values (p_form_id, p_agreed_terms, p_answers, p_started_at)
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.admin_save_form(p_payload jsonb, p_access_password text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.forms;
  target_id uuid := coalesce((p_payload ->> 'id')::uuid, gen_random_uuid());
  target_visibility public.form_visibility_enum := coalesce((p_payload ->> 'visibility')::public.form_visibility_enum, 'public');
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  select * into target from public.forms where id = target_id;
  if target.id is null then
    if target_visibility = 'public_password' and coalesce(p_access_password, '') = '' then
      raise exception 'Password is required';
    end if;
    insert into public.forms (
      id, title, description, category, slug, visibility, access_password_hash,
      require_terms_consent, is_open, estimated_minutes, start_date, end_date,
      fields, created_by
    ) values (
      target_id, p_payload ->> 'title', coalesce(p_payload ->> 'description', ''),
      coalesce(p_payload ->> 'category', '兒少議題'), p_payload ->> 'slug', target_visibility,
      case when target_visibility = 'public_password' then
        extensions.crypt(p_access_password, extensions.gen_salt('bf'))
      end,
      coalesce((p_payload ->> 'require_terms_consent')::boolean, true),
      coalesce((p_payload ->> 'is_open')::boolean, true),
      coalesce((p_payload ->> 'estimated_minutes')::integer, 3),
      coalesce((p_payload ->> 'start_date')::timestamptz, now()),
      (p_payload ->> 'end_date')::timestamptz,
      coalesce(p_payload -> 'fields', '[]'::jsonb), auth.uid()
    ) returning * into target;
  else
    update public.forms set
      title = p_payload ->> 'title',
      description = coalesce(p_payload ->> 'description', ''),
      category = coalesce(p_payload ->> 'category', '兒少議題'),
      slug = p_payload ->> 'slug',
      visibility = target_visibility,
      access_password_hash = case
        when target_visibility <> 'public_password' then null
        when coalesce(p_access_password, '') <> '' then
          extensions.crypt(p_access_password, extensions.gen_salt('bf'))
        else access_password_hash
      end,
      require_terms_consent = coalesce((p_payload ->> 'require_terms_consent')::boolean, true),
      is_open = coalesce((p_payload ->> 'is_open')::boolean, true),
      is_edited = true,
      estimated_minutes = coalesce((p_payload ->> 'estimated_minutes')::integer, estimated_minutes),
      start_date = coalesce((p_payload ->> 'start_date')::timestamptz, start_date),
      end_date = (p_payload ->> 'end_date')::timestamptz,
      fields = coalesce(p_payload -> 'fields', fields),
      updated_at = now()
    where id = target_id returning * into target;
  end if;

  return public.form_public_json(target, true, true);
end;
$$;

revoke all on function public.list_public_forms() from public;
revoke all on function public.get_public_form(text, text) from public;
revoke all on function public.submit_form(uuid, jsonb, timestamptz, boolean, text) from public;
revoke all on function public.admin_save_form(jsonb, text) from public;
grant execute on function public.list_public_forms() to anon, authenticated;
grant execute on function public.get_public_form(text, text) to anon, authenticated;
grant execute on function public.submit_form(uuid, jsonb, timestamptz, boolean, text) to anon, authenticated;
grant execute on function public.admin_save_form(jsonb, text) to authenticated;
