(function () {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const FORM_KEY = "hcccr_demo_forms";
  const SUBMISSION_KEY = "hcccr_demo_submissions";

  function readSession(key, fallback) {
    try {
      const stored = window.sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : clone(fallback);
    } catch (error) {
      console.warn("Session storage unavailable", error);
      return clone(fallback);
    }
  }

  function writeSession(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Session storage unavailable", error);
    }
  }

  function createLocalService() {
    return {
      mode: "demo",
      async getForms({ includeUnlisted = false } = {}) {
        const data = readSession(FORM_KEY, window.HCCCR_SEED.forms);
        return data.filter((form) => includeUnlisted || form.visibility !== "unlisted");
      },
      async getForm(identifier) {
        const data = await this.getForms({ includeUnlisted: true });
        return data.find((form) => form.id === identifier || form.slug === identifier) || null;
      },
      async unlockForm(identifier, password) {
        const form = await this.getForm(identifier);
        return form && form.access_password === password ? form : null;
      },
      async saveForm(form) {
        const data = await this.getForms({ includeUnlisted: true });
        const index = data.findIndex((item) => item.id === form.id);
        const now = new Date().toISOString();
        const saved = { ...form, updated_at: now };
        if (index >= 0) {
          saved.is_edited = true;
          data.splice(index, 1, saved);
        } else {
          saved.created_at = now;
          saved.is_edited = false;
          data.unshift(saved);
        }
        writeSession(FORM_KEY, data);
        return clone(saved);
      },
      async getSubmissions(formId) {
        const data = readSession(SUBMISSION_KEY, window.HCCCR_SEED.submissions);
        return data.filter((submission) => !formId || submission.form_id === formId);
      },
      async saveSubmission(submission) {
        const data = readSession(SUBMISSION_KEY, window.HCCCR_SEED.submissions);
        const saved = {
          ...submission,
          id: submission.id || (crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}`),
        };
        data.unshift(saved);
        writeSession(SUBMISSION_KEY, data);
        return clone(saved);
      },
      async deleteSubmission(id) {
        const data = readSession(SUBMISSION_KEY, window.HCCCR_SEED.submissions);
        writeSession(SUBMISSION_KEY, data.filter((item) => item.id !== id));
      },
      async signInWithMagicLink(email) {
        window.sessionStorage.setItem("hcccr_demo_admin", email);
        return { email, demo: true };
      },
      async getAdminSession() {
        const email = window.sessionStorage.getItem("hcccr_demo_admin");
        return email ? { email, demo: true } : null;
      },
      async signOut() {
        window.sessionStorage.removeItem("hcccr_demo_admin");
      },
    };
  }

  function createSupabaseService() {
    const client = window.supabase.createClient(
      window.APP_CONFIG.supabaseUrl,
      window.APP_CONFIG.supabaseAnonKey,
    );
    const formColumns = "id,title,description,slug,visibility,require_terms_consent,is_open,is_edited,start_date,end_date,fields,created_at,updated_at,category,estimated_minutes";
    return {
      mode: "supabase",
      client,
      async getForms({ includeUnlisted = false } = {}) {
        let data;
        let error;
        if (includeUnlisted) {
          ({ data, error } = await client.from("forms").select(formColumns).order("created_at", { ascending: false }));
        } else {
          ({ data, error } = await client.rpc("list_public_forms"));
        }
        if (error) throw error;
        return data;
      },
      async getForm(identifier) {
        const { data: sessionData } = await client.auth.getSession();
        const isUuid = /^[0-9a-f-]{36}$/i.test(identifier);
        const result = sessionData.session
          ? await client.from("forms").select(formColumns).eq(isUuid ? "id" : "slug", identifier).maybeSingle()
          : await client.rpc("get_public_form", { p_identifier: identifier, p_password: null });
        const { data, error } = result;
        if (error) throw error;
        return data;
      },
      async unlockForm(identifier, password) {
        const { data, error } = await client.rpc("get_public_form", { p_identifier: identifier, p_password: password });
        if (error) throw error;
        return data?.password_valid ? data : null;
      },
      async saveForm(form) {
        const { access_password: accessPassword, ...payload } = form;
        const { data, error } = await client.rpc("admin_save_form", {
          p_payload: payload,
          p_access_password: accessPassword || null,
        });
        if (error) throw error;
        return data;
      },
      async getSubmissions(formId) {
        let query = client.from("form_submissions").select("*").order("submitted_at", { ascending: false });
        if (formId) query = query.eq("form_id", formId);
        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
      async saveSubmission(submission) {
        const { access_password: accessPassword, ...payload } = submission;
        const { data, error } = await client.rpc("submit_form", {
          p_form_id: payload.form_id,
          p_answers: payload.answers,
          p_started_at: payload.started_at,
          p_agreed_terms: payload.agreed_terms,
          p_access_password: accessPassword || null,
        });
        if (error) throw error;
        return data;
      },
      async deleteSubmission(id) {
        const { error } = await client.from("form_submissions").delete().eq("id", id);
        if (error) throw error;
      },
      async signInWithMagicLink(email) {
        const { data, error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.APP_CONFIG.siteUrl}/admin/dashboard.html`,
            shouldCreateUser: false,
          },
        });
        if (error) throw error;
        return data;
      },
      async getAdminSession() {
        const { data } = await client.auth.getSession();
        return data.session?.user || null;
      },
      async signOut() {
        await client.auth.signOut();
      },
    };
  }

  function createUnavailableService() {
    const unavailable = async () => {
      throw new Error("Supabase client failed to load");
    };
    return {
      mode: "unavailable",
      getForms: unavailable,
      getForm: unavailable,
      unlockForm: unavailable,
      saveForm: unavailable,
      getSubmissions: unavailable,
      saveSubmission: unavailable,
      deleteSubmission: unavailable,
      signInWithMagicLink: unavailable,
      getAdminSession: unavailable,
      signOut: unavailable,
    };
  }

  window.HCCCR_DATA = window.APP_CONFIG.supabaseEnabled
    ? (window.supabase ? createSupabaseService() : createUnavailableService())
    : createLocalService();
})();
