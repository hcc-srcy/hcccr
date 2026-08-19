(async function () {
  const select = document.querySelector("[data-form-select]");
  if (!select) return;

  const stageFilter = document.querySelector("[data-stage-filter]");
  const chartGrid = document.querySelector("[data-chart-grid]");
  const responseList = document.querySelector("[data-response-list]");
  const responseTable = document.querySelector("[data-response-table]");
  const charts = [];
  let forms = [];
  let form = null;
  let submissions = [];

  function filteredSubmissions() {
    const stage = stageFilter.value;
    return stage ? submissions.filter((item) => item.answers.stage === stage) : submissions;
  }

  function countValues(field, data) {
    const counts = Object.fromEntries((field.options || []).map((option) => [option, 0]));
    data.forEach((submission) => {
      const answer = submission.answers[field.id];
      const values = Array.isArray(answer) ? answer : [answer];
      values.filter(Boolean).forEach((value) => { counts[value] = (counts[value] || 0) + 1; });
    });
    return counts;
  }

  function updateKpis(data) {
    const avg = data.length ? Math.round(data.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0) / data.length) : 0;
    const today = new Date().toDateString();
    const todayCount = data.filter((item) => new Date(item.submitted_at).toDateString() === today).length;
    document.querySelector("[data-response-kpis]").innerHTML = `
      <div class="kpi"><span class="kpi__label"><i data-lucide="messages-square"></i> 篩選後回應</span><strong class="kpi__value">${data.length}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="timer"></i> 平均作答時間</span><strong class="kpi__value">${window.HCCCR.formatDuration(avg)}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="calendar-check"></i> 今日新增</span><strong class="kpi__value">${todayCount}</strong></div>
      <div class="kpi"><span class="kpi__label"><i data-lucide="list-checks"></i> 問卷題數</span><strong class="kpi__value">${form.fields.length}</strong></div>`;
    document.querySelector("[data-filter-result]").textContent = `顯示 ${data.length} / ${submissions.length} 份回應`;
  }

  function renderCharts(data) {
    charts.splice(0).forEach((chart) => chart.destroy());
    const chartFields = form.fields.filter((field) => ["radio", "checkbox"].includes(field.type));
    if (!chartFields.length) {
      chartGrid.innerHTML = '<p class="empty-state">這份調查目前沒有可統計的選擇題。</p>';
      return;
    }
    chartGrid.innerHTML = chartFields.map((field, index) => `<article class="chart-panel"><h3>${window.HCCCR.escapeHtml(field.label)}</h3><div class="chart-canvas-wrap"><canvas data-chart-index="${index}"></canvas></div></article>`).join("");
    chartFields.forEach((field, index) => {
      const counts = countValues(field, data);
      const isPie = field.type === "radio" && Object.keys(counts).length <= 5;
      const chart = new Chart(chartGrid.querySelector(`[data-chart-index="${index}"]`), {
        type: isPie ? "doughnut" : "bar",
        data: {
          labels: Object.keys(counts),
          datasets: [{ data: Object.values(counts), backgroundColor: isPie ? ["#1d625b", "#d7553e", "#e8b94f", "#4e8196", "#72827d"] : "#2b766e", borderColor: "#1d625b", borderWidth: isPie ? 0 : 1, borderRadius: isPie ? 0 : 3 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          indexAxis: isPie ? "x" : "y",
          plugins: { legend: { display: isPie, position: "bottom", labels: { boxWidth: 12, font: { family: "system-ui" } } } },
          scales: isPie ? {} : { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } },
        },
      });
      charts.push(chart);
    });
  }

  function answerSummary(submission) {
    const stage = submission.answers.stage || "未填階段";
    const secondaryField = form.fields.find((field) => field.id !== "stage" && submission.answers[field.id]);
    let secondary = secondaryField ? submission.answers[secondaryField.id] : "";
    if (Array.isArray(secondary)) secondary = secondary.join("、");
    return { stage, secondary };
  }

  function renderIndividuals(data) {
    responseList.innerHTML = data.length ? data.map((submission, index) => {
      const summary = answerSummary(submission);
      return `<article class="response-row"><span class="response-row__number">#${data.length - index}</span><div class="response-row__meta"><strong>${window.HCCCR.escapeHtml(summary.stage)} · ${window.HCCCR.formatDuration(submission.duration_seconds)}</strong><span>${window.HCCCR.formatDate(submission.submitted_at, true)}${summary.secondary ? ` · ${window.HCCCR.escapeHtml(String(summary.secondary))}` : ""}</span></div><a class="button button--secondary button--small" href="${window.HCCCR.appUrl("/admin/response-detail.html")}?form=${encodeURIComponent(form.id)}&id=${encodeURIComponent(submission.id)}">查看</a></article>`;
    }).join("") : '<p class="empty-state">目前沒有符合條件的回應。</p>';
  }

  function renderTable(data) {
    const columns = form.fields.slice(0, 4);
    responseTable.innerHTML = `<thead><tr><th scope="col">送出時間</th>${columns.map((field) => `<th scope="col">${window.HCCCR.escapeHtml(field.label)}</th>`).join("")}<th scope="col">作答時間</th><th scope="col"><span class="sr-only">操作</span></th></tr></thead><tbody>${data.map((submission) => `<tr><td>${window.HCCCR.formatDate(submission.submitted_at, true)}</td>${columns.map((field) => { const answer = submission.answers[field.id]; return `<td>${window.HCCCR.escapeHtml(Array.isArray(answer) ? answer.join("、") : answer || "-")}</td>`; }).join("")}<td>${window.HCCCR.formatDuration(submission.duration_seconds)}</td><td><div class="table-actions"><a class="icon-button" href="${window.HCCCR.appUrl("/admin/response-detail.html")}?form=${encodeURIComponent(form.id)}&id=${encodeURIComponent(submission.id)}" title="查看"><i data-lucide="eye"></i><span class="sr-only">查看回應</span></a><button class="icon-button" type="button" data-delete-response="${window.HCCCR.escapeHtml(submission.id)}" title="刪除"><i data-lucide="trash-2"></i><span class="sr-only">刪除回應</span></button></div></td></tr>`).join("")}</tbody>`;
  }

  function renderAll() {
    const data = filteredSubmissions();
    updateKpis(data);
    renderCharts(data);
    renderIndividuals(data);
    renderTable(data);
    window.lucide?.createIcons();
  }

  async function loadForm(formId) {
    form = forms.find((item) => item.id === formId) || forms[0];
    if (!form) return;
    select.value = form.id;
    document.querySelector("[data-response-page-title]").textContent = form.title;
    submissions = await window.HCCCR_DATA.getSubmissions(form.id);
    const stages = [...new Set(submissions.map((item) => item.answers.stage).filter(Boolean))];
    stageFilter.innerHTML = '<option value="">全部階段</option>' + stages.map((stage) => `<option value="${window.HCCCR.escapeHtml(stage)}">${window.HCCCR.escapeHtml(stage)}</option>`).join("");
    renderAll();
  }

  document.querySelector("[data-response-tabs]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    document.querySelectorAll("[data-tab]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== button.dataset.tab; });
  });
  stageFilter.addEventListener("change", renderAll);
  select.addEventListener("change", () => loadForm(select.value));
  responseTable.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-response]");
    if (!button || !window.confirm("確定要永久刪除這筆回應嗎？此操作無法復原。")) return;
    await window.HCCCR_DATA.deleteSubmission(button.dataset.deleteResponse);
    submissions = submissions.filter((item) => item.id !== button.dataset.deleteResponse);
    renderAll();
    window.HCCCR.showToast("回應已刪除。")
  });

  try {
    forms = await window.HCCCR_DATA.getForms({ includeUnlisted: true });
    select.innerHTML = forms.map((item) => `<option value="${item.id}">${window.HCCCR.escapeHtml(item.title)}</option>`).join("");
    const requested = new URLSearchParams(window.location.search).get("form");
    await loadForm(requested || forms[0]?.id);
  } catch (error) {
    chartGrid.innerHTML = '<p class="empty-state">無法載入回應資料。</p>';
    console.error(error);
  }
})();
