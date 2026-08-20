(async function () {
  const select = document.querySelector("[data-form-select]");
  if (!select) return;

  const stageFilter = document.querySelector("[data-stage-filter]");
  const chartGrid = document.querySelector("[data-chart-grid]");
  const responseList = document.querySelector("[data-response-list]");
  const responseTable = document.querySelector("[data-response-table]");
  const exportButton = document.querySelector("[data-export-excel]");
  const charts = [];
  let forms = [];
  let form = null;
  let submissions = [];

  const taipeiDateTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

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

  function excelDateTime(value) {
    const source = new Date(value);
    if (Number.isNaN(source.getTime())) return null;
    const parts = Object.fromEntries(taipeiDateTime.formatToParts(source).map((part) => [part.type, part.value]));
    return new Date(Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ));
  }

  function excelAnswer(field, value) {
    if (value === null || value === undefined) return "";
    if (field.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      const [year, month, day] = String(value).split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    if (Array.isArray(value)) return value.join("、").slice(0, 32767);
    if (typeof value === "object") return JSON.stringify(value).slice(0, 32767);
    return typeof value === "string" ? value.slice(0, 32767) : value;
  }

  function setWorkbookStyles(workbook, data) {
    const answerSheet = workbook.addWorksheet("回應明細", {
      views: [{ state: "frozen", ySplit: 6 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    const headers = ["回應識別碼", "送出時間", "開始時間", "作答時間（秒）", "同意條款", ...form.fields.map((field, index) => `Q${index + 1}｜${field.label}`)];
    const rows = data.map((submission) => [
      String(submission.id || ""),
      excelDateTime(submission.submitted_at),
      excelDateTime(submission.started_at),
      Number(submission.duration_seconds || 0),
      submission.agreed_terms ? "是" : "否",
      ...form.fields.map((field) => excelAnswer(field, submission.answers?.[field.id])),
    ]);
    const lastColumn = answerSheet.getColumn(headers.length).letter;

    answerSheet.mergeCells(`A1:${lastColumn}1`);
    answerSheet.getCell("A1").value = form.title;
    answerSheet.getCell("A1").font = { name: "Arial", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    answerSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF153934" } };
    answerSheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    answerSheet.getRow(1).height = 34;

    const exportedAt = excelDateTime(new Date());
    answerSheet.getCell("A2").value = "匯出時間";
    answerSheet.getCell("B2").value = exportedAt;
    answerSheet.getCell("B2").numFmt = "yyyy-mm-dd hh:mm:ss";
    answerSheet.getCell("C2").value = "篩選條件";
    answerSheet.getCell("D2").value = stageFilter.value ? `就讀階段：${stageFilter.value}` : "全部回應";
    answerSheet.getCell("A3").value = "回應數";
    answerSheet.getCell("B3").value = data.length;
    answerSheet.getCell("B3").numFmt = "#,##0";
    answerSheet.getCell("C3").value = "問卷 ID";
    answerSheet.getCell("D3").value = String(form.id || "");
    ["A2", "C2", "A3", "C3"].forEach((address) => {
      const cell = answerSheet.getCell(address);
      cell.font = { bold: true, color: { argb: "FF34423E" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F2EF" } };
      cell.alignment = { vertical: "middle" };
    });

    answerSheet.addTable({
      name: "SurveyResponses",
      ref: "A6",
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: headers.map((name) => ({ name, filterButton: true })),
      rows,
    });
    answerSheet.getRow(6).height = 30;
    answerSheet.getColumn(1).width = 20;
    answerSheet.getColumn(2).width = 21;
    answerSheet.getColumn(3).width = 21;
    answerSheet.getColumn(4).width = 16;
    answerSheet.getColumn(5).width = 12;
    answerSheet.getColumn(2).numFmt = "yyyy-mm-dd hh:mm:ss";
    answerSheet.getColumn(3).numFmt = "yyyy-mm-dd hh:mm:ss";
    answerSheet.getColumn(4).numFmt = "#,##0";
    form.fields.forEach((field, index) => {
      const column = answerSheet.getColumn(index + 6);
      column.width = Math.min(42, Math.max(18, String(field.label || "").length + 6));
      column.alignment = { vertical: "top", wrapText: true };
      if (field.type === "date") column.numFmt = "yyyy-mm-dd";
    });

    const questionSheet = workbook.addWorksheet("題目設定", { views: [{ state: "frozen", ySplit: 1 }] });
    const typeLabels = { radio: "單選題", checkbox: "複選題", text: "簡答題", textarea: "長答題", date: "日期" };
    questionSheet.addTable({
      name: "SurveyQuestions",
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: ["順序", "題目 ID", "題型", "題目", "必填", "選項"].map((name) => ({ name, filterButton: true })),
      rows: form.fields.map((field, index) => [
        index + 1,
        String(field.id || ""),
        typeLabels[field.type] || field.type,
        String(field.label || ""),
        field.required ? "是" : "否",
        (field.options || []).join("、"),
      ]),
    });
    [8, 20, 14, 42, 10, 42].forEach((width, index) => { questionSheet.getColumn(index + 1).width = width; });
    questionSheet.getColumn(4).alignment = { vertical: "top", wrapText: true };
    questionSheet.getColumn(6).alignment = { vertical: "top", wrapText: true };
    questionSheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }

  async function exportExcel() {
    const data = filteredSubmissions();
    if (!form || !data.length) return;
    if (!window.ExcelJS) {
      window.HCCCR.showToast("Excel 元件載入失敗，請重新整理後再試。", "error");
      return;
    }

    exportButton.disabled = true;
    exportButton.setAttribute("aria-busy", "true");
    try {
      const workbook = new window.ExcelJS.Workbook();
      workbook.creator = "竹縣少代調查系統";
      workbook.company = "新竹縣第四屆兒童及少年諮詢代表";
      workbook.created = new Date();
      workbook.modified = new Date();
      setWorkbookStyles(workbook, data);
      const bytes = await workbook.xlsx.writeBuffer();
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
      link.href = blobUrl;
      link.download = `${form.slug || "survey"}-responses-${date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      window.HCCCR.showToast(`已匯出 ${data.length} 份回應。`);
    } catch (error) {
      console.error(error);
      window.HCCCR.showToast("Excel 匯出失敗，請稍後再試。", "error");
    } finally {
      exportButton.removeAttribute("aria-busy");
      exportButton.disabled = filteredSubmissions().length === 0;
    }
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
    exportButton.disabled = data.length === 0;
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
  exportButton.addEventListener("click", exportExcel);
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
