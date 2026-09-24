const { test, expect } = require("@playwright/test");

async function expectPhotoFirst(page) {
  const heading = page.locator(".group").filter({ hasText: /^\d+ · الإضاءة الخارجية$/ });
  expect(await heading.evaluate(element => {
    const next = element.nextElementSibling;
    const image = next.matches("img") ? next : next.querySelector("img");
    return image && image.getAttribute("src");
  })).toBe("images/reference-02.webp");
}

for (const file of ["index.html", "classic.html"]) {
  test(`${file}: shutdown photo is first without changing the instruction order`, async ({ page }) => {
    await page.goto("./" + file);
    await expectPhotoFirst(page);
    await page.locator('[data-mode="stop"]').click();
    await expectPhotoFirst(page);
    const steps = await page.getByRole("checkbox").allTextContents();
    const lighting = steps.filter(text => /قاطع/.test(text) && !text.includes("راجع"));
    expect(lighting.map(text => text.replace(/^[^\p{L}]+/u, "").trim())).toEqual([
      "إضاءة المدخل: قاطع 15 و 16", "الكاونتر: قاطع 2", "اللوح على الجانبين: قاطع 6 و 8",
      "الهالوجين: قاطع 1 و 3 و 4", "الممرات: قاطع 7 و 18"
    ]);
    await page.locator("#editBtn").click();
    expect(await page.locator("#editorText").inputValue()).toMatch(/# 5 · الإضاءة الخارجية\n!صورة \d+\nإضاءة المدخل/);
  });

  test(`${file}: moving the default photo preserves checked instructions across interfaces`, async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem("qubba.prog.v2")) return;
      const stop = Array(34).fill(false);
      stop[19] = true;
      stop[23] = true;
      stop[32] = true;
      localStorage.setItem("qubba.prog.v2", JSON.stringify({ stop, interiorLightingRemoved: true, stopLightingAdded: true }));
    });
    for (const target of [file, file === "index.html" ? "classic.html" : "index.html"]) {
      await page.goto("./" + target);
      await page.locator('[data-mode="stop"]').click();
      await expectPhotoFirst(page);
      for (const text of ["إضاءة المدخل", "الممرات", "رجّع مفاتيح القبة"]) {
        await expect(page.getByRole("checkbox").filter({ hasText: text })).toHaveAttribute("aria-checked", "true");
      }
      await expect(page.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(3);
    }
  });

  test(`${file}: saved photo moves with its progress slot and leaves custom text intact`, async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem("qubba.steps.v2")) return;
      localStorage.setItem("qubba.steps.v2", JSON.stringify({
        stop: "# 5 · الإضاءة الخارجية\r\nCustom checked\r\n> My note\r\nCustom unchecked\r\n!images/reference-02.webp\r\n# 6 · Next\r\nAnother checked",
        start: "Untouched startup"
      }));
      localStorage.setItem("qubba.prog.v2", JSON.stringify({
        stop: [false, true, false, false, false, false, true], interiorLightingRemoved: true, stopLightingAdded: true
      }));
    });
    for (const target of [file, file === "index.html" ? "classic.html" : "index.html"]) {
      await page.goto("./" + target);
      await page.locator('[data-mode="stop"]').click();
      await expectPhotoFirst(page);
      expect(await page.getByRole("checkbox").evaluateAll(steps => steps.map(step => step.getAttribute("aria-checked")))).toEqual(["true", "false", "true"]);
      await expect(page.locator(".note")).toHaveText("My note");
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("qubba.steps.v2")));
      expect(saved.stop).toContain("# 5 · الإضاءة الخارجية\n!images/reference-02.webp\nCustom checked");
      expect(saved.start).toBe("Untouched startup");
    }
  });
}
