(function () {
  const root = document.querySelector("[data-member-root]");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const memberId = params.get("id") || "";

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value || ""));
  }

  function paragraphs(text) {
    return String(text || "")
      .split(/\n{2,}|\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${escape(line)}</p>`)
      .join("");
  }

  function renderMissing() {
    root.innerHTML = `
      <div class="member-missing">
        <p class="eyebrow">找不到這位代表</p>
        <h1 style="margin:8px 0 12px">頁面不存在或名單已更新</h1>
        <p style="color:var(--muted)">這位代表的資料可能已被移除，或連結不正確。</p>
        <p style="margin-top:18px"><a class="button button--secondary" href="${window.HCCCR.appUrl("/team.html")}"><i data-lucide="arrow-left"></i> 回到代表名單</a></p>
      </div>`;
    window.lucide?.createIcons();
  }

  function renderMember(member) {
    document.title = `${member.name}｜新竹縣第四屆兒少諮詢代表`;
    const breadcrumb = document.querySelector("[data-breadcrumb-name]");
    if (breadcrumb) breadcrumb.textContent = member.name;

    root.innerHTML = `
      <article class="member-profile">
        <div class="member-profile__avatar">${member.photo_url ? `<img src="${escape(member.photo_url)}" alt="${escape(member.name)}">` : '<i data-lucide="user-round"></i>'}</div>
        <div class="member-profile__intro">
          <a class="text-link" href="${window.HCCCR.appUrl("/team.html")}"><i data-lucide="arrow-left"></i> 回到代表名單</a>
          <h1>${escape(member.name)}</h1>
          ${member.role ? `<p class="member-profile__role">${escape(member.role)}</p>` : ""}
          ${member.focus ? `<div class="member-profile__tags">${member.focus.split(/[,，、]/).map((tag) => tag.trim()).filter(Boolean).map((tag) => `<span class="tag tag--accent">${escape(tag)}</span>`).join("")}</div>` : ""}
          ${member.bio ? `<p class="member-profile__bio">${escape(member.bio)}</p>` : ""}
        </div>
      </article>
      ${member.detail ? `<div class="member-profile__detail prose">${paragraphs(member.detail)}</div>` : ""}
      <div class="member-profile__cta">
        <p>想讓這位代表知道你的想法嗎？</p>
        <div class="member-profile__cta-actions">
          <button class="button button--secondary button--small" type="button" data-share-member><i data-lucide="share-2"></i> 分享這位代表</button>
          <a class="button button--accent" href="${window.HCCCR.appUrl("/contact")}"><i data-lucide="move-right"></i> 聯絡我們</a>
        </div>
      </div>`;
    window.lucide?.createIcons();

    root.querySelector("[data-share-member]")?.addEventListener("click", async () => {
      const shareData = { title: document.title, text: `認識新竹縣兒少諮詢代表：${member.name}`, url: window.location.href };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(window.location.href);
          window.HCCCR.showToast("分享連結已複製。");
        }
      } catch (error) {
        if (error.name !== "AbortError") window.HCCCR.showToast("無法複製分享連結。", "error");
      }
    });
  }

  (async function load() {
    if (!memberId) {
      renderMissing();
      return;
    }
    try {
      const content = await window.HCCCR_DATA.getSiteContent();
      const members = JSON.parse(content["team.members_json"] || "[]");
      const member = Array.isArray(members) ? members.find((item) => item.id === memberId) : null;
      if (!member) {
        renderMissing();
        return;
      }
      renderMember(member);
    } catch (error) {
      console.error(error);
      renderMissing();
    }
  })();
})();
