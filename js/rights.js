(function () {
  const toggle = document.querySelector("[data-version-toggle]");
  if (!toggle) return;

  const buttons = toggle.querySelectorAll("[data-version-btn]");
  const STORAGE_KEY = "hcccr-rights-version";

  function setVersion(version) {
    document.body.classList.toggle("mode-kid", version === "kid");
    buttons.forEach((btn) => {
      const active = btn.dataset.versionBtn === version;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    try {
      sessionStorage.setItem(STORAGE_KEY, version);
    } catch (error) {
      /* 私密瀏覽模式下可能無法寫入，忽略即可 */
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => setVersion(btn.dataset.versionBtn));
  });

  let initial = "adult";
  try {
    initial = sessionStorage.getItem(STORAGE_KEY) || "adult";
  } catch (error) {
    initial = "adult";
  }
  setVersion(initial);
})();
