(function () {
  const runtime = window.HCCCR_ENV || {};

  window.APP_CONFIG = {
    supabaseUrl: runtime.SUPABASE_URL || "",
    supabaseAnonKey: runtime.SUPABASE_ANON_KEY || "",
    siteUrl: runtime.SITE_URL || window.location.origin,
  };

  window.APP_CONFIG.supabaseEnabled = Boolean(
    window.APP_CONFIG.supabaseUrl && window.APP_CONFIG.supabaseAnonKey,
  );
})();
