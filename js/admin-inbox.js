(function () {
  const list = document.querySelector("[data-message-list]");
  if (!list) return;

  const detail = document.querySelector("[data-message-detail]");
  const statusFilter = document.querySelector("[data-message-filter]");
  const originFilter = document.querySelector("[data-message-origin-filter]");
  const composeDialog = document.querySelector("[data-compose-dialog]");
  const composeForm = document.querySelector("[data-compose-form]");
  const composeError = document.querySelector("[data-compose-error]");

  const statusLabels = { unread: "待處理", read: "已讀", replied: "等待對方回覆", archived: "已封存" };
  const statusTagClass = { unread: "tag--warning", replied: "tag--accent", archived: "" , read: ""};
  const originLabels = { contact_form: "聯絡表單", admin_initiated: "主動發起" };

  let messages = [];
  let selectedId = "";

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value || ""));
  }

  function threadUrl(message) {
    const path = window.HCCCR.appUrl(`/message-thread.html?id=${encodeURIComponent(message.id)}&token=${encodeURIComponent(message.access_token)}`);
    return `${window.location.origin}${path}`;
  }

  function filteredMessages() {
    let data = messages;
    if (statusFilter.value === "active") data = data.filter((message) => message.status !== "archived");
    else if (statusFilter.value !== "all") data = data.filter((message) => message.status === statusFilter.value);
    if (originFilter.value !== "all") data = data.filter((message) => (message.origin || "contact_form") === originFilter.value);
    return data;
  }

  function renderKpis() {
    const count = (status) => messages.filter((message) => message.status === status).length;
    const initiated = messages.filter((message) => message.origin === "admin_initiated").length;
    document.querySelector("[data-inbox-kpis]").innerHTML = `
      <div class="kpi"><span class="kpi__label"><i data-lucide="mail"></i> 全部訊息</span><strong class="kpi__value">${messages.length}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="alert-circle"></i> 待處理</span><strong class="kpi__value">${count("unread")}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="clock"></i> 等待對方回覆</span><strong class="kpi__value">${count("replied")}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="send"></i> 主動發起</span><strong class="kpi__value">${initiated}</strong></div>`;
    window.lucide?.createIcons();
  }

  function renderList() {
    const data = filteredMessages().slice().sort((a, b) => new Date(b.last_activity_at || b.created_at) - new Date(a.last_activity_at || a.created_at));
    document.querySelector("[data-message-count]").textContent = `${data.length} 封`;
    list.innerHTML = data.length ? data.map((message) => `
      <tr class="${message.status === "unread" ? "is-unread" : ""} ${message.id === selectedId ? "is-selected" : ""}" data-row-id="${escape(message.id)}">
        <td><strong>${escape(message.sender_name)}</strong><small>${escape(message.sender_email)}</small></td>
        <td class="inbox-subject"><span class="tag tag--ghost inbox-origin-tag">${originLabels[message.origin] || originLabels.contact_form}</span>${escape(message.subject)}</td>
        <td>${escape(window.HCCCR.formatDate(message.last_activity_at || message.created_at, true))}</td>
        <td><span class="tag ${statusTagClass[message.status] || ""}">${statusLabels[message.status] || escape(message.status)}</span></td>
        <td><button class="icon-button" type="button" data-open-message="${escape(message.id)}" title="查看對話"><i data-lucide="eye"></i><span class="sr-only">查看對話</span></button></td>
      </tr>`).join("") : '<tr><td colspan="5"><p class="empty-state">沒有符合條件的訊息。</p></td></tr>';
    window.lucide?.createIcons();
  }

  function bubbleMarkup(entry, name, rootIsAdmin) {
    const isAdmin = entry.__root ? rootIsAdmin : entry.sender_type === "admin";
    return `
      <div class="thread-bubble ${isAdmin ? "thread-bubble--admin" : "thread-bubble--sender"}">
        <div class="thread-bubble__meta"><strong>${isAdmin ? "後台" : escape(name)}</strong><span>${escape(window.HCCCR.formatDate(entry.created_at, true))}</span></div>
        <div class="thread-bubble__body">${escape(entry.body).replaceAll("\n", "<br>")}</div>
      </div>`;
  }

  async function openMessage(id) {
    let message = messages.find((item) => item.id === id);
    if (!message) return;
    selectedId = id;
    if (message.status === "unread") {
      message = await window.HCCCR_DATA.updateContactMessage(id, { status: "read" });
      messages = messages.map((item) => (item.id === id ? message : item));
      renderKpis();
    }
    renderList();

    detail.innerHTML = `<div class="panel__header"><div><h3>${escape(message.subject)}</h3><small>${originLabels[message.origin] || originLabels.contact_form} · ${escape(window.HCCCR.formatDate(message.created_at, true))}</small></div><button class="icon-button" type="button" data-close-message title="關閉"><i data-lucide="x"></i><span class="sr-only">關閉</span></button></div><div class="panel__body inbox-detail__body"><p class="empty-state">正在載入對話…</p></div>`;
    window.lucide?.createIcons();

    let replies = [];
    try {
      replies = await window.HCCCR_DATA.getMessageReplies(id);
    } catch (error) {
      console.error(error);
    }

    const thread = [{ __root: true, body: message.message, created_at: message.created_at }, ...replies];
    const threadLink = threadUrl(message);
    const rootIsAdmin = message.origin === "admin_initiated";

    detail.innerHTML = `
      <div class="panel__header"><div><h3>${escape(message.subject)}</h3><small>${originLabels[message.origin] || originLabels.contact_form} · ${escape(window.HCCCR.formatDate(message.created_at, true))}</small></div><button class="icon-button" type="button" data-close-message title="關閉"><i data-lucide="x"></i><span class="sr-only">關閉</span></button></div>
      <div class="panel__body inbox-detail__body">
        <dl><div><dt>對象</dt><dd>${escape(message.sender_name)}</dd></div><div><dt>Email</dt><dd><a href="mailto:${escape(message.sender_email)}">${escape(message.sender_email)}</a></dd></div></dl>
        <div class="thread-scroll">${thread.map((entry) => bubbleMarkup(entry, message.sender_name, rootIsAdmin)).join("")}</div>
        <form class="thread-reply" data-reply-form>
          <label class="form-label sr-only" for="reply-body">回覆內容</label>
          <textarea class="form-control" id="reply-body" name="body" rows="3" maxlength="5000" placeholder="輸入回覆內容…" required></textarea>
          <button class="button button--small" type="submit"><i data-lucide="send"></i> 送出回覆</button>
        </form>
        <label class="form-label">處理狀態<select class="form-control" data-message-status><option value="unread" ${message.status === "unread" ? "selected" : ""}>待處理</option><option value="read" ${message.status === "read" ? "selected" : ""}>已讀</option><option value="replied" ${message.status === "replied" ? "selected" : ""}>等待對方回覆</option><option value="archived" ${message.status === "archived" ? "selected" : ""}>已封存</option></select></label>
        <div class="thread-link-box"><i data-lucide="link"></i><input class="form-control" type="text" readonly value="${escape(threadLink)}" data-thread-link><button class="icon-button" type="button" data-copy-thread-link title="複製連結"><i data-lucide="copy"></i><span class="sr-only">複製連結</span></button></div>
        <div class="inbox-detail__actions"><a class="button button--secondary button--small" href="mailto:${escape(message.sender_email)}?subject=${encodeURIComponent(message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`)}"><i data-lucide="mail"></i> 以 Email 通知</a><button class="button button--danger button--small" type="button" data-delete-message><i data-lucide="trash-2"></i> 刪除對話</button></div>
      </div>`;
    window.lucide?.createIcons();
    const scroll = detail.querySelector(".thread-scroll");
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  }

  async function load() {
    list.innerHTML = '<tr><td colspan="5">正在載入…</td></tr>';
    try {
      messages = await window.HCCCR_DATA.getContactMessages();
      renderKpis();
      renderList();
      if (selectedId && messages.some((message) => message.id === selectedId)) await openMessage(selectedId);
      window.lucide?.createIcons();
    } catch (error) {
      console.error(error);
      list.innerHTML = '<tr><td colspan="5">無法載入收件匣，請確認資料庫 schema 已更新。</td></tr>';
    }
  }

  statusFilter.addEventListener("change", renderList);
  originFilter.addEventListener("change", renderList);

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-message]");
    if (button) openMessage(button.dataset.openMessage);
  });

  detail.addEventListener("click", async (event) => {
    if (event.target.closest("[data-close-message]")) {
      selectedId = "";
      detail.innerHTML = '<div class="empty-state">選擇一封訊息查看對話內容。</div>';
      renderList();
      return;
    }
    if (event.target.closest("[data-copy-thread-link]")) {
      const input = detail.querySelector("[data-thread-link]");
      input?.select();
      try {
        await navigator.clipboard.writeText(input.value);
        window.HCCCR.showToast("對話連結已複製。");
      } catch (error) {
        window.HCCCR.showToast("複製失敗，請手動選取連結。", "error");
      }
      return;
    }
    if (event.target.closest("[data-delete-message]") && selectedId) {
      if (!window.confirm("確定要永久刪除這則對話嗎？此操作無法復原。")) return;
      await window.HCCCR_DATA.deleteContactMessage(selectedId);
      messages = messages.filter((message) => message.id !== selectedId);
      selectedId = "";
      detail.innerHTML = '<div class="empty-state">選擇一封訊息查看對話內容。</div>';
      renderKpis();
      renderList();
      window.HCCCR.showToast("對話已刪除。");
    }
  });

  detail.addEventListener("change", async (event) => {
    if (!event.target.matches("[data-message-status]") || !selectedId) return;
    const saved = await window.HCCCR_DATA.updateContactMessage(selectedId, { status: event.target.value });
    messages = messages.map((message) => (message.id === selectedId ? saved : message));
    renderKpis();
    renderList();
    window.HCCCR.showToast("處理狀態已更新。");
  });

  detail.addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-reply-form]") || !selectedId) return;
    event.preventDefault();
    const textarea = event.target.querySelector("textarea");
    const body = textarea.value.trim();
    if (!body) return;
    const button = event.target.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await window.HCCCR_DATA.sendAdminReply(selectedId, body);
      await load();
      await openMessage(selectedId);
      window.HCCCR.showToast("回覆已送出。");
    } catch (error) {
      console.error(error);
      window.HCCCR.showToast("回覆失敗，請稍後再試。", "error");
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector("[data-refresh-inbox]").addEventListener("click", load);

  function setComposeOpen(open) {
    composeDialog.hidden = !open;
    if (open) {
      composeError.textContent = "";
      composeForm.reset();
      composeForm.querySelector('[name="sender_name"]').focus();
    }
  }

  document.querySelector("[data-open-compose]").addEventListener("click", () => setComposeOpen(true));
  document.querySelectorAll("[data-close-compose]").forEach((button) => button.addEventListener("click", () => setComposeOpen(false)));
  composeDialog.addEventListener("click", (event) => { if (event.target === composeDialog) setComposeOpen(false); });

  composeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(composeForm);
    const submit = composeForm.querySelector("button[type=submit]");
    submit.disabled = true;
    composeError.textContent = "";
    try {
      const created = await window.HCCCR_DATA.createAdminMessage({
        sender_name: String(values.get("sender_name") || "").trim(),
        sender_email: String(values.get("sender_email") || "").trim(),
        subject: String(values.get("subject") || "").trim(),
        message: String(values.get("message") || "").trim(),
      });
      setComposeOpen(false);
      await load();
      await openMessage(created.id);
      window.HCCCR.showToast("訊息已建立，記得把對話連結交給對方。");
    } catch (error) {
      console.error(error);
      composeError.textContent = "建立失敗，請確認欄位內容後再試一次。";
    } finally {
      submit.disabled = false;
    }
  });

  load();
})();
