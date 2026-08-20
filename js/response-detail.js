(async function () {
  const root = document.querySelector("[data-response-detail]");
  const params = new URLSearchParams(window.location.search);
  const formId = params.get("form");
  const responseId = params.get("id");
  if (!root) return;

  try {
    const [form, submissions] = await Promise.all([
      window.HCCCR_DATA.getForm(formId),
      window.HCCCR_DATA.getSubmissions(formId),
    ]);
    const submission = submissions.find((item) => item.id === responseId);
    if (!form || !submission) throw new Error("RESPONSE_NOT_FOUND");

    const code = `${submission.submitted_at.slice(0, 10).replaceAll("-", "")}-${String(submission.id).replaceAll("-", "").slice(-6).toUpperCase()}`;
    root.innerHTML = `
      <div class="admin-page-heading"><div><p class="breadcrumbs no-print"><a href="${window.HCCCR.appUrl("/admin/responses.html")}?form=${encodeURIComponent(form.id)}">回應分析</a><span>/</span><span>${code}</span></p><h2>${window.HCCCR.escapeHtml(form.title)}</h2><p>回應識別碼：${code}</p></div><div class="page-actions no-print"><button class="button button--secondary button--small" type="button" data-print><i data-lucide="printer"></i> 列印 / PDF</button><button class="button button--danger button--small" type="button" data-delete><i data-lucide="trash-2"></i> 刪除</button></div></div>
      <div class="kpi-strip"><div class="kpi"><span class="kpi__label">送出時間</span><strong class="kpi__value" style="font-size:1rem">${window.HCCCR.formatDate(submission.submitted_at, true)}</strong></div><div class="kpi"><span class="kpi__label">作答時間</span><strong class="kpi__value" style="font-size:1rem">${window.HCCCR.formatDuration(submission.duration_seconds)}</strong></div><div class="kpi"><span class="kpi__label">條款同意</span><strong class="kpi__value" style="font-size:1rem">${submission.agreed_terms ? "已同意" : "未記錄"}</strong></div><div class="kpi"><span class="kpi__label">資料模式</span><strong class="kpi__value" style="font-size:1rem">${window.HCCCR_DATA.mode === "demo" ? "示範" : "正式"}</strong></div></div>
      <dl>${form.fields.filter((field) => field.type !== "section").map((field) => { const answer = submission.answers[field.id]; const display = Array.isArray(answer) ? answer.join("、") : answer || "未填答"; return `<div class="response-block"><dt>${window.HCCCR.escapeHtml(field.label)}</dt><dd>${window.HCCCR.escapeHtml(display)}</dd></div>`; }).join("")}</dl>`;
    root.querySelector("[data-print]").addEventListener("click", () => window.print());
    root.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!window.confirm("確定要永久刪除這筆回應嗎？此操作無法復原。")) return;
      await window.HCCCR_DATA.deleteSubmission(submission.id);
      window.location.href = `${window.HCCCR.appUrl("/admin/responses.html")}?form=${encodeURIComponent(form.id)}`;
    });
    window.lucide?.createIcons();
  } catch (error) {
    root.innerHTML = `<section class="success-panel"><h2>找不到這筆回應</h2><p>資料可能已刪除，或網址不正確。</p><a class="button button--secondary" href="${window.HCCCR.appUrl("/admin/dashboard.html")}">返回調查總覽</a></section>`;
    console.error(error);
  }
})();
