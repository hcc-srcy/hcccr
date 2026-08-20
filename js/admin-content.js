(async function () {
  const form = document.querySelector("[data-content-form]");
  if (!form) return;

  const fields = window.HCCCR_CONTENT_FIELDS || [];
  const defaults = window.HCCCR_CONTENT_DEFAULTS || {};
  const groups = [...new Set(fields.map((field) => field.group))];
  const tabs = document.querySelector("[data-content-tabs]");
  const panels = document.querySelector("[data-content-panels]");
  let activeGroup = groups[0] || "";
  let dirty = false;

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value ?? ""));
  }

  function fieldId(key) {
    return `content-${key.replace(/[^a-z0-9_-]/gi, "-")}`;
  }

  function render(content) {
    tabs.innerHTML = groups.map((group, index) => `<button type="button" role="tab" data-content-tab="${escape(group)}" aria-selected="${index === 0}">${escape(group)}</button>`).join("");
    panels.innerHTML = groups.map((group, index) => {
      const groupFields = fields.filter((field) => field.group === group);
      return `<section class="panel content-panel" data-content-panel="${escape(group)}" ${index === 0 ? "" : "hidden"}><div class="panel__header"><h3>${escape(group)}</h3><span class="tag">${groupFields.length} 個欄位</span></div><div class="panel__body content-editor-grid">${groupFields.map((field) => {
        const id = fieldId(field.key);
        const value = content[field.key] ?? field.defaultValue;
        const rows = field.rows || (String(value).length > 100 ? 3 : 2);
        return `<div class="content-editor-field"><label class="form-label" for="${id}">${escape(field.label)}</label><div class="content-editor-control"><textarea class="form-control" id="${id}" name="${escape(field.key)}" rows="${rows}" maxlength="12000">${escape(value)}</textarea><button class="icon-button" type="button" data-reset-content="${escape(field.key)}" title="恢復預設文字"><i data-lucide="rotate-ccw"></i><span class="sr-only">恢復${escape(field.label)}預設文字</span></button></div></div>`;
      }).join("")}</div></section>`;
    }).join("");
    window.lucide?.createIcons();
  }

  function showGroup(group) {
    activeGroup = group;
    tabs.querySelectorAll("[data-content-tab]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.contentTab === group)));
    panels.querySelectorAll("[data-content-panel]").forEach((panel) => { panel.hidden = panel.dataset.contentPanel !== group; });
  }

  tabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-content-tab]");
    if (tab) showGroup(tab.dataset.contentTab);
  });
  panels.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reset-content]");
    if (!button) return;
    form.elements[button.dataset.resetContent].value = defaults[button.dataset.resetContent] || "";
    dirty = true;
  });
  form.addEventListener("input", () => { dirty = true; });
  window.addEventListener("beforeunload", (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButtons = document.querySelectorAll("[data-save-content]");
    saveButtons.forEach((button) => { button.disabled = true; });
    try {
      const values = new FormData(form);
      const content = Object.fromEntries(fields.map((field) => [field.key, String(values.get(field.key) ?? "")]));
      await window.HCCCR_DATA.saveSiteContent(content);
      dirty = false;
      window.HCCCR.showToast("網站內容已儲存。");
    } catch (error) {
      console.error(error);
      window.HCCCR.showToast("儲存失敗，請確認資料庫 schema 已更新。", "error");
    } finally {
      saveButtons.forEach((button) => { button.disabled = false; });
    }
  });

  try {
    const stored = await window.HCCCR_DATA.getSiteContent();
    render({ ...defaults, ...stored });
    showGroup(activeGroup);
  } catch (error) {
    console.error(error);
    render(defaults);
    window.HCCCR.showToast("無法載入正式內容，目前顯示預設文字。", "error");
  }
})();
