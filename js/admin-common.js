(async function () {
  const loginPage = document.body.dataset.adminPage === "login";
  if (loginPage) return;

  const session = await window.HCCCR_DATA.getAdminSession();
  if (!session) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`${window.HCCCR.appUrl("/admin/")}?returnTo=${returnTo}`);
    return;
  }

  const email = session.email || "管理員";
  document.querySelectorAll("[data-admin-email]").forEach((node) => { node.textContent = email; });
  document.querySelectorAll("[data-admin-initial]").forEach((node) => { node.textContent = email.slice(0, 1).toUpperCase(); });
  document.querySelectorAll("[data-demo-only]").forEach((node) => { node.hidden = window.HCCCR_DATA.mode !== "demo"; });

  const adminNav = document.querySelector("[data-admin-sidebar] nav.admin-nav");
  if (adminNav && !adminNav.querySelector('[href*="/admin/inbox"]')) {
    const websiteLabel = [...adminNav.querySelectorAll(".admin-nav__label")].find((node) => node.textContent.trim() === "網站");
    const websiteLinks = `
      <a href="${window.HCCCR.appUrl("/admin/inbox.html")}"><i data-lucide="inbox"></i> 收件匣<span class="nav-badge" data-inbox-nav-badge hidden>0</span></a>
      <a href="${window.HCCCR.appUrl("/admin/content.html")}"><i data-lucide="file-pen-line"></i> 網站內容</a>`;
    if (websiteLabel) {
      websiteLabel.insertAdjacentHTML("afterend", websiteLinks);
    } else {
      adminNav.insertAdjacentHTML("beforeend", `
        <span class="admin-nav__label">網站</span>
        ${websiteLinks}
        <a href="${window.HCCCR.appUrl("/surveys")}" target="_blank"><i data-lucide="external-link"></i> 開啟前台</a>`);
    }
    const normalizePath = (value) => new URL(value, window.location.origin).pathname.replace(window.APP_CONFIG.basePath, "").replace(/\.html$/, "").replace(/\/$/, "");
    const currentPath = normalizePath(window.location.href);
    adminNav.querySelectorAll("a").forEach((link) => {
      link.removeAttribute("aria-current");
      if (normalizePath(link.href) === currentPath) link.setAttribute("aria-current", "page");
    });
    window.lucide?.createIcons();
  }

  // 側欄「收件匣」未讀徽章：待處理（unread）或對方已回覆但尚未讀取的訊息數。
  (async function updateInboxBadge() {
    const badge = document.querySelector("[data-inbox-nav-badge]");
    if (!badge) return;
    try {
      const messages = await window.HCCCR_DATA.getContactMessages();
      const pending = messages.filter((message) => message.status === "unread").length;
      badge.textContent = pending > 99 ? "99+" : String(pending);
      badge.hidden = pending === 0;
    } catch (error) {
      console.warn("Unable to load inbox badge count", error);
    }
  })();

  document.querySelectorAll("[data-sign-out]").forEach((button) => button.addEventListener("click", async () => {
    await window.HCCCR_DATA.signOut();
    window.location.href = window.HCCCR.appUrl("/admin/");
  }));

  const sidebar = document.querySelector("[data-admin-sidebar]");
  const scrim = document.querySelector("[data-admin-scrim]");
  const toggle = document.querySelector("[data-admin-menu]");
  const setOpen = (open) => {
    sidebar?.classList.toggle("is-open", open);
    scrim?.classList.toggle("is-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
  };
  toggle?.addEventListener("click", () => setOpen(!sidebar.classList.contains("is-open")));
  scrim?.addEventListener("click", () => setOpen(false));
})();
