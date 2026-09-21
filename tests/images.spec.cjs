const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

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
      expect(result.src).toMatch(/^images\/reference-\d{2}\.webp$/);
      expect(result.background).toBe("rgba(0, 0, 0, 0)");
      if (result.hasAlpha) transparentFiles.push(result.src);
    }
  }
  for (const number of [10, 13, 15, 16]) expect(transparentFiles).toContain(`images/reference-${number}.webp`);
  await page.locator('.photo:has(img[src="images/reference-13.webp"])').click();
  await expect(page.locator("#fullImage")).toHaveAttribute("src", /\/images\/reference-13\.webp$/);
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
