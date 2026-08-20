(async function () {
  const builder = document.querySelector("[data-builder-form]");
  if (!builder) return;

  const id = new URLSearchParams(window.location.search).get("id");
  const list = document.querySelector("[data-field-list]");
  const typeLabels = { radio: "單選題", checkbox: "複選題", text: "簡答題", textarea: "長答題", date: "日期", section: "區段" };
  const optionTypes = new Set(["radio", "checkbox"]);
  let form = null;
  let fields = [];

  function newId() {
    return crypto.randomUUID ? crypto.randomUUID() : `field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function dateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function defaultField(type = "radio") {
    if (type === "section") {
      return { id: newId(), type, label: "未命名區段", description: "" };
    }
    return {
      id: newId(),
      type,
      label: "未命名問題",
      description: "",
      required: false,
      ...(optionTypes.has(type) ? { options: ["選項 1", "選項 2"] } : {}),
    };
  }

  function defaultFields() {
    return [defaultField("section"), defaultField()];
  }

  function isSection(field) {
    return field.type === "section";
  }

  function escape(value) {
    return window.HCCCR.escapeHtml(value);
  }

  function branchRule(field, option) {
    const rule = field.branching?.[option];
    return rule && ["jump", "screenout", "submit"].includes(rule.action) ? rule : { action: "next" };
  }

  function branchingMarkup(field, fieldIndex) {
    if (field.type !== "radio") return "";
    const usesSections = fields.some(isSection);
    const laterSections = fields.slice(fieldIndex + 1).filter(isSection);
    const legacyTargetIds = new Set(Object.values(field.branching || {}).filter((rule) => rule.action === "jump").map((rule) => rule.target_field_id));
    const legacyTargets = fields.filter((candidate, candidateIndex) => candidateIndex > fieldIndex && !isSection(candidate) && legacyTargetIds.has(candidate.id));
    const targets = usesSections ? [...legacyTargets, ...laterSections] : fields.slice(fieldIndex + 1);
    const configured = (field.options || []).filter((option) => branchRule(field, option).action !== "next").length;
    return `<details class="branching-editor" data-branching-editor>
      <summary><span><i data-lucide="split"></i> ${usesSections ? "區段跳轉" : "跳題邏輯"}</span><span class="tag">${configured} 個設定</span></summary>
      <div class="branching-list">
        ${(field.options || []).map((option, optionIndex) => {
          const rule = branchRule(field, option);
          return `<div class="branching-row">
            <span class="branching-row__option" title="${escape(option)}">${escape(option)}</span>
            <label class="sr-only" for="branch-action-${field.id}-${optionIndex}">${escape(option)}的後續動作</label>
            <select class="form-control" id="branch-action-${field.id}-${optionIndex}" data-branch-action="${optionIndex}">
              <option value="next" ${rule.action === "next" ? "selected" : ""}>${usesSections ? "繼續填寫本區段" : "前往下一題"}</option>
              ${targets.length ? `<option value="jump" ${rule.action === "jump" ? "selected" : ""}>${usesSections ? "前往指定區段" : "跳到指定題目"}</option>` : ""}
              <option value="screenout" ${rule.action === "screenout" ? "selected" : ""}>結束，不納入統計</option>
              <option value="submit" ${rule.action === "submit" ? "selected" : ""}>結束並送出</option>
            </select>
            <label class="sr-only" for="branch-target-${field.id}-${optionIndex}">${escape(option)}要前往的${usesSections ? "區段" : "題目"}</label>
            <select class="form-control" id="branch-target-${field.id}-${optionIndex}" data-branch-target="${optionIndex}" ${rule.action === "jump" ? "" : "hidden"}>
              <option value="">選擇目標${usesSections ? "區段" : "題目"}</option>
              ${targets.map((target) => {
                const targetIndex = fields.indexOf(target);
                const sectionNumber = fields.slice(0, targetIndex + 1).filter(isSection).length;
                const questionNumber = fields.slice(0, targetIndex + 1).filter((candidate) => !isSection(candidate)).length;
                const targetLabel = isSection(target) ? `第 ${sectionNumber} 區｜${escape(target.label)}` : `${usesSections ? "舊版跳題" : `第 ${questionNumber} 題`}｜${escape(target.label)}`;
                return `<option value="${escape(target.id)}" ${rule.target_field_id === target.id ? "selected" : ""}>${targetLabel}</option>`;
              }).join("")}
            </select>
          </div>`;
        }).join("")}
      </div>
    </details>`;
  }

  function renderFields() {
    const questionCount = fields.filter((field) => !isSection(field)).length;
    const sectionCount = fields.filter(isSection).length;
    document.querySelector("[data-field-count]").textContent = `${questionCount} 題・${sectionCount} 區段`;
    list.innerHTML = fields.map((field, index) => `
      <article class="field-editor ${isSection(field) ? "field-editor--section" : ""}" draggable="true" data-field-index="${index}">
        <div class="drag-handle" title="拖曳排序"><i data-lucide="grip-vertical"></i></div>
        <div class="field-editor__body">
          <div class="field-editor__row"><label class="form-label">${isSection(field) ? "區段標題" : "題目"}<input class="form-control" data-field-prop="label" value="${escape(field.label)}"></label><label class="form-label">類型<select class="form-control" data-field-prop="type">${Object.entries(typeLabels).map(([value, label]) => `<option value="${value}" ${field.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
          <label class="form-label">補充說明（選填）<input class="form-control" data-field-prop="description" value="${escape(field.description || "")}"></label>
          ${optionTypes.has(field.type) ? `<div class="options-editor" data-options>${(field.options || []).map((option, optionIndex) => `<div class="option-editor"><span class="option-editor__dot"></span><input class="form-control" data-option-index="${optionIndex}" value="${escape(option)}" aria-label="選項 ${optionIndex + 1}"><button class="icon-button" type="button" data-remove-option="${optionIndex}" title="刪除選項"><i data-lucide="x"></i></button></div>`).join("")}<button class="button button--secondary button--small" type="button" data-add-option style="justify-self:start"><i data-lucide="plus"></i> 新增選項</button></div>` : ""}
          ${branchingMarkup(field, index)}
          ${isSection(field) ? '<p class="field-editor__hint">單選題可跳到這個區段；被略過區段的題目不會驗證或儲存。</p>' : `<div class="toggle-row"><div><strong>必填</strong><small>填答者必須完成此題</small></div><label class="switch"><input type="checkbox" data-field-prop="required" ${field.required ? "checked" : ""}><span></span></label></div>`}
        </div>
        <div class="field-editor__actions"><button class="icon-button" type="button" data-move="up" title="上移" ${index === 0 ? "disabled" : ""}><i data-lucide="arrow-up"></i></button><button class="icon-button" type="button" data-move="down" title="下移" ${index === fields.length - 1 ? "disabled" : ""}><i data-lucide="arrow-down"></i></button><button class="icon-button" type="button" data-remove-field title="刪除${isSection(field) ? "區段" : "題目"}"><i data-lucide="trash-2"></i></button></div>
      </article>`).join("");
    window.lucide?.createIcons();
  }

  function updateFixedUrl() {
    const slug = builder.elements.slug.value.trim() || form?.id || "new-survey";
    const url = new URL(window.HCCCR.getSurveyHref({ slug }), `${window.location.origin}/`).href;
    const printUrl = new URL(url);
    printUrl.searchParams.set("adminPrint", "1");
    const printButton = document.querySelector("[data-print-form]");
    document.querySelector("[data-fixed-url]").value = url;
    document.querySelector("[data-preview-link]").href = url;
    printButton.dataset.printUrl = printUrl.href;
    printButton.disabled = !form?.id;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(url)}`;
    document.querySelector("[data-qr-image]").src = qrUrl;
    document.querySelector("[data-download-qr]").href = qrUrl;
  }

  function syncVisibility() {
    const needsPassword = document.querySelector("[data-visibility]").value === "public_password";
    document.querySelector("[data-password-setting]").hidden = !needsPassword;
  }

  function fillForm() {
    builder.elements.title.value = form.title || "";
    builder.elements.description.value = form.description || "";
    builder.elements.category.value = form.category || "";
    builder.elements.slug.value = form.slug || "";
    builder.elements.start_date.value = dateTimeLocal(form.start_date);
    builder.elements.end_date.value = dateTimeLocal(form.end_date);
    document.querySelector("[data-visibility]").value = form.visibility || "public";
    document.querySelector("[data-access-password]").value = form.access_password || "";
    document.querySelector("[data-is-open]").checked = form.is_open !== false;
    document.querySelector("[data-require-consent]").checked = form.require_terms_consent !== false;
    fields = form.fields?.length ? JSON.parse(JSON.stringify(form.fields)) : defaultFields();
    syncVisibility();
    renderFields();
    updateFixedUrl();
  }

  function moveField(index, direction) {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    renderFields();
  }

  list.addEventListener("input", (event) => {
    const editor = event.target.closest("[data-field-index]");
    if (!editor) return;
    const field = fields[Number(editor.dataset.fieldIndex)];
    if (event.target.dataset.fieldProp) {
      const prop = event.target.dataset.fieldProp;
      field[prop] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    }
    if (event.target.dataset.optionIndex !== undefined) {
      const optionIndex = Number(event.target.dataset.optionIndex);
      const previousOption = field.options[optionIndex];
      field.options[optionIndex] = event.target.value;
      if (previousOption !== event.target.value && field.branching?.[previousOption]) {
        field.branching[event.target.value] = field.branching[previousOption];
        delete field.branching[previousOption];
      }
    }
  });

  list.addEventListener("change", (event) => {
    const editor = event.target.closest("[data-field-index]");
    if (!editor) return;
    const fieldIndex = Number(editor.dataset.fieldIndex);
    const field = fields[fieldIndex];
    if (event.target.dataset.branchAction !== undefined) {
      const option = field.options[Number(event.target.dataset.branchAction)];
      const action = event.target.value;
      field.branching ||= {};
      if (action === "next") delete field.branching[option];
      else if (action === "jump") {
        const firstTarget = (fields.some(isSection) ? fields.slice(fieldIndex + 1).find(isSection) : fields[fieldIndex + 1])?.id || "";
        field.branching[option] = { action, target_field_id: branchRule(field, option).target_field_id || firstTarget };
      } else field.branching[option] = { action };
      if (!Object.keys(field.branching).length) delete field.branching;
      renderFields();
      list.querySelector(`[data-field-index="${fieldIndex}"] [data-branching-editor]`)?.setAttribute("open", "");
      return;
    }
    if (event.target.dataset.branchTarget !== undefined) {
      const option = field.options[Number(event.target.dataset.branchTarget)];
      field.branching ||= {};
      field.branching[option] = { action: "jump", target_field_id: event.target.value };
      return;
    }
    if (event.target.dataset.optionIndex !== undefined) {
      renderFields();
      return;
    }
    if (event.target.dataset.fieldProp !== "type") return;
    field.type = event.target.value;
    if (optionTypes.has(field.type) && !field.options) field.options = ["選項 1", "選項 2"];
    if (!optionTypes.has(field.type)) delete field.options;
    if (field.type !== "radio") delete field.branching;
    if (isSection(field)) {
      field.required = false;
      if (field.label === "未命名問題") field.label = "未命名區段";
    } else if (field.label === "未命名區段") field.label = "未命名問題";
    renderFields();
  });

  list.addEventListener("click", (event) => {
    const editor = event.target.closest("[data-field-index]");
    if (!editor) return;
    const index = Number(editor.dataset.fieldIndex);
    const action = event.target.closest("button");
    if (!action) return;
    if (action.hasAttribute("data-remove-field")) {
      const removedId = fields[index].id;
      fields.splice(index, 1);
      fields.forEach((field) => {
        Object.entries(field.branching || {}).forEach(([option, rule]) => {
          if (rule.target_field_id === removedId) delete field.branching[option];
        });
        if (field.branching && !Object.keys(field.branching).length) delete field.branching;
      });
      if (!fields.length) fields.push(...defaultFields());
      renderFields();
    } else if (action.dataset.move) moveField(index, action.dataset.move);
    else if (action.hasAttribute("data-add-option")) {
      fields[index].options.push(`選項 ${fields[index].options.length + 1}`);
      renderFields();
    } else if (action.dataset.removeOption !== undefined) {
      const removedOption = fields[index].options[Number(action.dataset.removeOption)];
      fields[index].options.splice(Number(action.dataset.removeOption), 1);
      if (fields[index].branching) {
        delete fields[index].branching[removedOption];
        if (!Object.keys(fields[index].branching).length) delete fields[index].branching;
      }
      renderFields();
    }
  });

  let draggedIndex = null;
  list.addEventListener("dragstart", (event) => {
    const editor = event.target.closest("[data-field-index]");
    if (!editor) return;
    draggedIndex = Number(editor.dataset.fieldIndex);
    editor.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  list.addEventListener("dragend", (event) => event.target.closest("[data-field-index]")?.classList.remove("is-dragging"));
  list.addEventListener("dragover", (event) => event.preventDefault());
  list.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest("[data-field-index]");
    if (!target || draggedIndex === null) return;
    const targetIndex = Number(target.dataset.fieldIndex);
    const [moved] = fields.splice(draggedIndex, 1);
    fields.splice(targetIndex, 0, moved);
    draggedIndex = null;
    renderFields();
  });

  document.querySelector("[data-add-field]").addEventListener("click", () => {
    fields.push(defaultField(document.querySelector("[data-new-field-type]").value));
    renderFields();
    list.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  builder.elements.slug.addEventListener("input", updateFixedUrl);
  document.querySelector("[data-visibility]").addEventListener("change", syncVisibility);
  document.querySelector("[data-copy-url]").addEventListener("click", async () => {
    await navigator.clipboard.writeText(document.querySelector("[data-fixed-url]").value);
    window.HCCCR.showToast("固定網址已複製。")
  });
  document.querySelector("[data-print-form]").addEventListener("click", (event) => {
    if (!event.currentTarget.dataset.printUrl || event.currentTarget.disabled) return;
    const printWindow = window.open(event.currentTarget.dataset.printUrl, "_blank");
    if (printWindow) printWindow.opener = null;
  });

  async function save() {
    if (!builder.reportValidity()) return;
    if (!fields.every((field) => field.label.trim())) {
      window.HCCCR.showToast("每個區段與題目都需要標題。", "error");
      return;
    }
    const invalidBranch = fields.find((field, fieldIndex) => Object.entries(field.branching || {}).some(([option, rule]) => {
      if (!field.options?.includes(option) || !["jump", "screenout", "submit"].includes(rule.action)) return true;
      if (rule.action !== "jump") return false;
      const targetIndex = fields.findIndex((candidate) => candidate.id === rule.target_field_id);
      return targetIndex <= fieldIndex;
    }));
    if (invalidBranch) {
      window.HCCCR.showToast(`「${invalidBranch.label}」的跳題目標需要重新設定。`, "error");
      return;
    }
    const visibility = document.querySelector("[data-visibility]").value;
    const accessPassword = document.querySelector("[data-access-password]").value.trim();
    if (visibility === "public_password" && !accessPassword && !form.id) {
      document.querySelector("[data-access-password]").focus();
      window.HCCCR.showToast("密碼模式需要設定活動密碼。", "error");
      return;
    }
    const payload = {
      ...form,
      id: form.id || newId(),
      title: builder.elements.title.value.trim(),
      description: builder.elements.description.value.trim(),
      category: builder.elements.category.value.trim() || "兒少議題",
      slug: builder.elements.slug.value.trim() || `survey-${Date.now()}`,
      start_date: builder.elements.start_date.value ? new Date(builder.elements.start_date.value).toISOString() : new Date().toISOString(),
      end_date: builder.elements.end_date.value ? new Date(builder.elements.end_date.value).toISOString() : null,
      visibility,
      access_password: visibility === "public_password" ? accessPassword : "",
      is_open: document.querySelector("[data-is-open]").checked,
      require_terms_consent: document.querySelector("[data-require-consent]").checked,
      fields,
      estimated_minutes: Math.max(1, Math.ceil(fields.filter((field) => !isSection(field)).length * 0.55)),
    };
    document.querySelectorAll("[data-save-form]").forEach((button) => { button.disabled = true; });
    try {
      form = await window.HCCCR_DATA.saveForm(payload);
      history.replaceState({}, "", `${window.HCCCR.appUrl("/admin/builder.html")}?id=${encodeURIComponent(form.id)}`);
      document.querySelector("[data-builder-title]").textContent = "編輯調查";
      updateFixedUrl();
      window.HCCCR.showToast("調查已儲存。")
    } catch (error) {
      window.HCCCR.showToast("儲存失敗，請稍後再試。", "error");
      console.error(error);
    } finally {
      document.querySelectorAll("[data-save-form]").forEach((button) => { button.disabled = false; });
    }
  }
  builder.addEventListener("submit", (event) => {
    event.preventDefault();
    save();
  });

  try {
    form = id ? await window.HCCCR_DATA.getForm(id) : {
      id: "",
      title: "",
      description: "",
      category: "",
      slug: "",
      visibility: "public",
      is_open: true,
      require_terms_consent: true,
      fields: defaultFields(),
    };
    if (!form) throw new Error("FORM_NOT_FOUND");
    document.querySelector("[data-builder-title]").textContent = id ? "編輯調查" : "建立調查";
    fillForm();
  } catch (error) {
    window.HCCCR.showToast("找不到指定的調查。", "error");
    console.error(error);
  }
})();
