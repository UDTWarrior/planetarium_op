const { test, expect } = require("@playwright/test");

test("clicking or tapping outside the reference image closes it and restores focus", async ({ page, isMobile }) => {
  await page.goto("./");
  const photo = page.locator(".photo").first();
  const viewer = page.locator("#imageViewer");
  const press = async (x, y) => {
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };
  for (const area of ["top", "bottom", "left", "right", "padding", "toolbar"]) {
    await photo.click();
    await page.locator("#fullImage").evaluate(image => image.decode());
    const bounds = await page.locator(".image-viewer-frame").boundingBox();
    const viewport = page.viewportSize();
    const outside = {
      top: [viewport.width / 2, bounds.y / 2],
      bottom: [viewport.width / 2, (bounds.y + bounds.height + viewport.height) / 2],
      left: [bounds.x / 2, viewport.height / 2],
      right: [(bounds.x + bounds.width + viewport.width) / 2, viewport.height / 2]
    }[area];
    if (outside) {
      // Hit a real DOM surface, not a browser-generated dialog backdrop.
      expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, outside)).toBe("imageViewer");
      await press(...outside);
    } else if (area === "padding") {
      await press(bounds.x + 4, bounds.y + bounds.height / 2);
    } else {
      await page.locator("#imageTitle").click();
    }
    await expect(viewer).not.toBeVisible();
    await expect(photo).toBeFocused();
    await expect(page.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(0);
  }
});

test("swipes, cancelled touches and multi-touch do not dismiss the viewer", async ({ page }) => {
  await page.goto("./");
  await page.locator(".photo").first().click();
  const viewer = page.locator("#imageViewer");
  for (const gesture of ["swipe", "cancel", "multi"]) {
    await viewer.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0, clientX: 2, clientY: 2 });
    if (gesture === "swipe") {
      await viewer.dispatchEvent("pointermove", { pointerId: 1, isPrimary: true, clientX: 2, clientY: 50 });
    } else if (gesture === "cancel") {
      await viewer.dispatchEvent("pointercancel", { pointerId: 1 });
    } else {
      await viewer.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch", isPrimary: false, button: 0, clientX: 5, clientY: 5 });
    }
    await viewer.dispatchEvent("pointerup", { pointerId: 1, isPrimary: true, clientX: 2, clientY: 2 });
    await viewer.dispatchEvent("click");
    await expect(viewer).toBeVisible();
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
