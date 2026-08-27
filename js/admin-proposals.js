(function () {
  const editor = document.querySelector("[data-proposal-editor]");
  if (!editor) return;

  const CONTENT_KEY = "proposals.items_json";
  const STEPS = ["已提出", "委員會討論", "縣府回應", "已採納/未採納"];
  const dialog = document.querySelector("[data-proposal-dialog]");
  const form = document.querySelector("[data-proposal-form]");
  const errorBox = document.querySelector("[data-proposal-error]");

  let proposals = [];
  let editingIndex = -1;

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value || ""));
  }

  function parseProposals(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Unable to parse proposals.items_json", error);
      return [];
    }
  }

  function render() {
    editor.innerHTML = proposals.length
      ? `<ul class="team-editor__list">${proposals.map((proposal, index) => `
          <li class="team-editor__row" data-proposal-row="${index}">
            <div class="team-editor__avatar"><i data-lucide="clipboard-list"></i></div>
            <div class="team-editor__info"><strong>${escape(proposal.title)}</strong><small>${escape(proposal.category || "")}${proposal.category ? " · " : ""}${escape(proposal.status || "已提出")}</small></div>
            <div class="team-editor__actions">
              <button class="icon-button" type="button" data-move-proposal="${index}" data-direction="up" ${index === 0 ? "disabled" : ""} title="上移"><i data-lucide="chevron-up"></i><span class="sr-only">上移</span></button>
              <button class="icon-button" type="button" data-move-proposal="${index}" data-direction="down" ${index === proposals.length - 1 ? "disabled" : ""} title="下移"><i data-lucide="chevron-down"></i><span class="sr-only">下移</span></button>
              <button class="icon-button" type="button" data-edit-proposal="${index}" title="編輯"><i data-lucide="pencil"></i><span class="sr-only">編輯</span></button>
              <button class="icon-button" type="button" data-remove-proposal="${index}" title="刪除"><i data-lucide="trash-2"></i><span class="sr-only">刪除</span></button>
            </div>
          </li>`).join("")}</ul>
        <div class="team-editor__save"><button class="button button--small" type="button" data-save-proposals><i data-lucide="save"></i> 儲存提案</button></div>`
      : `<p class="empty-state">目前沒有任何提案，點右上角「新增提案」開始建立。</p>`;
    window.lucide?.createIcons();
  }

  function timelineLookup(proposal, step) {
    return (proposal.timeline || []).find((entry) => entry.step === step) || {};
  }

  function openDialog(index) {
    editingIndex = index;
    const proposal = index >= 0 ? proposals[index] : null;
    dialog.querySelector("#proposal-dialog-title").textContent = proposal ? "編輯提案" : "新增提案";
    form.reset();
    errorBox.textContent = "";
    if (proposal) {
      form.elements.title.value = proposal.title || "";
      form.elements.category.value = proposal.category || "";
      form.elements.summary.value = proposal.summary || "";
      form.elements.status.value = STEPS.includes(proposal.status) ? proposal.status : "已提出";
      form.elements.updated_at.value = proposal.updated_at || "";
      STEPS.forEach((step, i) => {
        const entry = timelineLookup(proposal, step);
        form.elements[`step${i + 1}_date`].value = entry.date || "";
        form.elements[`step${i + 1}_note`].value = entry.note || "";
      });
    } else {
      form.elements.status.value = "已提出";
    }
    dialog.hidden = false;
    form.elements.title.focus();
  }

  function closeDialog() {
    dialog.hidden = true;
    editingIndex = -1;
  }

  async function persist() {
    await window.HCCCR_DATA.saveSiteContent({ [CONTENT_KEY]: JSON.stringify(proposals) });
  }

  editor.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-proposal]");
    if (editButton) {
      openDialog(Number(editButton.dataset.editProposal));
      return;
    }
    const removeButton = event.target.closest("[data-remove-proposal]");
    if (removeButton) {
      const index = Number(removeButton.dataset.removeProposal);
      const proposal = proposals[index];
      if (proposal && window.confirm(`確定要刪除「${proposal.title}」嗎？`)) {
        proposals = proposals.filter((_, i) => i !== index);
        render();
      }
      return;
    }
    const moveButton = event.target.closest("[data-move-proposal]");
    if (moveButton) {
      const index = Number(moveButton.dataset.moveProposal);
      const swapWith = moveButton.dataset.direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= proposals.length) return;
      [proposals[index], proposals[swapWith]] = [proposals[swapWith], proposals[index]];
      render();
      return;
    }
    if (event.target.closest("[data-save-proposals]")) {
      const button = event.target.closest("[data-save-proposals]");
      button.disabled = true;
      try {
        await persist();
        window.HCCCR.showToast("提案進度已儲存。");
      } catch (error) {
        console.error(error);
        window.HCCCR.showToast("儲存失敗，請確認資料庫 schema 已更新。", "error");
      } finally {
        button.disabled = false;
      }
    }
  });

  document.querySelector("[data-add-proposal]").addEventListener("click", () => openDialog(-1));
  document.querySelectorAll("[data-close-proposal]").forEach((button) => button.addEventListener("click", closeDialog));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const title = String(values.get("title") || "").trim();
    if (!title) return;
    const status = String(values.get("status") || "已提出");
    const timeline = STEPS.map((step, i) => {
      const date = String(values.get(`step${i + 1}_date`) || "").trim();
      const note = String(values.get(`step${i + 1}_note`) || "").trim();
      return date || note ? { step, date, note } : null;
    }).filter(Boolean);
    const payload = {
      title,
      category: String(values.get("category") || "").trim(),
      summary: String(values.get("summary") || "").trim(),
      status,
      updated_at: String(values.get("updated_at") || "").trim(),
      timeline,
    };
    if (editingIndex >= 0) {
      proposals = proposals.map((item, i) => (i === editingIndex ? payload : item));
    } else {
      proposals = [...proposals, payload];
    }
    closeDialog();
    render();
  });

  (async function load() {
    try {
      const stored = await window.HCCCR_DATA.getSiteContent();
      proposals = parseProposals(stored[CONTENT_KEY] || window.HCCCR_CONTENT_DEFAULTS?.[CONTENT_KEY]);
      render();
    } catch (error) {
      console.error(error);
      editor.innerHTML = '<p class="empty-state">無法載入提案進度，請確認資料庫 schema 已更新。</p>';
    }
  })();
})();
