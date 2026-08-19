(async function () {
  const loginPage = document.body.dataset.adminPage === "login";
  if (loginPage) return;

  const session = await window.HCCCR_DATA.getAdminSession();
  if (!session) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/admin/?returnTo=${returnTo}`);
    return;
  }

  const email = session.email || "管理員";
  document.querySelectorAll("[data-admin-email]").forEach((node) => { node.textContent = email; });
  document.querySelectorAll("[data-admin-initial]").forEach((node) => { node.textContent = email.slice(0, 1).toUpperCase(); });
  document.querySelectorAll("[data-demo-only]").forEach((node) => { node.hidden = window.HCCCR_DATA.mode !== "demo"; });

  document.querySelectorAll("[data-sign-out]").forEach((button) => button.addEventListener("click", async () => {
    await window.HCCCR_DATA.signOut();
    window.location.href = "/admin/";
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
