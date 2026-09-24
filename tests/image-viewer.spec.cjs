const { test, expect } = require("@playwright/test");

test("clicking or tapping outside the reference image closes it and restores focus", async ({ page, isMobile }) => {
  await page.goto("./");
  const photo = page.locator(".photo").first();
  const viewer = page.locator("#imageViewer");
  const press = async (x, y) => {
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };
  for (const area of ["backdrop", "padding", "toolbar"]) {
    await photo.click();
    await page.locator("#fullImage").evaluate(image => image.decode());
    const bounds = await viewer.boundingBox();
    if (area === "backdrop") {
      await press(2, 2);
    } else if (area === "padding") {
      await press(bounds.x + 4, bounds.y + bounds.height / 2);
    } else {
      await page.locator("#imageTitle").click();
    }
    await expect(viewer).not.toBeVisible();
    await expect(photo).toBeFocused();
  }
});

test("image and zoom interactions stay open while close and Escape still work", async ({ page }) => {
  await page.goto("./");
  const photo = page.locator(".photo").first();
  const viewer = page.locator("#imageViewer");
  await photo.click();
  await page.locator("#fullImage").click();
  await expect(viewer).toBeVisible();
  await page.locator("#zoomImage").click();
  await expect(page.locator("#zoomImage")).toHaveAttribute("aria-pressed", "true");
  await expect(viewer).toBeVisible();
  const image = await page.locator("#fullImage").boundingBox();
  await page.mouse.move(image.x + 10, image.y + 10);
  await page.mouse.down();
  await page.mouse.move(2, 2, { steps: 5 });
  await page.mouse.up();
  await expect(viewer).toBeVisible();
  await page.locator("#closeImage").click();
  await expect(viewer).not.toBeVisible();
  await expect(photo).toBeFocused();
  await photo.click();
  await expect(page.locator("#zoomImage")).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await expect(viewer).not.toBeVisible();
  await expect(photo).toBeFocused();
});
