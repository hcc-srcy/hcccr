const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

function watchPageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function expectNoHorizontalOverflow(page) {
  const horizontalScroll = await page.evaluate(() => {
    const top = window.scrollY;
    window.scrollTo(99999, top);
    const moved = window.scrollX;
    window.scrollTo(0, top);
    return moved;
  });
  expect(horizontalScroll).toBe(0);
}

test("homepage and survey directory render", async ({ page }, testInfo) => {
  const errors = watchPageErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("新竹縣第四屆");
  await expect(page.locator(".hero__image")).toHaveJSProperty("complete", true);
  await expect(page.locator("[data-home-surveys] .survey-card")).toHaveCount(2);
  await expectNoHorizontalOverflow(page);

  if (testInfo.project.name === "mobile") {
    await page.locator("[data-menu-toggle]").click();
    await expect(page.locator("[data-mobile-menu]")).toBeVisible();
  }

  await page.goto("/surveys");
  await expect(page.getByRole("heading", { name: "兒少議題調查中心" })).toBeVisible();
  await expect(page.locator(".site-nav .nav-cta")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.locator("[data-survey-list] .survey-card")).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("public survey requires consent and submits", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/surveys/normal-teaching-2026");
  await expect(page.locator("[data-print-survey]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "校園教學正常化實況調查" })).toBeVisible();
  await expect(page.locator("[data-questions-shell]")).toHaveClass(/is-locked/);
  await expect(page.locator("[data-submit]")).toBeDisabled();

  await page.locator("[data-consent-checkbox]").check();
  await expect(page.locator("[data-questions-shell]")).not.toHaveClass(/is-locked/);
  await page.locator("[data-consent-checkbox]").uncheck();
  await expect(page.locator("[data-questions-shell]")).toHaveClass(/is-locked/);
  await page.locator("[data-consent-checkbox]").check();
  await page.locator('input[name="stage"][value="國中"]').check();
  await page.locator('input[name="area"][value="竹北地區"]').check();
  await page.locator('input[name="normal_status"][value="大多如此"]').check();
  await page.locator('input[name="situations"][value="以上皆無"]').check();
  await page.locator('input[name="impact"][value="沒有影響"]').check();
  await page.locator("[data-submit]").click();

  await expect(page.getByRole("heading", { name: "回答已送出" })).toBeVisible();
  await expect(page.locator(".reference-code")).toContainText(/^[0-9]{8}-[A-Z0-9]{6}$/);
  expect(errors).toEqual([]);
});

test("password survey rejects and accepts access password", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/surveys/school-lunch-2026");
  await expect(page.locator("[data-consent-card]")).toBeHidden();
  await expect(page.locator("[data-question]")).toHaveCount(0);
  await expect(page.locator("[data-response-form]")).toHaveCount(0);
  await page.locator("#access-password").fill("wrong");
  await page.getByRole("button", { name: "驗證密碼" }).click();
  await expect(page.locator("[data-password-error]")).toContainText("不正確");
  await page.locator("#access-password").fill("2026");
  await page.getByRole("button", { name: "驗證密碼" }).click();
  await expect(page.locator("[data-consent-card]")).toBeVisible();
  await expect(page.locator("[data-question]")).toHaveCount(5);
  const cardsStayInsideForm = await page.locator("[data-question]").evaluateAll((cards) => cards.every((card) => {
    const formBox = card.closest("[data-response-form]").getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    return cardBox.left >= formBox.left && cardBox.right <= formBox.right;
  }));
  expect(cardsStayInsideForm).toBe(true);
  const legendsStayInsideCards = await page.locator("fieldset[data-question]").evaluateAll((cards) => cards.every((card) => {
    const cardBox = card.getBoundingClientRect();
    const legendBox = card.querySelector("legend").getBoundingClientRect();
    const paddingTop = Number.parseFloat(getComputedStyle(card).paddingTop);
    return legendBox.top >= cardBox.top + paddingTop;
  }));
  expect(legendsStayInsideCards).toBe(true);
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("conditional branching jumps, screens out, and submits the active path", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    const forms = JSON.parse(JSON.stringify(window.HCCCR_SEED.forms));
    forms[0].fields[0].branching = {
      國小: { action: "jump", target_field_id: "normal_status" },
      高中職: { action: "submit" },
      其他: { action: "screenout" },
    };
    sessionStorage.setItem("hcccr_demo_forms", JSON.stringify(forms));
  });

  await page.goto("/surveys/normal-teaching-2026");
  await page.locator("[data-consent-checkbox]").check();
  await expect(page.locator("[data-question]:visible")).toHaveCount(1);
  await page.locator('input[name="stage"][value="國小"]').check();
  await expect(page.locator('[data-question="normal_status"]')).toBeVisible();
  await expect(page.locator('[data-question="area"]')).toBeHidden();
  await expect(page.locator('[data-question="school"]')).toBeHidden();
  await expect.poll(() => page.locator('[data-question="normal_status"]').evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.top < window.innerHeight && box.bottom > 0;
  })).toBe(true);

  await page.locator('input[name="stage"][value="其他"]').check();
  await expect(page.getByRole("heading", { name: "本次填答到此結束" })).toBeVisible();
  await page.getByRole("button", { name: "結束問卷" }).click();
  await expect(page.getByRole("heading", { name: "本次填答已結束" })).toBeVisible();
  const screenedOutCount = await page.evaluate(() => JSON.parse(sessionStorage.getItem("hcccr_demo_submissions") || JSON.stringify(window.HCCCR_SEED.submissions)).length);
  expect(screenedOutCount).toBe(8);

  await page.goto("/surveys/normal-teaching-2026");
  await page.locator("[data-consent-checkbox]").check();
  await page.locator('input[name="stage"][value="高中職"]').check();
  await expect(page.getByRole("heading", { name: "可以送出目前回答" })).toBeVisible();
  await page.getByRole("button", { name: "確認並送出" }).click();
  await expect(page.getByRole("heading", { name: "回答已送出" })).toBeVisible();
  const savedAnswers = await page.evaluate(() => JSON.parse(sessionStorage.getItem("hcccr_demo_submissions"))[0].answers);
  expect(savedAnswers).toEqual({ stage: "高中職" });
  expect(errors).toEqual([]);
});

