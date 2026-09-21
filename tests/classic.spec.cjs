const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

test("classic keeps the previous layout with current photos and matching checklist order", async ({ page }) => {
  const defaults = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8")
    .match(/var DEF = [\s\S]*?(?=  var K_STEPS=)/)[0];
  expect(defaults("classic.html")).toBe(defaults("index.html"));
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./classic.html");
  await expect(page).toHaveTitle(/الواجهة السابقة/);
  await expect(page.locator("#nextBtn")).toHaveCount(0);
  expect((await page.locator(".dome").boundingBox()).width).toBeCloseTo(290, 0);
  for (const mode of ["start", "stop", "shows"]) {
    await page.locator(`[data-mode="${mode}"]`).click();
    const images = await page.locator(".shot").evaluateAll(async images => {
      return Promise.all(images.map(async image => {
        image.loading = "eager";
        await image.decode();
        return image.getAttribute("src").startsWith("images/") && image.naturalWidth > 0;
      }));
    });
    expect(images.length).toBeGreaterThan(0);
    expect(images.every(Boolean)).toBe(true);
    const picture = await page.locator(".shot").first().boundingBox();
    const list = await page.locator("#list").boundingBox();
    expect(picture.width).toBeCloseTo(list.width, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const manifest = await (await page.request.get("./manifest-classic.webmanifest")).json();
  expect(manifest.start_url).toBe("./classic.html");
  expect(manifest.id).toBe("./classic.html");
  expect(errors).toEqual([]);
});

test("both interfaces share progress and edits without losing images", async ({ page }) => {
  await page.goto("./classic.html");
  await page.getByRole("checkbox").first().click();
  const imageCount = await page.locator(".shot").count();
  await page.locator("#editBtn").click();
  expect((await page.locator("#editorText").inputValue()).length).toBeLessThan(10000);
  await page.locator("#saveBtn").click();
  await expect(page.locator(".shot")).toHaveCount(imageCount);
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await page.locator(".version-link a").click();
  await expect(page.locator("#nextBtn")).toBeVisible();
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await page.locator("#editBtn").click();
  await page.locator("#editorText").fill("# Shared list\nShared instruction\n!images/reference-10.webp");
  await page.locator("#saveBtn").click();
  await page.getByRole("checkbox").first().click();
  await page.locator(".device-help summary").click();
  await page.locator('a[href="./classic.html"]').click();
  await expect(page).toHaveTitle(/الواجهة السابقة/);
  await expect(page.getByRole("checkbox").first()).toContainText("Shared instruction");
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".shot")).toHaveAttribute("src", "images/reference-10.webp");
});

test("offline classic navigation does not fall back to the redesigned page", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Offline service worker navigation is checked in Chromium.");
  await page.goto("./");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.goto("./classic.html?offline-check=1");
  await expect(page).toHaveTitle(/الواجهة السابقة/);
  await expect(page.locator("#nextBtn")).toHaveCount(0);
  expect(await page.locator(".shot").first().evaluate(async image => {
    image.loading = "eager";
    await image.decode();
    return image.naturalWidth;
  })).toBeGreaterThan(0);
  await page.getByRole("checkbox").first().click();
  await page.reload();
  await expect(page).toHaveTitle(/الواجهة السابقة/);
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await page.locator(".version-link a").click();
  await expect(page.locator("#nextBtn")).toBeVisible();
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
});
