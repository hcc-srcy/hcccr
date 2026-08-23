-- HCCCR survey schema. Run in the Supabase SQL editor on a new project.
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.form_visibility_enum as enum ('public', 'public_password', 'unlisted');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.contact_status_enum as enum ('unread', 'read', 'replied', 'archived');
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

create table if not exists public.site_content (
  content_key text primary key check (content_key ~ '^[a-z0-9._-]+$'),
  content_value text not null default '' check (char_length(content_value) <= 12000),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(sender_name) between 1 and 80),
  sender_email text not null check (char_length(sender_email) between 3 and 254 and position('@' in sender_email) > 1),
  subject text not null check (char_length(subject) between 1 and 120),
  message text not null check (char_length(message) between 10 and 5000),
  agreed_privacy boolean not null check (agreed_privacy),
  status public.contact_status_enum not null default 'unread',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists form_submissions_form_id_idx on public.form_submissions(form_id);
create index if not exists form_submissions_submitted_at_idx on public.form_submissions(submitted_at desc);
create index if not exists contact_messages_status_created_at_idx on public.contact_messages(status, created_at desc);
create index if not exists contact_messages_sender_email_created_at_idx on public.contact_messages(lower(sender_email), created_at desc);

alter table public.admin_users enable row level security;
alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;
alter table public.site_content enable row level security;
alter table public.contact_messages enable row level security;

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

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content" on public.site_content
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage site content" on public.site_content;
create policy "Admins manage site content" on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage contact messages" on public.contact_messages;
create policy "Admins manage contact messages" on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.set_admin_managed_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_table_name = 'site_content' then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
before insert or update on public.site_content
for each row execute function public.set_admin_managed_updated_at();

drop trigger if exists contact_messages_set_updated_at on public.contact_messages;
create trigger contact_messages_set_updated_at
before update on public.contact_messages
for each row execute function public.set_admin_managed_updated_at();

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
  current_field jsonb;
  branch_rule jsonb;
  branch_action text;
  branch_answer text;
  reachable_ids text[] := array[]::text[];
  saved_answers jsonb;
  field_index integer := 0;
  target_index integer;
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
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be an object';
  end if;
  if p_started_at > now() or p_started_at < now() - interval '24 hours' then
    raise exception 'Invalid start time';
  end if;

  while field_index < jsonb_array_length(target.fields) loop
    current_field := target.fields -> field_index;
    reachable_ids := array_append(reachable_ids, current_field ->> 'id');

    if current_field ->> 'type' = 'radio'
      and jsonb_typeof(current_field -> 'branching') = 'object'
      and current_field -> 'branching' <> '{}'::jsonb then
      branch_answer := p_answers ->> (current_field ->> 'id');
      if coalesce(branch_answer, '') = '' then
        field_index := field_index + 1;
        continue;
      end if;
      branch_rule := current_field -> 'branching' -> branch_answer;
      branch_action := coalesce(branch_rule ->> 'action', 'next');

      if branch_action = 'screenout' then
        raise exception 'Screened out response cannot be submitted';
      elsif branch_action = 'submit' then
        exit;
      elsif branch_action = 'jump' then
        select candidate.ordinality::integer - 1 into target_index
        from jsonb_array_elements(target.fields) with ordinality as candidate(value, ordinality)
        where candidate.value ->> 'id' = branch_rule ->> 'target_field_id'
          and candidate.ordinality::integer - 1 > field_index
        limit 1;
        if target_index is null then raise exception 'Invalid branch target'; end if;
        field_index := target_index;
        continue;
      end if;
    end if;

    field_index := field_index + 1;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(target.fields) as field
    where field ->> 'id' = any(reachable_ids)
      and coalesce((field ->> 'required')::boolean, false)
      and (
        not (p_answers ? (field ->> 'id'))
        or p_answers -> (field ->> 'id') is null
        or p_answers -> (field ->> 'id') in ('""'::jsonb, '[]'::jsonb, 'null'::jsonb)
      )
  ) then
    raise exception 'Required answers are missing';
  end if;

  select coalesce(jsonb_object_agg(answer.key, answer.value), '{}'::jsonb)
  into saved_answers
  from jsonb_each(p_answers) as answer(key, value)
  where answer.key = any(reachable_ids);

  insert into public.form_submissions(form_id, agreed_terms, answers, started_at)
  values (p_form_id, p_agreed_terms, saved_answers, p_started_at)
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.submit_contact_message(
  p_sender_name text,
  p_sender_email text,
  p_subject text,
  p_message text,
  p_agreed_privacy boolean,
  p_website text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  normalized_email text := lower(trim(coalesce(p_sender_email, '')));
begin
  if trim(coalesce(p_website, '')) <> '' then
    raise exception 'Message rejected';
  end if;
  if not coalesce(p_agreed_privacy, false) then
    raise exception 'Privacy consent is required';
  end if;
  if char_length(trim(coalesce(p_sender_name, ''))) not between 1 and 80
    or char_length(normalized_email) not between 3 and 254
    or position('@' in normalized_email) <= 1
    or char_length(trim(coalesce(p_subject, ''))) not between 1 and 120
    or char_length(trim(coalesce(p_message, ''))) not between 10 and 5000 then
    raise exception 'Invalid contact message';
  end if;
  if (
    select count(*) from public.contact_messages
    where lower(sender_email) = normalized_email
      and created_at > now() - interval '10 minutes'
  ) >= 3 then
    raise exception 'Too many messages';
  end if;

  insert into public.contact_messages(sender_name, sender_email, subject, message, agreed_privacy)
  values (
    trim(p_sender_name), normalized_email, trim(p_subject), trim(p_message), true
  ) returning id into saved_id;
  return saved_id;
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
revoke all on function public.submit_contact_message(text, text, text, text, boolean, text) from public;
grant execute on function public.list_public_forms() to anon, authenticated;
grant execute on function public.get_public_form(text, text) to anon, authenticated;
grant execute on function public.submit_form(uuid, jsonb, timestamptz, boolean, text) to anon, authenticated;
grant execute on function public.admin_save_form(jsonb, text) to authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, boolean, text) to anon, authenticated;

