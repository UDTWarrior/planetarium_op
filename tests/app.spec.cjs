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
  await expect(first).toHaveAttribute("aria-checked", "true");
  await page.locator("#resetBtn").click();
  await expect(first).toHaveAttribute("aria-checked", "false");
  await first.click();
  await page.locator("#editBtn").click();
  expect((await page.locator("#editorText").inputValue()).length).toBeLessThan(10000);
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
