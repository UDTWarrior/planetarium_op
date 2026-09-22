const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

test("photo captions are bold and readable in both themes on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("./");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
    const caption = page.locator(".photo span").first();
    await expect(caption).toHaveText("صورة مرجعية · اضغط للتكبير");
    const appearance = await caption.evaluate(element => {
      const style = getComputedStyle(element);
      const background = getComputedStyle(element.closest(".photo")).backgroundColor;
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
        .map(value => value / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      const a = luminance(style.color), b = luminance(background);
      return { weight: style.fontWeight, size: style.fontSize,
        contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
    expect(appearance.weight).toBe("700");
    expect(appearance.size).toBe("14px");
    expect(appearance.contrast).toBeGreaterThan(7);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("saved checklists replace original embedded photos without losing edits or progress", async ({ page }) => {
  const legacy = "data:image/webp;base64," + fs.readFileSync(path.join(__dirname, "fixtures/legacy-reference-10.webp")).toString("base64");
  const custom = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "../icons/icon-192.png")).toString("base64");
  await page.addInitScript(({ legacy, custom }) => {
    if (localStorage.getItem("qubba.steps.v2")) return;
    localStorage.setItem("qubba.steps.v2", JSON.stringify({ start: "# Custom list\nMy first step\n!" + legacy + "\nMy second step\n!" + custom }));
    localStorage.setItem("qubba.prog.v2", JSON.stringify({ start: [false, true] }));
  }, { legacy, custom });
  await page.goto("./");
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("checkbox").first()).toContainText("My first step");
  await expect(page.locator(".shot").first()).toHaveAttribute("src", "images/reference-10.webp");
  await expect(page.locator(".shot").nth(1)).toHaveAttribute("src", custom);
  expect(await page.evaluate(() => localStorage.getItem("qubba.steps.v2"))).not.toContain(legacy);
  await page.locator("#editBtn").click();
  expect(await page.locator("#editorText").inputValue()).not.toContain("base64,");
  await page.locator("#saveBtn").click();
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".shot").first()).toHaveAttribute("src", "images/reference-10.webp");
  await expect(page.locator(".shot").nth(1)).toHaveAttribute("src", custom);
});

test("edited photos load from disk with alpha intact and no painted thumbnail background", async ({ page }) => {
  await page.goto("./");
  const transparentFiles = [];
  for (const mode of ["start", "stop", "shows"]) {
    await page.locator(`[data-mode="${mode}"]`).click();
    const results = await page.locator(".shot").evaluateAll(async images => {
      return Promise.all(images.map(async image => {
        image.loading = "eager";
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let hasAlpha = false;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] < 255) { hasAlpha = true; break; }
        }
        return { src: image.getAttribute("src"), background: getComputedStyle(image).backgroundColor, hasAlpha };
      }));
    });
    for (const result of results) {
      expect(result.src).toMatch(/^images\/(?:reference-\d{2}|Shows_(?:Trailers|scriptvisits|Arabic|English))\.webp$/);
      expect(result.background).toBe("rgba(0, 0, 0, 0)");
      if (result.hasAlpha) transparentFiles.push(result.src);
    }
  }
  expect(transparentFiles).toContain("images/reference-10.webp");
  expect(transparentFiles).toContain("images/Shows_Trailers.webp");
  await page.locator('.photo:has(img[src="images/Shows_scriptvisits.webp"])').click();
  await expect(page.locator("#fullImage")).toHaveAttribute("src", /\/images\/Shows_scriptvisits\.webp$/);
});

test("online image edits replace stale offline copies", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Service worker cache replacement is checked in Chromium.");
  await page.goto("./");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.evaluate(async () => {
    const name = (await caches.keys()).find(key => key.startsWith("planetarium-op-"));
    const cache = await caches.open(name);
    await cache.put(new URL("images/reference-01.webp", location.href), new Response("stale image"));
  });
  await page.reload();
  const result = await page.evaluate(async () => {
    const url = new URL("images/reference-01.webp", location.href);
    const response = await fetch(url);
    const fresh = new Uint8Array(await response.arrayBuffer());
    const cached = new Uint8Array(await (await caches.match(url)).arrayBuffer());
    return { signature: String.fromCharCode(...fresh.slice(0, 4)), equal: fresh.length === cached.length && fresh.every((byte, i) => byte === cached[i]) };
  });
  expect(result).toEqual({ signature: "RIFF", equal: true });
});
