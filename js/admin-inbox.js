(async function () {
  const list = document.querySelector("[data-message-list]");
  if (!list) return;

  const detail = document.querySelector("[data-message-detail]");
  const filter = document.querySelector("[data-message-filter]");
  const statusLabels = { unread: "未讀", read: "已讀", replied: "已回覆", archived: "已封存" };
  let messages = [];
  let selectedId = "";

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value || ""));
  }

  function filteredMessages() {
    if (filter.value === "all") return messages;
    if (filter.value === "active") return messages.filter((message) => message.status !== "archived");
    return messages.filter((message) => message.status === filter.value);
  }

  function renderKpis() {
    const count = (status) => messages.filter((message) => message.status === status).length;
    document.querySelector("[data-inbox-kpis]").innerHTML = `
      <div class="kpi"><span class="kpi__label"><i data-lucide="mail"></i> 全部訊息</span><strong class="kpi__value">${messages.length}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="mail-open"></i> 未讀</span><strong class="kpi__value">${count("unread")}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="reply"></i> 已回覆</span><strong class="kpi__value">${count("replied")}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="archive"></i> 已封存</span><strong class="kpi__value">${count("archived")}</strong></div>`;
  }

  function renderList() {
    const data = filteredMessages();
    document.querySelector("[data-message-count]").textContent = `${data.length} 封`;
    list.innerHTML = data.length ? data.map((message) => `
      <tr class="${message.status === "unread" ? "is-unread" : ""}">
        <td><strong>${escape(message.sender_name)}</strong><small>${escape(message.sender_email)}</small></td>
        <td class="inbox-subject">${escape(message.subject)}</td>
        <td>${escape(window.HCCCR.formatDate(message.created_at, true))}</td>
        <td><span class="tag ${message.status === "unread" ? "tag--warning" : ""}">${statusLabels[message.status] || escape(message.status)}</span></td>
        <td><button class="icon-button" type="button" data-open-message="${escape(message.id)}" title="查看訊息"><i data-lucide="eye"></i><span class="sr-only">查看訊息</span></button></td>
      </tr>`).join("") : '<tr><td colspan="5"><p class="empty-state">沒有符合條件的訊息。</p></td></tr>';
    window.lucide?.createIcons();
  }

  async function openMessage(id) {
    let message = messages.find((item) => item.id === id);
    if (!message) return;
    selectedId = id;
    if (message.status === "unread") {
      message = await window.HCCCR_DATA.updateContactMessage(id, { status: "read" });
      messages = messages.map((item) => item.id === id ? message : item);
      renderKpis();
      renderList();
    }
    const replySubject = encodeURIComponent(message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`);
    detail.innerHTML = `
      <div class="panel__header"><div><h3>${escape(message.subject)}</h3><small>${escape(window.HCCCR.formatDate(message.created_at, true))}</small></div><button class="icon-button" type="button" data-close-message title="關閉"><i data-lucide="x"></i><span class="sr-only">關閉訊息</span></button></div>
      <div class="panel__body inbox-detail__body"><dl><div><dt>寄件者</dt><dd>${escape(message.sender_name)}</dd></div><div><dt>Email</dt><dd><a href="mailto:${escape(message.sender_email)}">${escape(message.sender_email)}</a></dd></div></dl><div class="inbox-message">${escape(message.message)}</div><label class="form-label">處理狀態<select class="form-control" data-message-status>${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${message.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><div class="inbox-detail__actions"><a class="button button--small" href="mailto:${escape(message.sender_email)}?subject=${replySubject}"><i data-lucide="reply"></i> 回覆 Email</a><button class="button button--danger button--small" type="button" data-delete-message><i data-lucide="trash-2"></i> 刪除</button></div></div>`;
    window.lucide?.createIcons();
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

  filter.addEventListener("change", renderList);
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-message]");
    if (button) openMessage(button.dataset.openMessage);
  });
  detail.addEventListener("click", async (event) => {
    if (event.target.closest("[data-close-message]")) {
      selectedId = "";
      detail.innerHTML = '<div class="empty-state">選擇一封訊息查看內容。</div>';
      return;
    }
    if (!event.target.closest("[data-delete-message]") || !selectedId) return;
    if (!window.confirm("確定要永久刪除這封訊息嗎？此操作無法復原。")) return;
    await window.HCCCR_DATA.deleteContactMessage(selectedId);
    messages = messages.filter((message) => message.id !== selectedId);
    selectedId = "";
    detail.innerHTML = '<div class="empty-state">選擇一封訊息查看內容。</div>';
    renderKpis();
    renderList();
    window.HCCCR.showToast("訊息已刪除。");
  });
  detail.addEventListener("change", async (event) => {
    if (!event.target.matches("[data-message-status]") || !selectedId) return;
    const saved = await window.HCCCR_DATA.updateContactMessage(selectedId, { status: event.target.value });
    messages = messages.map((message) => message.id === selectedId ? saved : message);
    renderKpis();
    renderList();
    window.HCCCR.showToast("處理狀態已更新。");
  });
  document.querySelector("[data-refresh-inbox]").addEventListener("click", load);
  load();
})();
