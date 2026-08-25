(function () {
  const root = document.querySelector("[data-member-detail]");
  if (!root) return;
  const escape = (value) => window.HCCCR.escapeHtml(String(value || ""));
  const id = new URLSearchParams(window.location.search).get("id");
  (async function () {
    try {
      const content = await window.HCCCR_DATA.getSiteContent();
      const members = JSON.parse(content["team.members_json"] || "[]");
      const member = Array.isArray(members) && members.find((item) => item.id === id);
      if (!member) throw new Error("MEMBER_NOT_FOUND");
      document.title = `${member.name}｜新竹縣第四屆兒少諮詢代表`;
      root.innerHTML = `<div class="member-profile">
        <div class="member-profile__portrait">${member.photo_url ? `<img src="${escape(member.photo_url)}" alt="${escape(member.name)}">` : '<i data-lucide="user-round"></i>'}</div>
        <div class="member-profile__body"><p class="eyebrow">代表介紹</p><h1>${escape(member.name)}</h1>
        ${member.role ? `<p class="member-profile__role">${escape(member.role)}</p>` : ""}
        ${member.focus ? `<span class="tag tag--accent">關注：${escape(member.focus)}</span>` : ""}
        <div class="member-profile__bio">${escape(member.bio || "這位代表的完整介紹正在整理中。").replaceAll("\n", "<br>")}</div>
        <button class="button button--secondary button--small" type="button" data-share-member><i data-lucide="share-2"></i> 分享這位代表</button></div>
      </div>`;
      root.querySelector("[data-share-member]").addEventListener("click", async () => {
        const shareData = { title: document.title, text: `認識新竹縣兒少諮詢代表：${member.name}`, url: window.location.href };
        try { if (navigator.share) await navigator.share(shareData); else { await navigator.clipboard.writeText(window.location.href); window.HCCCR.showToast("分享連結已複製。"); } } catch (error) { if (error.name !== "AbortError") window.HCCCR.showToast("無法複製分享連結。", "error"); }
      });
      window.lucide?.createIcons();
    } catch (error) {
      root.innerHTML = `<section class="empty-state"><h1>找不到這位代表</h1><p>連結可能已更新，請回代表名單查看最新資料。</p><a class="button button--small" href="${window.HCCCR.appUrl("/team.html")}">回到代表名單</a></section>`;
    }
  })();
})();
