(function () {
  const editor = document.querySelector("[data-team-editor]");
  if (!editor) return;

  const CONTENT_KEY = "team.members_json";
  const dialog = document.querySelector("[data-member-dialog]");
  const form = document.querySelector("[data-member-form]");

  let members = [];
  let editingId = "";

  function escape(value) {
    return window.HCCCR.escapeHtml(String(value || ""));
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `member-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseMembers(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Unable to parse team.members_json", error);
      return [];
    }
  }

  function render() {
    editor.innerHTML = members.length
      ? `<ul class="team-editor__list">${members.map((member, index) => `
          <li class="team-editor__row" data-member-row="${escape(member.id)}">
            <div class="team-editor__avatar">${member.photo_url ? `<img src="${escape(member.photo_url)}" alt="">` : '<i data-lucide="user-round"></i>'}</div>
            <div class="team-editor__info"><strong>${escape(member.name)}</strong><small>${escape(member.role || "")}${member.focus ? ` · ${escape(member.focus)}` : ""}</small></div>
            <div class="team-editor__actions">
              <button class="icon-button" type="button" data-move-member="${escape(member.id)}" data-direction="up" ${index === 0 ? "disabled" : ""} title="上移"><i data-lucide="chevron-up"></i><span class="sr-only">上移</span></button>
              <button class="icon-button" type="button" data-move-member="${escape(member.id)}" data-direction="down" ${index === members.length - 1 ? "disabled" : ""} title="下移"><i data-lucide="chevron-down"></i><span class="sr-only">下移</span></button>
              <button class="icon-button" type="button" data-edit-member="${escape(member.id)}" title="編輯"><i data-lucide="pencil"></i><span class="sr-only">編輯</span></button>
              <button class="icon-button" type="button" data-remove-member="${escape(member.id)}" title="刪除"><i data-lucide="trash-2"></i><span class="sr-only">刪除</span></button>
            </div>
          </li>`).join("")}</ul>
        <div class="team-editor__save"><button class="button button--small" type="button" data-save-team><i data-lucide="save"></i> 儲存名單</button></div>`
      : `<p class="empty-state">目前沒有任何代表，點右上角「新增代表」開始建立名單。</p>`;
    window.lucide?.createIcons();
  }

  function openDialog(member) {
    editingId = member ? member.id : "";
    dialog.querySelector("#member-dialog-title").textContent = member ? "編輯代表" : "新增代表";
    form.reset();
    dialog.querySelector("[data-photo-error]").textContent = "";
    if (member) {
      form.elements.name.value = member.name || "";
      form.elements.role.value = member.role || "";
      form.elements.focus.value = member.focus || "";
      form.elements.bio.value = member.bio || "";
      form.elements.detail.value = member.detail || "";
      form.elements.photo_url.value = member.photo_url || "";
    }
    updatePhotoPreview(form.elements.photo_url.value);
    dialog.hidden = false;
    form.elements.name.focus();
  }

  function updatePhotoPreview(url) {
    const preview = dialog.querySelector("[data-photo-preview]");
    const removeButton = dialog.querySelector("[data-photo-remove]");
    preview.innerHTML = url ? `<img src="${escape(url)}" alt="">` : '<i data-lucide="user-round"></i>';
    removeButton.hidden = !url;
    window.lucide?.createIcons();
  }

  function closeDialog() {
    dialog.hidden = true;
    editingId = "";
  }

  async function persist() {
    await window.HCCCR_DATA.saveSiteContent({ [CONTENT_KEY]: JSON.stringify(members) });
  }

  editor.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-member]");
    if (editButton) {
      openDialog(members.find((member) => member.id === editButton.dataset.editMember));
      return;
    }
    const removeButton = event.target.closest("[data-remove-member]");
    if (removeButton) {
      const member = members.find((item) => item.id === removeButton.dataset.removeMember);
      if (member && window.confirm(`確定要刪除「${member.name}」嗎？`)) {
        members = members.filter((item) => item.id !== member.id);
        render();
      }
      return;
    }
    const moveButton = event.target.closest("[data-move-member]");
    if (moveButton) {
      const index = members.findIndex((item) => item.id === moveButton.dataset.moveMember);
      const swapWith = moveButton.dataset.direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= members.length) return;
      [members[index], members[swapWith]] = [members[swapWith], members[index]];
      render();
      return;
    }
    if (event.target.closest("[data-save-team]")) {
      const button = event.target.closest("[data-save-team]");
      button.disabled = true;
      try {
        await persist();
        window.HCCCR.showToast("代表名單已儲存。");
      } catch (error) {
        console.error(error);
        window.HCCCR.showToast("儲存失敗，請確認資料庫 schema 已更新。", "error");
      } finally {
        button.disabled = false;
      }
    }
  });

  document.querySelector("[data-add-member]").addEventListener("click", () => openDialog(null));
  document.querySelectorAll("[data-close-member]").forEach((button) => button.addEventListener("click", closeDialog));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });

  const photoInput = dialog.querySelector("[data-photo-input]");
  const photoError = dialog.querySelector("[data-photo-error]");
  const photoUploadButton = dialog.querySelector(".photo-uploader__button");

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    photoError.textContent = "";
    const labelText = photoUploadButton.querySelector("[data-photo-button-label]");
    const originalText = labelText.textContent;
    photoUploadButton.classList.add("is-loading");
    labelText.textContent = "上傳中…";
    try {
      const url = await window.HCCCR_DATA.uploadTeamPhoto(file, editingId);
      form.elements.photo_url.value = url;
      updatePhotoPreview(url);
    } catch (error) {
      console.error(error);
      photoError.textContent = error?.message || "上傳失敗，請確認資料庫 schema 已更新，或稍後再試。";
    } finally {
      photoUploadButton.classList.remove("is-loading");
      labelText.textContent = originalText;
      photoInput.value = "";
    }
  });

  dialog.querySelector("[data-photo-remove]").addEventListener("click", () => {
    form.elements.photo_url.value = "";
    updatePhotoPreview("");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const payload = {
      name: String(values.get("name") || "").trim(),
      role: String(values.get("role") || "").trim(),
      focus: String(values.get("focus") || "").trim(),
      bio: String(values.get("bio") || "").trim(),
      detail: String(values.get("detail") || "").trim(),
      photo_url: String(values.get("photo_url") || "").trim(),
    };
    if (!payload.name) return;
    if (editingId) {
      members = members.map((member) => (member.id === editingId ? { ...member, ...payload } : member));
    } else {
      members = [...members, { id: uid(), ...payload }];
    }
    closeDialog();
    render();
  });

  (async function load() {
    try {
      const stored = await window.HCCCR_DATA.getSiteContent();
      members = parseMembers(stored[CONTENT_KEY]);
      render();
    } catch (error) {
      console.error(error);
      editor.innerHTML = '<p class="empty-state">無法載入代表名單，請確認資料庫 schema 已更新。</p>';
    }
  })();
})();