grant select on table public.site_content to anon, authenticated;
grant insert, update, delete on table public.site_content to authenticated;
grant select, update, delete on table public.contact_messages to authenticated;

-- ============================================================================
-- 收件匣雙向訊息（2026-08）：後台可回覆並主動發起訊息，寄件人可透過專屬連結追蹤對話。
-- 本區塊可安全重複執行，不會刪除既有問卷、回應或聯絡訊息。
-- ============================================================================

do $$ begin
  create type public.message_sender_enum as enum ('admin', 'sender');
exception
  when duplicate_object then null;
end $$;

alter table public.contact_messages
  add column if not exists access_token uuid not null default gen_random_uuid(),
  add column if not exists origin text not null default 'contact_form' check (origin in ('contact_form', 'admin_initiated')),
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists sender_unread boolean not null default false;

create unique index if not exists contact_messages_access_token_key on public.contact_messages(access_token);
create index if not exists contact_messages_last_activity_at_idx on public.contact_messages(last_activity_at desc);

create table if not exists public.message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  sender_type public.message_sender_enum not null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists message_replies_message_id_created_at_idx on public.message_replies(message_id, created_at);

alter table public.message_replies enable row level security;

drop policy if exists "Admins manage message replies" on public.message_replies;
create policy "Admins manage message replies" on public.message_replies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 後台送出回覆／寄件人在自己的對話串回覆時，同步更新母訊息的狀態與最後互動時間。
create or replace function public.touch_contact_message_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_type = 'admin' then
    update public.contact_messages
      set status = 'replied', last_activity_at = now(), sender_unread = true, updated_at = now()
      where id = new.message_id;
  else
    update public.contact_messages
      set status = 'unread', last_activity_at = now(), updated_at = now()
      where id = new.message_id;
  end if;
  return new;
end;
$$;

