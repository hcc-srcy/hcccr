(function () {
  const grid = document.querySelector("[data-team-grid]");
  if (!grid) return;

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value || ""));
  }

  function cardMarkup(member) {
    const href = window.HCCCR.appUrl(`/team-member.html?id=${encodeURIComponent(member.id)}`);
    return `
      <a class="team-card team-card--link" href="${href}">
        <div class="team-card__avatar">${member.photo_url ? `<img src="${escape(member.photo_url)}" alt="${escape(member.name)}">` : '<i data-lucide="user-round"></i>'}</div>
        <h3>${escape(member.name)}</h3>
        ${member.role ? `<p class="team-card__role">${escape(member.role)}</p>` : ""}
        ${member.focus ? `<div class="team-card__focus"><span class="tag tag--accent">${escape(member.focus.split(/[,，、]/)[0].trim())}</span></div>` : ""}
        ${member.bio ? `<p>${escape(member.bio)}</p>` : ""}
        <span class="team-card__more">查看完整介紹 <i data-lucide="arrow-right"></i></span>
      </a>`;
  }

  (async function load() {
    try {
      const content = await window.HCCCR_DATA.getSiteContent();
      const members = JSON.parse(content["team.members_json"] || "[]");
      grid.innerHTML = Array.isArray(members) && members.length
        ? members.map(cardMarkup).join("")
        : '<p class="empty-state">名單籌備中，敬請期待。</p>';
      window.lucide?.createIcons();
    } catch (error) {
      console.error(error);
      grid.innerHTML = '<p class="empty-state">目前無法載入代表名單，請稍後再試。</p>';
    }
  })();
})();
