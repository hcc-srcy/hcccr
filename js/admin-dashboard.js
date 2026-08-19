(async function () {
  const table = document.querySelector("[data-form-table]");
  if (!table) return;
  try {
    const [forms, submissions] = await Promise.all([
      window.HCCCR_DATA.getForms({ includeUnlisted: true }),
      window.HCCCR_DATA.getSubmissions(),
    ]);
    const openCount = forms.filter((form) => form.is_open).length;
    const avg = submissions.length ? Math.round(submissions.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0) / submissions.length) : 0;
    document.querySelector("[data-dashboard-kpis]").innerHTML = `
      <div class="kpi"><span class="kpi__label"><i data-lucide="files"></i> 全部調查</span><strong class="kpi__value">${forms.length}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="radio-tower"></i> 開放中</span><strong class="kpi__value">${openCount}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="messages-square"></i> 回應總數</span><strong class="kpi__value">${submissions.length}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="timer"></i> 平均作答</span><strong class="kpi__value">${window.HCCCR.formatDuration(avg)}</strong></div>`;
    document.querySelector("[data-form-count]").textContent = `${forms.length} 份`;
    table.innerHTML = forms.map((form) => {
      const count = submissions.filter((item) => item.form_id === form.id).length || form.response_count || 0;
      const visibility = { public: "公開", public_password: "公開＋密碼", unlisted: "不公開連結" }[form.visibility];
      return `<tr><td><div class="table-title"><strong>${window.HCCCR.escapeHtml(form.title)} ${form.is_edited ? '<span class="tag">已編輯</span>' : ""}</strong><small>/${window.HCCCR.escapeHtml(form.slug || form.id)}</small></div></td><td>${visibility}</td><td><span class="tag ${form.is_open ? "tag--success" : ""}">${form.is_open ? "開放" : "關閉"}</span></td><td>${count}</td><td>${window.HCCCR.formatDate(form.updated_at)}</td><td><div class="table-actions"><a class="icon-button" href="/surveys/${encodeURIComponent(form.slug || form.id)}" target="_blank" title="預覽"><i data-lucide="eye"></i></a><a class="icon-button" href="/admin/responses.html?form=${encodeURIComponent(form.id)}" title="回應"><i data-lucide="chart-no-axes-column"></i></a><a class="icon-button" href="/admin/builder.html?id=${encodeURIComponent(form.id)}" title="編輯"><i data-lucide="pencil"></i></a></div></td></tr>`;
    }).join("");
    window.lucide?.createIcons();
  } catch (error) {
    table.innerHTML = '<tr><td colspan="6">無法載入調查資料。</td></tr>';
    console.error(error);
  }
})();
