(async function () {
  const root = document.querySelector("[data-survey-root]");
  if (!root) return;

  const appPathname = window.location.pathname.slice(window.APP_CONFIG.basePath.length) || "/";
  const pathParts = appPathname.split("/").filter(Boolean);
  const pathIdentifier = pathParts[0] === "surveys" && pathParts[1] ? decodeURIComponent(pathParts[1]) : "";
  const identifier = new URLSearchParams(window.location.search).get("id") || pathIdentifier || "normal-teaching-2026";
  let form;
  let startedAt = null;
  let unlocked = false;
  let passwordVerified = false;
  let accessPassword = "";

  function fieldMarkup(field, index) {
    const label = `${window.HCCCR.escapeHtml(field.label)}${field.required ? '<span class="required-mark" aria-label="必填">*</span>' : ""}`;
    const description = field.description ? `<p class="question-description">${window.HCCCR.escapeHtml(field.description)}</p>` : "";
    const error = `<p class="field-message" id="error-${field.id}" data-field-error></p>`;
    const common = `name="${window.HCCCR.escapeHtml(field.id)}" data-field-id="${window.HCCCR.escapeHtml(field.id)}"`;

    if (field.type === "radio" || field.type === "checkbox") {
      return `<fieldset class="question-card" data-question="${field.id}"><legend>${index + 1}. ${label}</legend>${description}<div class="options-list">${(field.options || []).map((option) => `<label class="option-row"><input type="${field.type}" ${common} value="${window.HCCCR.escapeHtml(option)}"><span>${window.HCCCR.escapeHtml(option)}</span></label>`).join("")}</div>${error}</fieldset>`;
    }

    const inputType = field.type === "date" ? "date" : "text";
    const control = field.type === "textarea"
      ? `<textarea id="field-${field.id}" class="textarea-input" ${common} placeholder="${window.HCCCR.escapeHtml(field.placeholder || "")}" aria-describedby="error-${field.id}"></textarea>`
      : `<input id="field-${field.id}" class="${field.type === "date" ? "date-input" : "text-input"}" type="${inputType}" ${common} placeholder="${window.HCCCR.escapeHtml(field.placeholder || "")}" aria-describedby="error-${field.id}">`;
    return `<div class="question-card" data-question="${field.id}"><label class="question-label" for="field-${field.id}">${index + 1}. ${label}</label>${description}${control}${error}</div>`;
  }

  function render() {
    document.title = `${form.title}｜新竹縣第四屆兒少諮詢代表`;
    const needsPassword = form.visibility === "public_password" && !passwordVerified;
    const responseMarkup = needsPassword ? "" : `
      <section class="consent-card" data-consent-card>
        <div class="gate-heading"><span class="gate-heading__icon"><i data-lucide="shield-check"></i></span><div><h2>個資蒐集告知暨隱私權與服務條款</h2><p>同意後才會開始計算作答時間。</p></div></div>
        <div class="gate-body"><div class="consent-summary" tabindex="0"><p>本調查由新竹縣第四屆兒少諮詢代表辦理，填答資料用於兒少權益議題研究、統計與政策倡議。</p><ul><li>公開成果僅呈現去識別化統計，不公開個別原始回答。</li><li>請勿在自由文字欄位填寫姓名、班級、電話等識別資訊。</li><li>我們會記錄開始、送出時間及作答費時。</li></ul><p><a href="${window.HCCCR.appUrl("/terms")}" target="_blank" rel="noopener">閱讀完整隱私權與服務條款</a></p></div><label class="check-row"><input type="checkbox" data-consent-checkbox><span>我已閱讀並同意上述告知事項與隱私權條款</span></label></div>
      </section>
      <form data-response-form novalidate>
        <div class="questions-shell is-locked" data-questions-shell>
          <div class="locked-overlay" data-locked-overlay><div class="locked-overlay__content"><i data-lucide="lock-keyhole"></i>請先完成上方條款同意</div></div>
          <div class="questions-list" data-questions-list inert>${form.fields.map(fieldMarkup).join("")}</div>
        </div>
        <div class="progress-line no-print" aria-hidden="true"><span data-progress></span></div>
        <div class="form-footer no-print"><p><span class="required-mark">*</span> 為必填問題</p><button class="button" type="submit" disabled data-submit>送出回答 <i data-lucide="send"></i></button></div>
      </form>`;
    root.innerHTML = `
      <article class="survey-header-card">
        <div class="meta-row"><span class="tag tag--accent">${window.HCCCR.escapeHtml(form.category)}</span>${form.is_edited ? '<span class="tag">已編輯</span>' : ""}${needsPassword ? '<span class="tag tag--warning"><i data-lucide="lock-keyhole"></i> 需活動密碼</span>' : ""}</div>
        <h1>${window.HCCCR.escapeHtml(form.title)}</h1><p>${window.HCCCR.escapeHtml(form.description)}</p>
        <div class="survey-meta"><span><i data-lucide="clock-3"></i> 約 ${form.estimated_minutes || 3} 分鐘</span><span><i data-lucide="calendar-days"></i> 截止 ${window.HCCCR.formatDate(form.end_date)}</span>${form.is_edited ? `<span><i data-lucide="pencil-line"></i> 修訂於 ${window.HCCCR.formatDate(form.updated_at, true)}</span>` : ""}</div>
      </article>
      <div class="notice notice--demo" data-demo-only hidden style="margin-bottom:18px"><i data-lucide="flask-conical"></i><p>目前為示範模式，送出內容只暫存於這個瀏覽器分頁。</p></div>
      ${needsPassword ? `<section class="password-card" data-password-gate><div class="gate-heading"><span class="gate-heading__icon"><i data-lucide="key-round"></i></span><div><h2>輸入活動密碼</h2><p>此調查限受邀參與者填寫。</p></div></div><form class="gate-body" data-password-form><label for="access-password">活動密碼</label><input id="access-password" name="password" type="password" autocomplete="one-time-code" required><p class="field-message" data-password-error></p><div class="gate-actions"><button class="button button--small" type="submit">驗證密碼 <i data-lucide="arrow-right"></i></button></div></form></section>` : ""}
      ${responseMarkup}
      <p class="survey-footnote">本問卷由新竹縣第四屆兒童及少年諮詢代表發布 · <a href="${window.HCCCR.appUrl("/terms")}">隱私權政策</a></p>`;

    bindEvents();
    window.lucide?.createIcons();
    document.querySelectorAll("[data-demo-only]").forEach((node) => { node.hidden = window.HCCCR_DATA.mode !== "demo"; });
  }

  function unlockConsent() {
    root.querySelector("[data-consent-card]").hidden = false;
    root.querySelector("[data-consent-card]").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function unlockQuestions() {
    if (unlocked) return;
    unlocked = true;
    startedAt = new Date().toISOString();
    const shell = root.querySelector("[data-questions-shell]");
    shell.classList.remove("is-locked");
    root.querySelector("[data-locked-overlay]").hidden = true;
    root.querySelector("[data-questions-list]").inert = false;
    root.querySelector("[data-submit]").disabled = false;
  }

  function lockQuestions() {
    unlocked = false;
    startedAt = null;
    const shell = root.querySelector("[data-questions-shell]");
    shell.classList.add("is-locked");
    root.querySelector("[data-locked-overlay]").hidden = false;
    root.querySelector("[data-questions-list]").inert = true;
    root.querySelector("[data-submit]").disabled = true;
  }

  function getAnswer(field) {
    if (field.type === "checkbox") return [...root.querySelectorAll(`[name="${CSS.escape(field.id)}"]:checked`)].map((input) => input.value);
    if (field.type === "radio") return root.querySelector(`[name="${CSS.escape(field.id)}"]:checked`)?.value || "";
    return root.querySelector(`[name="${CSS.escape(field.id)}"]`)?.value.trim() || "";
  }

  function validate() {
    let firstInvalid = null;
    const answers = {};
    form.fields.forEach((field) => {
      const answer = getAnswer(field);
      answers[field.id] = answer;
      const empty = Array.isArray(answer) ? answer.length === 0 : !answer;
      const question = root.querySelector(`[data-question="${CSS.escape(field.id)}"]`);
      const message = question.querySelector("[data-field-error]");
      const invalid = field.required && empty;
      question.classList.toggle("has-error", invalid);
      message.textContent = invalid ? "這是必填問題。" : "";
      if (invalid && !firstInvalid) firstInvalid = question;
    });
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.querySelector("input, textarea")?.focus({ preventScroll: true });
      return null;
    }
    return answers;
  }

  function updateProgress() {
    const completed = form.fields.filter((field) => {
      const answer = getAnswer(field);
      return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
    }).length;
    root.querySelector("[data-progress]").style.width = `${Math.round((completed / form.fields.length) * 100)}%`;
  }

  function referenceCode(date, id) {
    const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
    return `${stamp}-${String(id).replaceAll("-", "").slice(-6).toUpperCase()}`;
  }

  function bindEvents() {
    const passwordForm = root.querySelector("[data-password-form]");
    if (passwordForm) passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const entered = new FormData(passwordForm).get("password");
      const error = root.querySelector("[data-password-error]");
      const submit = passwordForm.querySelector("button[type=submit]");
      submit.disabled = true;
      try {
        const verifiedForm = await window.HCCCR_DATA.unlockForm(identifier, entered);
        if (!verifiedForm) throw new Error("INVALID_PASSWORD");
        accessPassword = entered;
        passwordVerified = true;
        form = verifiedForm;
        render();
        root.querySelector("[data-consent-card]").scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (verificationError) {
        error.textContent = "活動密碼不正確，請重新輸入。";
        passwordForm.password.select();
        submit.disabled = false;
      }
    });

    root.querySelector("[data-consent-checkbox]")?.addEventListener("change", (event) => {
      if (event.target.checked) unlockQuestions();
      else lockQuestions();
    });

    const responseForm = root.querySelector("[data-response-form]");
    if (!responseForm) return;
    responseForm.addEventListener("input", updateProgress);
    responseForm.addEventListener("change", updateProgress);
    responseForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!unlocked || !startedAt) return;
      const answers = validate();
      if (!answers) return;
      const submittedAt = new Date();
      const submit = root.querySelector("[data-submit]");
      submit.disabled = true;
      submit.textContent = "正在送出…";
      try {
        const saved = await window.HCCCR_DATA.saveSubmission({ form_id: form.id, agreed_terms: true, answers, started_at: startedAt, submitted_at: submittedAt.toISOString(), duration_seconds: Math.max(1, Math.round((submittedAt - new Date(startedAt)) / 1000)), access_password: accessPassword });
        root.innerHTML = `<section class="success-panel"><span class="success-panel__icon"><i data-lucide="check"></i></span><h2>回答已送出</h2><p>謝謝你分享真實經驗。請記下回應識別碼，以便日後提出資料權利申請。</p><span class="reference-code">${referenceCode(submittedAt, saved.id)}</span><div><a class="button" href="${window.HCCCR.appUrl("/surveys")}">返回調查中心 <i data-lucide="arrow-right"></i></a></div></section>`;
        window.lucide?.createIcons();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        submit.disabled = false;
        submit.innerHTML = '送出回答 <i data-lucide="send"></i>';
        window.HCCCR.showToast("送出失敗，請檢查網路後再試一次。", "error");
        window.lucide?.createIcons();
        console.error(error);
      }
    });
  }

  document.querySelector("[data-print-survey]")?.addEventListener("click", () => window.print());

  try {
    form = await window.HCCCR_DATA.getForm(identifier);
    if (!form) throw new Error("FORM_NOT_FOUND");
    const now = Date.now();
    const unavailable = !form.is_open || (form.start_date && new Date(form.start_date).getTime() > now) || (form.end_date && new Date(form.end_date).getTime() < now);
    if (unavailable) {
      root.innerHTML = `<section class="success-panel"><span class="success-panel__icon" style="background:#6b7672"><i data-lucide="calendar-x"></i></span><h2>目前無法填寫</h2><p>此調查尚未開始、已截止或暫停開放。</p><a class="button button--secondary" href="${window.HCCCR.appUrl("/surveys")}">返回調查中心</a></section>`;
      window.lucide?.createIcons();
      return;
    }
    render();
  } catch (error) {
    root.innerHTML = `<section class="success-panel"><span class="success-panel__icon" style="background:#b42318"><i data-lucide="file-question"></i></span><h2>找不到這份調查</h2><p>網址可能有誤，或調查已經移除。</p><a class="button button--secondary" href="${window.HCCCR.appUrl("/surveys")}">查看其他調查</a></section>`;
    window.lucide?.createIcons();
    console.error(error);
  }
})();
