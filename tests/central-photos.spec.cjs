const { test, expect } = require("@playwright/test");

async function centralPhotos(page) {
  return page.locator(".group").filter({ hasText: /^\d+ · التكييف المركزي$/ }).evaluate(heading => {
    const sources = [];
    for (let next = heading.nextElementSibling; next && !next.classList.contains("group"); next = next.nextElementSibling) {
      const image = next.matches("img") ? next : next.querySelector("img");
      if (image) sources.push(image.getAttribute("src"));
    }
    return sources;
  });
}

for (const file of ["index.html", "classic.html"]) {
  test(`${file}: shutdown contains both central AC references and preserves default progress`, async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem("qubba.prog.v2")) return;
      const stop = Array(34).fill(false);
      stop[14] = true;
      stop[16] = true;
      stop[32] = true;
      localStorage.setItem("qubba.prog.v2", JSON.stringify({
        stop, interiorLightingRemoved: true, stopLightingAdded: true, stopLightingPhotoFirst: true
      }));
    });
    for (const target of [file, file === "index.html" ? "classic.html" : "index.html"]) {
      await page.goto("./" + target);
      await page.locator('[data-mode="stop"]').click();
      expect(await centralPhotos(page)).toEqual(["images/reference-03.webp", "images/reference-04.webp"]);
      await page.locator('img[src="images/reference-03.webp"]').evaluate(image => image.decode());
      for (const text of ["اضغط الزر الدائري واختر Preselection", "افصل كابل الشاشة", "رجّع مفاتيح القبة"]) {
        await expect(page.getByRole("checkbox").filter({ hasText: text })).toHaveAttribute("aria-checked", "true");
      }
      await expect(page.getByRole("checkbox").filter({ hasText: "لف الزر الدائري لحد OFF" })).toHaveAttribute("aria-checked", "false");
      await expect(page.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(3);
    }
    await page.locator("#editBtn").click();
    await page.locator("#saveBtn").click();
    await page.reload();
    await page.locator('[data-mode="stop"]').click();
    expect(await centralPhotos(page)).toHaveLength(2);
  });

  for (const alreadyPresent of [false, true]) {
    test(`${file}: saved central reference migration is idempotent, alreadyPresent=${alreadyPresent}`, async ({ page }) => {
      await page.addInitScript(alreadyPresent => {
        if (localStorage.getItem("qubba.steps.v2")) return;
        const lines = ["# 4 · التكييف المركزي", "Custom checked", "> Keep note", "Custom unchecked", "!images/reference-04.webp", "# 5 · Next", "Another checked"];
        const stop = [false, true, false, false, false, false, true];
        if (alreadyPresent) {
          lines.splice(1, 0, "!images/reference-03.webp");
          stop.splice(1, 0, false);
        }
        localStorage.setItem("qubba.steps.v2", JSON.stringify({ stop: lines.join("\r\n"), start: "My startup" }));
        localStorage.setItem("qubba.prog.v2", JSON.stringify({
          stop, interiorLightingRemoved: true, stopLightingAdded: true, stopLightingPhotoFirst: true
        }));
      }, alreadyPresent);
      for (const target of [file, file === "index.html" ? "classic.html" : "index.html"]) {
        await page.goto("./" + target);
        await page.locator('[data-mode="stop"]').click();
        expect(await centralPhotos(page)).toEqual(["images/reference-03.webp", "images/reference-04.webp"]);
        expect(await page.getByRole("checkbox").evaluateAll(steps => steps.map(step => step.getAttribute("aria-checked")))).toEqual(["true", "false", "true"]);
        await expect(page.locator(".note")).toHaveText("Keep note");
        const edits = await page.evaluate(() => JSON.parse(localStorage.getItem("qubba.steps.v2")));
        expect(edits.start).toBe("My startup");
        expect(edits.stop.match(/reference-03\.webp/g)).toHaveLength(1);
      }
    });
  }
}