test("section branching skips a complete section and keeps question numbering", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    const forms = JSON.parse(JSON.stringify(window.HCCCR_SEED.forms));
    forms[0].fields = [
      { id: "handout-section", type: "section", label: "講義", description: "講義使用情形" },
      { id: "has-handout", type: "radio", label: "有沒有講義？", required: true, options: ["有", "沒有"], branching: { "沒有": { action: "jump", target_field_id: "exam-section" } } },
      { id: "handout-quality", type: "radio", label: "講義內容清楚嗎？", required: true, options: ["清楚", "不清楚"] },
      { id: "exam-section", type: "section", label: "考試" },
      { id: "has-exam", type: "radio", label: "有沒有考試？", required: true, options: ["有", "沒有"] },
    ];
    sessionStorage.setItem("hcccr_demo_forms", JSON.stringify(forms));
  });

  await page.goto("/surveys/normal-teaching-2026");
  await page.locator("[data-consent-checkbox]").check();
  await expect(page.locator('[data-survey-section="handout-section"]')).toBeVisible();
  await expect(page.locator('[data-question="handout-quality"]')).toBeHidden();
  await expect(page.locator('[data-survey-section="exam-section"]')).toBeHidden();
  await page.locator('input[name="has-handout"][value="沒有"]').check();
  await expect(page.locator('[data-question="handout-quality"]')).toBeHidden();
  await expect(page.locator('[data-survey-section="exam-section"]')).toBeVisible();
  await expect(page.locator('[data-question="has-exam"] legend')).toContainText("3. ");
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("contact inbox and editable site content work", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "聯絡我們", exact: true })).toBeVisible();
  await expect(page.locator('.check-row input[name="agreed_privacy"]')).toHaveCSS("width", "18px");
  await page.locator('input[name="sender_name"]').fill("測試填寫者");
  await page.locator('input[name="sender_email"]').fill("student@example.org");
  await page.locator('input[name="subject"]').fill("調查問題");
  await page.locator('textarea[name="message"]').fill("想請問問卷的填答截止時間與資料處理方式。");
  await page.locator('input[name="agreed_privacy"]').check();
  await page.getByRole("button", { name: "送出訊息" }).click();
  await expect(page.getByRole("heading", { name: "訊息已送出" })).toBeVisible();

  await page.goto("/admin/");
  await page.locator("#admin-email").fill("preview@example.org");
  await page.getByRole("button", { name: "寄送登入連結" }).click();
  await page.goto("/admin/inbox.html");
  await expect(page.locator("[data-message-list]")).toContainText("調查問題");
  await page.locator("[data-open-message]").click();
  await expect(page.locator("[data-message-detail]")).toContainText("想請問問卷的填答截止時間");
  await page.locator("[data-message-status]").selectOption("replied");
  await expect(page.locator("[data-message-list]")).toContainText("已回覆");

  await page.goto("/admin/content.html");
  await expect(page.locator('[name="home.announcement"]')).toBeVisible();
  await page.locator('[name="home.announcement"]').fill("測試公告已更新");
  await page.locator("[data-save-content]").click();
  await expect(page.locator(".toast")).toContainText("網站內容已儲存");
  await page.goto("/");
  await expect(page.locator('[data-content-key="home.announcement"]')).toHaveText("測試公告已更新");
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("admin demo login, dashboard, builder and analytics work", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.context().addInitScript(() => {
    window.print = () => { document.documentElement.dataset.printInvoked = "true"; };
  });
  await page.goto("/admin/");
  await page.locator("#admin-email").fill("preview@example.org");
  await page.getByRole("button", { name: "寄送登入連結" }).click();
  await expect(page).toHaveURL(/admin\/dashboard(?:\.html)?/);
  await expect(page.getByRole("heading", { name: "所有調查" })).toBeVisible();
  await expect(page.locator("[data-form-table] tr")).toHaveCount(3);
  await expectNoHorizontalOverflow(page);

  await page.goto("/admin/builder.html?id=f8a7b8c9-d0e1-4f2a-9b3c-4d5e6f708192");
  await expect(page.locator('input[name="title"]')).toHaveValue("校園教學正常化實況調查");
  const firstBranchingEditor = page.locator('[data-field-index="0"] [data-branching-editor]');
  await firstBranchingEditor.locator("summary").click();
  await firstBranchingEditor.locator("[data-branch-action]").first().selectOption("jump");
  await expect(firstBranchingEditor.locator("[data-branch-target]").first()).toBeVisible();
  await expect(firstBranchingEditor.locator("[data-branch-target]").first()).toHaveValue("area");
  const before = await page.locator("[data-field-index]").count();
  await page.locator("[data-new-field-type]").selectOption("section");
  await page.locator("[data-add-field]").click();
  await expect(page.locator("[data-field-index]")).toHaveCount(before + 1);
  await expect(page.locator("[data-field-index]").last()).toHaveClass(/field-editor--section/);
  await expect(page.locator("[data-field-count]")).toContainText("1 區段");
  await expectNoHorizontalOverflow(page);
  await expect(page.locator("[data-print-form]")).toBeEnabled();
  const [printPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator("[data-print-form]").click(),
  ]);
  await expect(printPage).toHaveURL(/adminPrint=1/);
  await expect(printPage.locator("[data-admin-print-preview]")).toBeVisible();
  await expect(printPage.locator("[data-password-gate], [data-consent-card], [data-submit]")).toHaveCount(0);
  await expect(printPage.locator("html")).toHaveAttribute("data-print-invoked", "true");
  await printPage.close();

  await page.goto("/admin/responses.html?form=f8a7b8c9-d0e1-4f2a-9b3c-4d5e6f708192");
  await expect(page.locator("[data-chart-grid] canvas").first()).toBeVisible();
  await page.locator("[data-stage-filter]").selectOption({ label: "國中" });
  await expect(page.locator("[data-filter-result]")).toContainText("4 / 8");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "匯出 Excel" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^normal-teaching-2026-responses-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const workbookBytes = fs.readFileSync(await download.path());
  expect([...workbookBytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  expect(workbookBytes.length).toBeGreaterThan(5000);
  await expect(page.locator(".toast")).toContainText("已匯出 4 份回應");
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