drop trigger if exists message_replies_touch_parent on public.message_replies;
create trigger message_replies_touch_parent
after insert on public.message_replies
for each row execute function public.touch_contact_message_on_reply();

-- 舊版 submit_contact_message 只回傳 id；改為回傳 id 及 access_token，讓前台能顯示追蹤連結。
drop function if exists public.submit_contact_message(text, text, text, text, boolean, text);

create or replace function public.submit_contact_message(
  p_sender_name text,
  p_sender_email text,
  p_subject text,
  p_message text,
  p_agreed_privacy boolean,
  p_website text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  saved_token uuid;
  normalized_email text := lower(trim(coalesce(p_sender_email, '')));
begin
  if trim(coalesce(p_website, '')) <> '' then
    raise exception 'Message rejected';
  end if;
  if not coalesce(p_agreed_privacy, false) then
    raise exception 'Privacy consent is required';
  end if;
  if char_length(trim(coalesce(p_sender_name, ''))) not between 1 and 80
    or char_length(normalized_email) not between 3 and 254
    or position('@' in normalized_email) <= 1
    or char_length(trim(coalesce(p_subject, ''))) not between 1 and 120
    or char_length(trim(coalesce(p_message, ''))) not between 10 and 5000 then
    raise exception 'Invalid contact message';
  end if;
  if (
    select count(*) from public.contact_messages
    where lower(sender_email) = normalized_email
      and created_at > now() - interval '10 minutes'
  ) >= 3 then
    raise exception 'Too many messages';
  end if;

  insert into public.contact_messages(sender_name, sender_email, subject, message, agreed_privacy, origin)
  values (
    trim(p_sender_name), normalized_email, trim(p_subject), trim(p_message), true, 'contact_form'
  ) returning id, access_token into saved_id, saved_token;
  return jsonb_build_object('id', saved_id, 'access_token', saved_token);
end;
$$;

-- 寄件人憑專屬連結（id + access_token）查看自己的對話串，不需登入。
create or replace function public.get_message_thread(p_message_id uuid, p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.contact_messages;
  replies jsonb;
begin
  select * into target from public.contact_messages
  where id = p_message_id and access_token = p_token;
  if target.id is null then
    raise exception 'Message not found';
  end if;

  if target.sender_unread then
    update public.contact_messages set sender_unread = false where id = p_message_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'sender_type', r.sender_type, 'body', r.body, 'created_at', r.created_at
  ) order by r.created_at), '[]'::jsonb)
  into replies
  from public.message_replies r
  where r.message_id = p_message_id;

  return jsonb_build_object(
    'id', target.id,
    'subject', target.subject,
    'sender_name', target.sender_name,
    'message', target.message,
    'status', target.status,
    'origin', target.origin,
    'created_at', target.created_at,
    'replies', replies
  );
end;
$$;

-- 寄件人在自己的對話串中新增一則回覆訊息（速率限制避免濫用）。
create or replace function public.reply_to_message_thread(p_message_id uuid, p_token uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.contact_messages;
begin
  select * into target from public.contact_messages
  where id = p_message_id and access_token = p_token;
  if target.id is null then
    raise exception 'Message not found';
  end if;
  if target.status = 'archived' then
    raise exception 'This conversation is closed';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 5000 then
    raise exception 'Invalid reply';
  end if;
  if (
    select count(*) from public.message_replies
    where message_id = p_message_id and sender_type = 'sender'
      and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Too many replies, please wait a moment';
  end if;

  insert into public.message_replies(message_id, sender_type, body)
  values (p_message_id, 'sender', trim(p_body));

  return public.get_message_thread(p_message_id, p_token);
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, boolean, text) from public;
revoke all on function public.get_message_thread(uuid, uuid) from public;
revoke all on function public.reply_to_message_thread(uuid, uuid, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_message_thread(uuid, uuid) to anon, authenticated;
grant execute on function public.reply_to_message_thread(uuid, uuid, text) to anon, authenticated;

grant select, insert on table public.message_replies to authenticated;
grant select, update on table public.contact_messages to authenticated;
grant insert on table public.contact_messages to authenticated;
