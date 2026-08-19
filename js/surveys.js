(async function () {
  const list = document.querySelector("[data-survey-list]");
  const search = document.querySelector("[data-survey-search]");
  const filters = [...document.querySelectorAll("[data-filter]")];
  if (!list) return;

  let forms = [];
  let activeFilter = "all";

  function isActive(form) {
    const now = Date.now();
    const started = !form.start_date || new Date(form.start_date).getTime() <= now;
    const notEnded = !form.end_date || new Date(form.end_date).getTime() >= now;
    return form.is_open && started && notEnded;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase("zh-TW");
    const filtered = forms.filter((form) => {
      const matchesText = `${form.title} ${form.description} ${form.category}`.toLocaleLowerCase("zh-TW").includes(query);
      const matchesFilter = activeFilter === "all"
        || (activeFilter === "open" && isActive(form))
        || (activeFilter === "password" && form.visibility === "public_password");
      return matchesText && matchesFilter;
    });

    if (!filtered.length) {
      list.innerHTML = '<p class="empty-state">找不到符合條件的調查。</p>';
      return;
    }

    list.innerHTML = filtered.map((form) => {
      const active = isActive(form);
      return `
        <article class="survey-card ${active ? "" : "survey-card--closed"}">
          <div class="survey-card__meta">
            <span class="tag tag--accent">${window.HCCCR.escapeHtml(form.category)}</span>
            <span class="tag ${active ? "tag--success" : ""}">${active ? "進行中" : "尚未開放或已截止"}</span>
            ${form.visibility === "public_password" ? '<span class="tag tag--warning"><i data-lucide="lock-keyhole"></i> 需活動密碼</span>' : ""}
            ${form.is_edited ? '<span class="tag">已編輯</span>' : ""}
          </div>
          <h3>${window.HCCCR.escapeHtml(form.title)}</h3>
          <p>${window.HCCCR.escapeHtml(form.description)}</p>
          <div class="survey-card__dates"><span><i data-lucide="calendar-days"></i> 截止 ${window.HCCCR.formatDate(form.end_date)}</span><span><i data-lucide="clock-3"></i> 約 ${form.estimated_minutes || 3} 分鐘</span></div>
          <div class="survey-card__footer">
            <span>${form.is_edited ? `修訂於 ${window.HCCCR.formatDate(form.updated_at)}` : `${form.response_count || 0} 份回應`}</span>
            ${active ? `<a class="button button--small" href="${window.HCCCR.getSurveyHref(form)}">開始填答 <i data-lucide="arrow-right"></i></a>` : '<span class="tag">暫停填答</span>'}
          </div>
        </article>`;
    }).join("");
    window.lucide?.createIcons();
  }

  try {
    forms = await window.HCCCR_DATA.getForms();
    render();
  } catch (error) {
    list.innerHTML = '<p class="empty-state">目前無法載入調查，請稍後再試。</p>';
    console.error(error);
  }

  search.addEventListener("input", render);
  filters.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    render();
  }));
})();
