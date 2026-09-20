const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

function watchPageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

test("homepage and survey directory render", async ({ page }, testInfo) => {
  const errors = watchPageErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("新竹縣");
  await expect(page.locator(".hero__image")).toHaveJSProperty("complete", true);
  await expect(page.locator("[data-home-surveys] .survey-card")).toHaveCount(2);
  await expect(page.locator(".pathways a")).toHaveCount(3);
  await expect(page.locator(".pathways a").first()).toHaveAttribute("href", /surveys/);
  await expect(page.locator("[data-reveal]").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  if (testInfo.project.name === "mobile") {
    await page.locator("[data-menu-toggle]").click();
    await expect(page.locator("[data-mobile-menu]")).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/menu-open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-mobile-menu]")).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/menu-open/);
  }

  await page.goto("/surveys");
  await expect(page.getByRole("heading", { name: "兒少議題調查中心" })).toBeVisible();
  await expect(page.locator(".site-nav .nav-cta")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.locator("[data-survey-list] .survey-card")).toHaveCount(2);
  await expect(page.locator("[data-survey-list] .survey-card__index")).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("editorial design tokens and responsive layouts remain consistent", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 242, 230)");
  await expect(page.locator(".hero__actions .button").first()).toHaveCSS("border-top-width", "2px");
  await expect(page.locator(".hero__actions .button").first()).toHaveCSS("box-shadow", /rgba?\(47, 40, 32/);

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const pathname of [
      "/",
      "/surveys",
      "/surveys/normal-teaching-2026",
      "/team.html",
      "/rights.html",
      "/proposals.html",
      "/contact",
      "/terms",
      "/admin/",
    ]) {
      await page.goto(pathname);
      await expectNoHorizontalOverflow(page);
    }
  }
});

test("static pages expose canonical, social, and structured SEO metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index,follow,max-image-preview:large");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://hcccr.bond/");
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", "https://hcccr.bond/feed.xml");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://hcccr.bond/assets/social-preview.jpg");
  const homepageStructured = await page.locator('script[type="application/ld+json"]').textContent();
  const homepageGraph = JSON.parse(homepageStructured)["@graph"];
  expect(homepageGraph.find((item) => item["@type"] === "Organization").alternateName).toEqual(expect.arrayContaining([
    "新竹縣兒少代表",
    "新竹縣兒童及少年諮詢代表",
    "竹縣兒少代表團",
    "兒少代表",
  ]));
  expect(homepageGraph.find((item) => item["@type"] === "Organization").knowsAbout).toEqual(expect.arrayContaining([
    "新竹縣兒少權益",
    "兒少公共參與",
    "兒童權利公約",
  ]));
  await expect(page).toHaveTitle(/新竹縣兒少諮詢代表/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /新竹縣政府社會處/);

  for (const [pathname, canonical] of [
    ["/surveys", "https://hcccr.bond/surveys.html"],
    ["/team.html", "https://hcccr.bond/team.html"],
    ["/rights.html", "https://hcccr.bond/rights.html"],
    ["/proposals.html", "https://hcccr.bond/proposals.html"],
    ["/contact", "https://hcccr.bond/contact.html"],
    ["/terms", "https://hcccr.bond/terms.html"],
  ]) {
    await page.goto(pathname);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", "https://hcccr.bond/feed.xml");
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
    expect(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())["@graph"]).toBeTruthy();
  }
});

test("robots, sitemap, and RSS discovery files are valid public endpoints", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Sitemap: https://hcccr.bond/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  const feed = await request.get("/feed.xml");
  expect(feed.ok()).toBe(true);
  const feedXml = await feed.text();
  expect(feedXml).toContain('<rss version="2.0"');
  expect(feedXml).toContain('<atom:link href="https://hcccr.bond/feed.xml" rel="self" type="application/rss+xml"/>');
  expect(feedXml).not.toContain("public_password");
});

test("survey and admin indexing follows the publication boundary", async ({ page }) => {
  await page.goto("/surveys/normal-teaching-2026");
  await expect(page.getByRole("heading", { name: "校園教學正常化實況調查" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index,follow,max-image-preview:large");
  const publicCanonical = await page.evaluate(() => `${window.APP_CONFIG.siteUrl}/survey-detail.html?id=normal-teaching-2026`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", publicCanonical);
  const surveyStructured = JSON.parse(await page.locator("[data-seo-structured]").textContent());
  expect(surveyStructured["@graph"].find((item) => item["@type"] === "WebPage").name).toContain("校園教學正常化實況調查");

  await page.goto("/surveys/school-lunch-2026");
  await expect(page.locator("[data-password-gate]")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");

  await page.goto("/surveys/representative-preview");
  await expect(page.getByRole("heading", { name: "兒少代表內部測試問卷" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");

  await page.goto("/surveys/not-a-real-survey");
  await expect(page.getByRole("heading", { name: "找不到這份調查" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");

  await page.goto("/admin/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");

  await page.goto("/message-thread.html");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");

  await page.goto("/team-member.html");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
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
  await expect(page.locator("[data-message-list]")).toContainText("等待對方回覆");

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
  await expect(page.locator(".dashboard-overview")).toBeVisible();
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
