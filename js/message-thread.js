(function () {
  const root = document.querySelector("[data-thread-root]");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const messageId = params.get("id") || "";
  const token = params.get("token") || "";

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value || ""));
  }

  function bubbleMarkup(entry) {
    const isAdmin = entry.__root ? entry.__rootIsAdmin : entry.sender_type === "admin";
    return `
      <div class="thread-bubble ${isAdmin ? "thread-bubble--admin" : "thread-bubble--sender"}">
        <div class="thread-bubble__meta"><strong>${isAdmin ? "竹縣少代會" : "我"}</strong><span>${escape(window.HCCCR.formatDate(entry.created_at, true))}</span></div>
        <div class="thread-bubble__body">${escape(entry.body).replaceAll("\n", "<br>")}</div>
      </div>`;
  }

  function renderMissing() {
    root.innerHTML = `
      <div class="thread-page__panel" style="text-align:center">
        <p class="eyebrow">找不到這則對話</p>
        <h2 style="margin:8px 0 12px">連結無效或已被移除</h2>
        <p style="color:var(--muted)">請確認網址是否完整，或透過聯絡表單重新與我們聯繫。</p>
        <p style="margin-top:18px"><a class="button button--secondary" href="${window.HCCCR.appUrl("/contact")}">前往聯絡我們</a></p>
      </div>`;
  }

  function renderThread(thread) {
    const rootIsAdmin = thread.origin === "admin_initiated";
    const entries = [{ __root: true, __rootIsAdmin: rootIsAdmin, body: thread.message, created_at: thread.created_at }, ...(thread.replies || [])];
    const closed = thread.status === "archived";

    root.innerHTML = `
      <div class="thread-page__panel">
        <p class="eyebrow">主旨</p>
        <h2 style="margin:6px 0 0">${escape(thread.subject)}</h2>
        <div class="thread-page__meta"><span><i data-lucide="calendar"></i> 建立於 ${escape(window.HCCCR.formatDate(thread.created_at, true))}</span>${closed ? '<span class="tag">此對話已封存</span>' : ""}</div>
        <div class="thread-scroll" data-thread-scroll>${entries.map(bubbleMarkup).join("")}</div>
        ${closed
          ? '<p class="empty-state" style="margin-top:16px">這則對話已封存，若需要進一步協助，請透過聯絡表單重新來信。</p>'
          : `<form class="thread-reply" data-thread-reply-form>
              <label class="form-label sr-only" for="thread-reply-body">回覆內容</label>
              <textarea class="form-control" id="thread-reply-body" name="body" rows="4" maxlength="5000" placeholder="輸入你的回覆…" required></textarea>
              <p class="field-message" data-thread-reply-error role="alert"></p>
              <button class="button button--small" type="submit"><i data-lucide="send"></i> 送出回覆</button>
            </form>`}
      </div>`;
    window.lucide?.createIcons();
    const scroll = root.querySelector("[data-thread-scroll]");
    if (scroll) scroll.scrollTop = scroll.scrollHeight;

    const form = root.querySelector("[data-thread-reply-form]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const textarea = form.querySelector("textarea");
      const error = form.querySelector("[data-thread-reply-error]");
      const body = textarea.value.trim();
      if (!body) return;
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      error.textContent = "";
      try {
        const updated = await window.HCCCR_DATA.replyToPublicThread(messageId, token, body);
        renderThread(updated);
        window.HCCCR.showToast("回覆已送出。");
      } catch (submitError) {
        console.error(submitError);
        error.textContent = "送出失敗，請稍後再試。";
        button.disabled = false;
      }
    });
  }

  async function load() {
    if (!messageId || !token) {
      renderMissing();
      return;
    }
    try {
      const thread = await window.HCCCR_DATA.getPublicMessageThread(messageId, token);
      renderThread(thread);
    } catch (error) {
      console.error(error);
      renderMissing();
    }
  }

  load();
})();
