(async function () {
  const list = document.querySelector("[data-home-surveys]");
  if (!list) return;

  try {
    const forms = (await window.HCCCR_DATA.getForms())
      .filter((form) => form.is_open)
      .slice(0, 2);
    list.innerHTML = forms.map((form) => `
      <article class="survey-card">
        <div class="survey-card__meta">
          <span class="tag tag--accent">${window.HCCCR.escapeHtml(form.category)}</span>
          ${form.visibility === "public_password" ? '<span class="tag"><i data-lucide="lock-keyhole"></i> 活動密碼</span>' : ""}
        </div>
        <h3>${window.HCCCR.escapeHtml(form.title)}</h3>
        <p>${window.HCCCR.escapeHtml(form.description)}</p>
        <div class="survey-card__footer">
          <span><i data-lucide="clock-3"></i> 約 ${form.estimated_minutes} 分鐘</span>
          <a class="text-link" href="${window.HCCCR.getSurveyHref(form)}">開始填答 <i data-lucide="arrow-right"></i></a>
        </div>
      </article>
    `).join("");
    window.lucide?.createIcons();
  } catch (error) {
    list.innerHTML = '<p class="empty-state">目前無法載入調查，請稍後再試。</p>';
    console.error(error);
  }
})();
