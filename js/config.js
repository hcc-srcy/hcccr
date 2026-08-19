(function () {
  const runtime = window.HCCCR_ENV || {};
  const normalizeBasePath = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed || trimmed === "/") return "";
    return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
  };
  const inferredPagesBase = window.location.hostname.endsWith(".github.io")
    ? `/${window.location.pathname.split("/").filter(Boolean)[0] || ""}`
    : "";
  const basePath = normalizeBasePath(
    runtime.BASE_PATH === undefined ? inferredPagesBase : runtime.BASE_PATH,
  );
  const siteUrl = String(runtime.SITE_URL || `${window.location.origin}${basePath}`).replace(/\/+$/, "");

  window.APP_CONFIG = {
    supabaseUrl: runtime.SUPABASE_URL || "",
    supabaseAnonKey: runtime.SUPABASE_ANON_KEY || "",
    siteUrl,
    basePath,
    isGitHubPages: runtime.GITHUB_PAGES === true || window.location.hostname.endsWith(".github.io"),
  };

  window.APP_CONFIG.supabaseEnabled = Boolean(
    window.APP_CONFIG.supabaseUrl && window.APP_CONFIG.supabaseAnonKey,
  );
})();
