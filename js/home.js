(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value || ""));
  }

  // ---- 進行中的議題調查 ----
  (async function loadSurveys() {
    const list = document.querySelector("[data-home-surveys]");
    if (!list) return;
    try {
      const forms = (await window.HCCCR_DATA.getForms()).filter((form) => form.is_open).slice(0, 2);
      if (!forms.length) {
        list.innerHTML = '<p class="empty-state">目前沒有開放中的議題調查。</p>';
        return;
      }
      list.innerHTML = forms.map((form) => `
        <article class="survey-card">
          <div class="survey-card__meta">
            <span class="tag tag--accent">${escape(form.category)}</span>
            ${form.visibility === "public_password" ? '<span class="tag"><i data-lucide="lock-keyhole"></i> 活動密碼</span>' : ""}
          </div>
          <h3>${escape(form.title)}</h3>
          <p>${escape(form.description)}</p>
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

  // ---- 即時成果統計（開放中調查 / 累積回應）----
  (async function loadStats() {
    const grid = document.querySelector("[data-stats-grid]");
    if (!grid) return;
    try {
      const stats = await window.HCCCR_DATA.getPublicImpactStats();
      grid.querySelectorAll("[data-stat]").forEach((node) => {
        const value = Number(stats[node.dataset.stat] || 0);
        node.dataset.countTo = String(value);
        animateCount(node);
      });
    } catch (error) {
      console.warn("Unable to load impact stats", error);
    }
  })();

  function animateCount(node) {
    const target = Number(node.dataset.countTo || 0);
    if (reduceMotion || !target) {
      node.textContent = target.toLocaleString("zh-Hant-TW");
      return;
    }
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = Math.round(target * eased).toLocaleString("zh-Hant-TW");
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- 團隊預覽 ----
  (async function loadTeamPreview() {
    const section = document.querySelector("[data-team-preview]");
    const grid = document.querySelector("[data-team-preview-grid]");
    if (!section || !grid) return;
    try {
      const content = await window.HCCCR_DATA.getSiteContent();
      const members = JSON.parse(content["team.members_json"] || "[]");
      if (!Array.isArray(members) || !members.length) return;
      grid.innerHTML = members.slice(0, 3).map((member) => `
        <article class="team-card">
          <div class="team-card__avatar">${member.photo_url ? `<img src="${escape(member.photo_url)}" alt="${escape(member.name)}">` : '<i data-lucide="user-round"></i>'}</div>
          <h3>${escape(member.name)}</h3>
          ${member.role ? `<p class="team-card__role">${escape(member.role)}</p>` : ""}
          ${member.focus ? `<div class="team-card__focus"><span class="tag tag--accent">${escape(member.focus)}</span></div>` : ""}
          ${member.bio ? `<p>${escape(member.bio)}</p>` : ""}
        </article>
      `).join("");
      section.hidden = false;
      window.lucide?.createIcons();
    } catch (error) {
      console.warn("Unable to load team preview", error);
    }
  })();

  // ---- 捲動顯示動畫 ----
  const revealNodes = document.querySelectorAll("[data-reveal]");
  if (revealNodes.length && !reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add("is-revealed"));
  }

  // ---- 頂端導覽列陰影感應 ----
  const header = document.querySelector(".site-header");
  if (header) {
    const applyHeaderState = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    applyHeaderState();
    window.addEventListener("scroll", applyHeaderState, { passive: true });
  }

  // ---- 回到頂端按鈕 ----
  const backToTop = document.querySelector("[data-back-to-top]");
  if (backToTop) {
    const toggleVisibility = () => { backToTop.hidden = window.scrollY < 640; };
    toggleVisibility();
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }
})();
