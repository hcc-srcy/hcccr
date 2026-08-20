(function () {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const message = form.elements.message;
  const counter = form.querySelector("[data-message-count]");
  const error = form.querySelector("[data-contact-error]");
  const submit = form.querySelector("button[type=submit]");

  message.addEventListener("input", () => { counter.textContent = message.value.length; });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    error.textContent = "";
    submit.disabled = true;
    const originalMarkup = submit.innerHTML;
    submit.textContent = "正在送出…";

    const values = new FormData(form);
    try {
      await window.HCCCR_DATA.sendContactMessage({
        sender_name: String(values.get("sender_name") || "").trim(),
        sender_email: String(values.get("sender_email") || "").trim(),
        subject: String(values.get("subject") || "").trim(),
        message: String(values.get("message") || "").trim(),
        agreed_privacy: values.get("agreed_privacy") === "on",
        website: String(values.get("website") || ""),
      });
      form.innerHTML = `<div class="contact-success"><span><i data-lucide="check"></i></span><h2>訊息已送出</h2><p>管理團隊會透過你填寫的 Email 回覆。請保留寄件信箱的收信權限。</p><a class="button button--secondary" href="${window.HCCCR.appUrl("/")}">返回首頁</a></div>`;
      window.lucide?.createIcons();
    } catch (submissionError) {
      console.error(submissionError);
      error.textContent = "目前無法送出訊息，請稍後再試。若短時間內已多次送出，請等待 10 分鐘。";
      submit.disabled = false;
      submit.innerHTML = originalMarkup;
      window.lucide?.createIcons();
    }
  });
})();
