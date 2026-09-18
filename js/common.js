(function () {
  function formatDate(value, includeTime = false) {
    if (!value) return "未設定";
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(value));
  }

  function formatDuration(seconds) {
    const value = Number(seconds || 0);
    const minutes = Math.floor(value / 60);
    const remainder = value % 60;
    return minutes ? `${minutes} 分 ${remainder} 秒` : `${remainder} 秒`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function appUrl(path) {
    const config = window.APP_CONFIG || {};
    const basePath = config.basePath || "";
    const match = String(path).match(/^([^?#]*)(.*)$/);
    let pathname = match[1] || "/";
    const suffix = match[2] || "";
    if (!pathname.startsWith("/")) pathname = `/${pathname}`;
    if (config.isGitHubPages) {
      pathname = ({ "/surveys": "/surveys.html", "/terms": "/terms.html" })[pathname] || pathname;
    }
    return `${basePath}${pathname}${suffix}` || "/";
  }

  function getSurveyHref(form) {
    const identifier = encodeURIComponent(form.slug || form.id);
    return window.APP_CONFIG?.isGitHubPages
      ? appUrl(`/survey-detail.html?id=${identifier}`)
      : appUrl(`/surveys/${identifier}`);
  }

  function showToast(message, type = "success") {
    let region = document.querySelector(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function initNavigation() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-mobile-menu]");
    const header = document.querySelector(".site-header");
    const applyHeaderState = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
    applyHeaderState();
    window.addEventListener("scroll", applyHeaderState, { passive: true });

    if (!toggle || !menu) return;
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      document.body.classList.toggle("menu-open", open);
      toggle.innerHTML = `<i data-lucide="${open ? "x" : "menu"}"></i><span class="sr-only">${open ? "關閉" : "開啟"}選單</span>`;
      window.lucide?.createIcons();
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080) setOpen(false);
    });
  }

  function initDemoNotice() {
    const targets = document.querySelectorAll("[data-demo-only]");
    targets.forEach((target) => {
      target.hidden = window.HCCCR_DATA?.mode !== "demo";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initDemoNotice();
    window.lucide?.createIcons({ attrs: { "stroke-width": 1.8 } });
  });

  window.HCCCR = { formatDate, formatDuration, escapeHtml, appUrl, getSurveyHref, showToast };
})();
