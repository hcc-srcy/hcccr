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
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.hidden = open;
      toggle.innerHTML = `<i data-lucide="${open ? "menu" : "x"}"></i><span class="sr-only">${open ? "開啟" : "關閉"}選單</span>`;
      window.lucide?.createIcons();
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
