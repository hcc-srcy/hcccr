(function () {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const FORM_KEY = "hcccr_demo_forms";
  const SUBMISSION_KEY = "hcccr_demo_submissions";
  const CONTENT_KEY = "hcccr_demo_site_content";
  const CONTACT_KEY = "hcccr_demo_contact_messages";
  const REPLY_KEY = "hcccr_demo_message_replies";
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`);

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
      async getPublicImpactStats() {
        const forms = await this.getForms();
        const submissions = readSession(SUBMISSION_KEY, window.HCCCR_SEED.submissions);
        return {
          open_surveys: forms.filter((form) => form.is_open).length,
          total_responses: submissions.length,
        };
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
      async getSiteContent() {
        return readSession(CONTENT_KEY, window.HCCCR_CONTENT_DEFAULTS || {});
      },
      async saveSiteContent(content) {
        const existing = readSession(CONTENT_KEY, {});
        const merged = { ...existing, ...content };
        writeSession(CONTENT_KEY, merged);
        return clone(merged);
      },
      async uploadTeamPhoto(file) {
        if (!(file instanceof File)) throw new Error("請選擇照片檔案");
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("照片限 JPG、PNG 或 WebP 格式");
        if (file.size > 5 * 1024 * 1024) throw new Error("照片大小不可超過 5MB");
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("無法讀取照片"));
          reader.readAsDataURL(file);
        });
      },
      async sendContactMessage(message) {
        const data = readSession(CONTACT_KEY, []);
        const now = new Date().toISOString();
        const saved = {
          ...message,
          id: uid(),
          access_token: uid(),
          origin: "contact_form",
          status: "unread",
          last_activity_at: now,
          sender_unread: false,
          created_at: now,
          updated_at: now,
        };
        delete saved.website;
        data.unshift(saved);
        writeSession(CONTACT_KEY, data);
        return { id: saved.id, access_token: saved.access_token };
      },
      async getContactMessages() {
        return readSession(CONTACT_KEY, []);
      },
      async updateContactMessage(id, updates) {
        const data = readSession(CONTACT_KEY, []);
        const message = data.find((item) => item.id === id);
        if (!message) throw new Error("CONTACT_NOT_FOUND");
        Object.assign(message, updates, { updated_at: new Date().toISOString() });
        writeSession(CONTACT_KEY, data);
        return clone(message);
      },
      async deleteContactMessage(id) {
        const data = readSession(CONTACT_KEY, []);
        writeSession(CONTACT_KEY, data.filter((item) => item.id !== id));
        const replies = readSession(REPLY_KEY, []);
        writeSession(REPLY_KEY, replies.filter((item) => item.message_id !== id));
      },
      async createAdminMessage(message) {
        const data = readSession(CONTACT_KEY, []);
        const now = new Date().toISOString();
        const saved = {
          id: uid(),
          access_token: uid(),
          origin: "admin_initiated",
          status: "replied",
          sender_name: message.sender_name,
          sender_email: message.sender_email,
          subject: message.subject,
          message: message.message,
          agreed_privacy: true,
          last_activity_at: now,
          sender_unread: true,
          created_at: now,
          updated_at: now,
        };
        data.unshift(saved);
        writeSession(CONTACT_KEY, data);
        return clone(saved);
      },
      async getMessageReplies(messageId) {
        const data = readSession(REPLY_KEY, []);
        return data.filter((item) => item.message_id === messageId).sort((a, b) => a.created_at.localeCompare(b.created_at));
      },
      async sendAdminReply(messageId, body) {
        const replies = readSession(REPLY_KEY, []);
        const now = new Date().toISOString();
        const reply = { id: uid(), message_id: messageId, sender_type: "admin", body, created_at: now };
        replies.push(reply);
        writeSession(REPLY_KEY, replies);
        await this.updateContactMessage(messageId, { status: "replied", last_activity_at: now, sender_unread: true });
        return reply;
      },
      async getPublicMessageThread(messageId, token) {
        const data = readSession(CONTACT_KEY, []);
        const message = data.find((item) => item.id === messageId && item.access_token === token);
        if (!message) throw new Error("MESSAGE_NOT_FOUND");
        if (message.sender_unread) {
          message.sender_unread = false;
          writeSession(CONTACT_KEY, data);
        }
        const replies = await this.getMessageReplies(messageId);
        return { ...clone(message), replies };
      },
      async replyToPublicThread(messageId, token, body) {
        const data = readSession(CONTACT_KEY, []);
        const message = data.find((item) => item.id === messageId && item.access_token === token);
        if (!message) throw new Error("MESSAGE_NOT_FOUND");
        if (message.status === "archived") throw new Error("THREAD_CLOSED");
        const replies = readSession(REPLY_KEY, []);
        const now = new Date().toISOString();
        replies.push({ id: uid(), message_id: messageId, sender_type: "sender", body, created_at: now });
        writeSession(REPLY_KEY, replies);
        message.status = "unread";
        message.last_activity_at = now;
        message.updated_at = now;
        writeSession(CONTACT_KEY, data);
        return this.getPublicMessageThread(messageId, token);
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
      async getPublicImpactStats() {
        const { data, error } = await client.rpc("get_public_impact_stats");
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
        const pageSize = 1000;
        const submissions = [];
        for (let from = 0; ; from += pageSize) {
          let query = client
            .from("form_submissions")
            .select("*")
            .order("submitted_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, from + pageSize - 1);
          if (formId) query = query.eq("form_id", formId);
          const { data, error } = await query;
          if (error) throw error;
          submissions.push(...data);
          if (data.length < pageSize) return submissions;
        }
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
      async getSiteContent() {
        const { data, error } = await client.from("site_content").select("content_key,content_value");
        if (error) throw error;
        return Object.fromEntries(data.map((item) => [item.content_key, item.content_value]));
      },
      async saveSiteContent(content) {
        const rows = Object.entries(content).map(([content_key, content_value]) => ({ content_key, content_value }));
        const { error } = await client.from("site_content").upsert(rows, { onConflict: "content_key" });
        if (error) throw error;
        return content;
      },
      async uploadTeamPhoto(file, memberId) {
        if (!(file instanceof File)) throw new Error("請選擇照片檔案");
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) throw new Error("照片限 JPG、PNG 或 WebP 格式");
        if (file.size > 5 * 1024 * 1024) throw new Error("照片大小不可超過 5MB");
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const safeId = String(memberId || uid()).replace(/[^a-zA-Z0-9_-]/g, "");
        const path = `${safeId}/${Date.now()}.${extension}`;
        const { error } = await client.storage.from("team-photos").upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        const { data } = client.storage.from("team-photos").getPublicUrl(path);
        return data.publicUrl;
      },
      async sendContactMessage(message) {
        const { data, error } = await client.rpc("submit_contact_message", {
          p_sender_name: message.sender_name,
          p_sender_email: message.sender_email,
          p_subject: message.subject,
          p_message: message.message,
          p_agreed_privacy: message.agreed_privacy,
          p_website: message.website || "",
        });
        if (error) throw error;
        return data;
      },
      async getContactMessages() {
        const { data, error } = await client.from("contact_messages").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      },
      async updateContactMessage(id, updates) {
        const { data, error } = await client.from("contact_messages").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return data;
      },
      async deleteContactMessage(id) {
        const { error } = await client.from("contact_messages").delete().eq("id", id);
        if (error) throw error;
      },
      async createAdminMessage(message) {
        const { data, error } = await client.from("contact_messages").insert({
          sender_name: message.sender_name,
          sender_email: message.sender_email,
          subject: message.subject,
          message: message.message,
          agreed_privacy: true,
          origin: "admin_initiated",
          status: "replied",
          sender_unread: true,
        }).select().single();
        if (error) throw error;
        return data;
      },
      async getMessageReplies(messageId) {
        const { data, error } = await client.from("message_replies").select("*").eq("message_id", messageId).order("created_at", { ascending: true });
        if (error) throw error;
        return data;
      },
      async sendAdminReply(messageId, body) {
        const { data, error } = await client.from("message_replies").insert({
          message_id: messageId,
          sender_type: "admin",
          body,
        }).select().single();
        if (error) throw error;
        return data;
      },
      async getPublicMessageThread(messageId, token) {
        const { data, error } = await client.rpc("get_message_thread", { p_message_id: messageId, p_token: token });
        if (error) throw error;
        return data;
      },
      async replyToPublicThread(messageId, token, body) {
        const { data, error } = await client.rpc("reply_to_message_thread", { p_message_id: messageId, p_token: token, p_body: body });
        if (error) throw error;
        return data;
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
      getPublicImpactStats: unavailable,
      getForm: unavailable,
      unlockForm: unavailable,
      saveForm: unavailable,
      getSubmissions: unavailable,
      saveSubmission: unavailable,
      deleteSubmission: unavailable,
      getSiteContent: unavailable,
      saveSiteContent: unavailable,
      uploadTeamPhoto: unavailable,
      sendContactMessage: unavailable,
      getContactMessages: unavailable,
      updateContactMessage: unavailable,
      deleteContactMessage: unavailable,
      createAdminMessage: unavailable,
      getMessageReplies: unavailable,
      sendAdminReply: unavailable,
      getPublicMessageThread: unavailable,
      replyToPublicThread: unavailable,
      signInWithMagicLink: unavailable,
      getAdminSession: unavailable,
      signOut: unavailable,
    };
  }

  window.HCCCR_DATA = window.APP_CONFIG.supabaseEnabled
    ? (window.supabase ? createSupabaseService() : createUnavailableService())
    : createLocalService();
})();
