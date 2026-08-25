(function () {
  const list = document.querySelector("[data-proposal-list]");
  if (!list) return;
  const escape = (value) => window.HCCCR.escapeHtml(String(value || ""));
  const steps = ["已提出", "委員會討論", "縣府回應", "已採納/未採納"];
  const dates = (proposal) => proposal.timeline || [];
  function card(proposal) {
    const active = Math.max(0, steps.indexOf(proposal.status));
    return `<article class="proposal-card"><div class="proposal-card__top"><div><span class="tag tag--accent">${escape(proposal.category || "兒少議題")}</span><h2>${escape(proposal.title)}</h2></div><span class="proposal-status proposal-status--${active}">${escape(proposal.status || "已提出")}</span></div><p>${escape(proposal.summary)}</p><ol class="proposal-timeline">${steps.map((step, index) => { const item = dates(proposal).find((entry) => entry.step === step) || {}; const reached = index <= active; return `<li class="${reached ? "is-reached" : ""}"><span class="proposal-timeline__dot">${reached ? '<i data-lucide="check"></i>' : ""}</span><div><strong>${step}</strong>${item.date ? `<time>${escape(item.date)}</time>` : ""}${item.note ? `<p>${escape(item.note)}</p>` : ""}</div></li>`; }).join("")}</ol>${proposal.updated_at ? `<p class="proposal-card__updated">最後更新：${escape(proposal.updated_at)}</p>` : ""}</article>`;
  }
  (async function () { try { const content = await window.HCCCR_DATA.getSiteContent(); const raw = content["proposals.items_json"] || window.HCCCR_CONTENT_DEFAULTS?.["proposals.items_json"] || "[]"; const proposals = JSON.parse(raw); list.innerHTML = Array.isArray(proposals) && proposals.length ? proposals.map(card).join("") : '<p class="empty-state">提案進度整理中，歡迎稍後再回來查看。</p>'; window.lucide?.createIcons(); } catch (error) { console.error(error); list.innerHTML = '<p class="empty-state">目前無法載入提案進度，請稍後再試。</p>'; } })();
})();
