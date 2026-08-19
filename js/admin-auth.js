(function () {
  const form = document.querySelector("[data-login-form]");
  const message = document.querySelector("[data-login-message]");
  if (!form) return;

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-demo-only]").forEach((node) => { node.hidden = window.HCCCR_DATA.mode !== "demo"; });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = new FormData(form).get("email").trim();
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "處理中…";
    message.textContent = "";
    try {
      await window.HCCCR_DATA.signInWithMagicLink(email);
      if (window.HCCCR_DATA.mode === "demo") {
        const target = new URLSearchParams(window.location.search).get("returnTo") || window.HCCCR.appUrl("/admin/dashboard.html");
        window.location.href = target;
      } else {
        message.style.color = "var(--success)";
        message.textContent = "登入連結已寄出，請前往信箱完成驗證。";
        submit.textContent = "已寄送";
      }
    } catch (error) {
      message.textContent = "無法寄送登入連結，請確認信箱或稍後再試。";
      submit.disabled = false;
      submit.innerHTML = '重新寄送 <i data-lucide="mail"></i>';
      window.lucide?.createIcons();
      console.error(error);
    }
  });
})();
