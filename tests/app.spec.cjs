const { test, expect } = require("@playwright/test");

test("checklists, pictures, editing and progress work across screen sizes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page).toHaveTitle("قائمة التشغيل الخاصة بالقبة");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("checkbox").first()).toBeVisible();
  await expect(page.locator("#domeCount")).toHaveText(/^0\/\d+$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const first = page.getByRole("checkbox").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(first).toHaveAttribute("aria-checked", "true");
  await page.locator('[data-mode="stop"]').click();
  await expect(first).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(".note").first()).toContainText("معكوس");

  for (const mode of ["start", "stop", "shows"]) {
    await page.locator(`[data-mode="${mode}"]`).click();
    expect(await page.locator(".shot").count()).toBeGreaterThan(0);
    const images = await page.locator(".shot").evaluateAll(async (images) => {
      return Promise.all(images.map(async (image) => {
        image.loading = "eager";
        await image.decode();
        return image.naturalWidth > 0;
      }));
    });
    expect(images.every(Boolean)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  await page.locator('[data-mode="start"]').click();
  await page.locator("#resetBtn").click();
  await expect(page.locator("#confirmDialog")).toBeVisible();
  await expect(first).toHaveAttribute("aria-checked", "true");
  await page.locator("#confirmAccept").click();
  await expect(first).toHaveAttribute("aria-checked", "false");
  await first.click();
  await page.locator("#editBtn").click();
  expect((await page.locator("#editorText").inputValue()).length).toBeLessThan(10000);
  expect(await page.locator("#editorText").evaluate(el => el.scrollTop)).toBe(0);
  expect(await page.locator("#editorText").inputValue()).not.toContain("base64,");
  const imageCount = await page.locator(".shot").count();
  await page.locator("#saveBtn").click();
  await expect(first).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".shot")).toHaveCount(imageCount);
  await page.locator("#editBtn").click();
  await page.locator("#editorText").fill("# تجربة\nخطوة جديدة\nخطوة ثانية");
  await page.locator("#saveBtn").click();
  await expect(page.getByRole("checkbox")).toHaveCount(2);
  await expect(first).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(first).toContainText("خطوة جديدة");
  await page.locator("#themeBtn").click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  expect(errors).toEqual([]);
});

test("navigation and photos support keyboard use without losing focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const first = page.getByRole("checkbox").first();
  await first.focus();
  await first.press("Space");
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute("aria-checked", "true");
  await page.locator("#nextBtn").click();
  await expect(page.getByRole("checkbox").nth(1)).toBeFocused();
  await expect(page.getByRole("checkbox").nth(1)).toHaveAttribute("aria-checked", "false");

  const section = await page.locator("#sectionSelect option").last().getAttribute("value");
  await page.locator("#sectionSelect").selectOption(section);
  await expect(page.locator(`#${section}`)).toBeFocused();
  expect((await page.locator(`#${section}`).boundingBox()).y).toBeGreaterThan(60);

  const photo = page.locator(".photo").last();
  await photo.focus();
  await photo.press("Enter");
  await expect(page.locator("#imageViewer")).toBeVisible();
  expect(await page.locator("#fullImage").evaluate(async image => {
    await image.decode(); return image.naturalWidth;
  })).toBeGreaterThan(0);
  await page.locator("#zoomImage").click();
  await expect(page.locator("#zoomImage")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#imageViewer")).not.toBeVisible();
  await expect(photo).toBeFocused();

  await page.locator("#tab-start").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#tab-stop")).toBeFocused();
  await expect(page.locator("#tab-stop")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#tab-start")).toHaveAttribute("tabindex", "-1");
  await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-stop");
});

test("editor protects drafts and reset is explicitly confirmed", async ({ page }) => {
  await page.goto("./");
  const first = page.getByRole("checkbox").first();
  const original = await first.textContent();
  await first.click();
  await page.locator("#resetBtn").click();
  await expect(page.locator("#confirmCancel")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(first).toHaveAttribute("aria-checked", "true");
  await page.locator("#editBtn").click();
  await page.locator("#editorText").fill("مسودة غير محفوظة");
  await page.keyboard.press("Escape");
  await expect(page.locator("#confirmDialog")).toBeVisible();
  await page.locator("#confirmCancel").click();
  await expect(page.locator("#editorText")).toHaveValue("مسودة غير محفوظة");
  await page.locator("#cancelBtn").click();
  await page.locator("#confirmAccept").click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(page.locator("#editBtn")).toBeFocused();
  await expect(first).toHaveText(original);
  await expect(first).toHaveAttribute("aria-checked", "true");
});

test("small screens and failed saves keep the editor usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator("#editBtn").click();
  await page.locator("#editorText").fill("تعديل للاختبار");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  });
  await page.locator("#saveBtn").click();
  await expect(page.locator("#editor")).toBeVisible();
  await expect(page.locator("#editorText")).toHaveValue("تعديل للاختبار");
  await expect(page.locator("#editorStatus")).toContainText("تعذر الحفظ");
  expect(await page.locator("#editor").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("a fresh device has its own progress", async ({ browser, page }) => {
  await page.goto("./");
  await page.getByRole("checkbox").first().click();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("http://localhost:4173/planetarium_op/");
  await expect(otherPage.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "false");
  await other.close();
});

test("installed shell and images remain usable offline at the repository URL", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Offline network emulation for the service worker is checked in Chromium.");
  await page.goto("./");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.getByRole("checkbox").first().click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await page.locator('[data-mode="shows"]').click();
  const picture = page.locator(".shot").first();
  await picture.scrollIntoViewIfNeeded();
  expect(await picture.evaluate(async (image) => { await image.decode(); return image.naturalWidth; })).toBeGreaterThan(0);
  await expect(page.locator("#offlineStatus")).toContainText("جاهزة");
});
