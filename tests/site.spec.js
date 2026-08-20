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
  const before = await page.locator("[data-field-index]").count();
  await page.locator("[data-add-field]").click();
  await expect(page.locator("[data-field-index]")).toHaveCount(before + 1);
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
