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
      const result = await window.HCCCR_DATA.sendContactMessage({
        sender_name: String(values.get("sender_name") || "").trim(),
        sender_email: String(values.get("sender_email") || "").trim(),
        subject: String(values.get("subject") || "").trim(),
        message: String(values.get("message") || "").trim(),
        agreed_privacy: values.get("agreed_privacy") === "on",
        website: String(values.get("website") || ""),
      });
      const threadPath = window.HCCCR.appUrl(`/message-thread.html?id=${encodeURIComponent(result.id)}&token=${encodeURIComponent(result.access_token)}`);
      const threadLink = `${window.location.origin}${threadPath}`;
      form.innerHTML = `<div class="contact-success"><span><i data-lucide="check"></i></span><h2>訊息已送出</h2><p>管理團隊會盡快處理，也可能直接在下方對話連結中回覆你。請保留這組連結以便追蹤。</p>
        <div class="contact-tracking"><p>追蹤這則訊息的專屬連結（請自行保存，勿轉傳給他人）：</p><div class="thread-link-box"><i data-lucide="link"></i><input type="text" readonly value="${window.HCCCR.escapeHtml(threadLink)}" data-tracking-link><button class="icon-button" type="button" data-copy-tracking-link title="複製連結"><i data-lucide="copy"></i><span class="sr-only">複製連結</span></button></div></div>
        <a class="button button--secondary" href="${threadLink}">查看對話</a>
        <a class="button button--ghost" href="${window.HCCCR.appUrl("/")}">返回首頁</a></div>`;
      window.lucide?.createIcons();
      form.querySelector("[data-copy-tracking-link]")?.addEventListener("click", async () => {
        const input = form.querySelector("[data-tracking-link]");
        input?.select();
        try {
          await navigator.clipboard.writeText(input.value);
          window.HCCCR.showToast("連結已複製。");
        } catch (copyError) {
          window.HCCCR.showToast("複製失敗，請手動選取連結。", "error");
        }
      });
    } catch (submissionError) {
      console.error(submissionError);
      error.textContent = "目前無法送出訊息，請稍後再試。若短時間內已多次送出，請等待 10 分鐘。";
      submit.disabled = false;
      submit.innerHTML = originalMarkup;
      window.lucide?.createIcons();
    }
  });
})();
