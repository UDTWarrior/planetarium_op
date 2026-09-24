const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const defaults = vm.runInNewContext(source.slice(source.indexOf("var DEF = "), source.indexOf("var K_STEPS")) + ";DEF");
const title = "4 · الإضاءة الداخلية للقبة";

for (const file of ["index.html", "classic.html"]) {
  test(`${file}: removes lighting from both default lists and renumbers sections`, async ({ page }) => {
    await page.goto("./" + file);
    for (const mode of ["start", "stop"]) {
      await page.locator(`[data-mode="${mode}"]`).click();
      await expect(page.locator(".group").filter({ hasText: title })).toHaveCount(0);
      await expect(page.locator('img[src="images/reference-05.webp"]')).toHaveCount(0);
      const numbers = await page.locator(".group").evaluateAll(headings => headings
        .map(heading => heading.textContent.match(/^(\d+) ·/))
        .filter(Boolean).map(match => Number(match[1])));
      expect(numbers).toEqual(Array.from({ length: mode === "start" ? 8 : 7 }, (_, i) => i + 1));
      await page.locator("#editBtn").click();
      expect(await page.locator("#editorText").inputValue()).not.toContain(title);
      await page.locator("#saveBtn").click();
    }
  });

  test(`${file}: default progress stays on the same instructions after migration and reload`, async ({ page }) => {
    const expected = {};
    const oldProgress = { shows: [false, true], stopLightingAdded: true, stopLightingPhotoFirst: true, stopCentralPhotoAdded: true };
    for (const mode of ["start", "stop"]) {
      const lines = defaults[mode].split("\n").filter(line => line.trim());
      const checks = lines.map((line, i) => !/^[#!>]/.test(line) && i % 2 === 0);
      expected[mode] = lines.flatMap((line, i) => /^[#!>]/.test(line) ? [] : [String(checks[i])]);
      oldProgress[mode] = [...checks];
      oldProgress[mode].splice(mode === "start" ? 22 : 13, 0, false, true, false);
    }
    await page.addInitScript(progress => {
      if (!localStorage.getItem("qubba.prog.v2"))
        localStorage.setItem("qubba.prog.v2", JSON.stringify(progress));
    }, oldProgress);
    for (const target of [file, file, file === "index.html" ? "classic.html" : "index.html"]) {
      await page.goto("./" + target);
      for (const mode of ["start", "stop"]) {
        await page.locator(`[data-mode="${mode}"]`).click();
        expect(await page.getByRole("checkbox").evaluateAll(steps => steps.map(step => step.getAttribute("aria-checked")))).toEqual(expected[mode]);
      }
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("qubba.prog.v2")).shows)).toEqual(oldProgress.shows);
    }
  });

  test(`${file}: saved custom lists lose only the retired section and retain progress`, async ({ page }) => {
    const text = ["# 3 · Before", "Keep checked", "", "# " + title,
      "Remove instruction", "## Remove subheading", "!images/reference-05.webp", "",
      "# 5 · After", "Keep unchecked", "> Custom note", "!images/reference-10.webp", "Keep checked too"].join("\r\n");
    await page.addInitScript(text => {
      if (localStorage.getItem("qubba.steps.v2")) return;
      localStorage.setItem("qubba.steps.v2", JSON.stringify({ start: text, stop: text, shows: "Custom show" }));
      localStorage.setItem("qubba.prog.v2", JSON.stringify({
        start: [false, true, false, true, false, false, false, false, false, false, true],
        stop: [false, true, false, true, false, false, false, false, false, false, true],
        shows: [true]
      }));
    }, text);
    for (const target of [file, file === "index.html" ? "classic.html" : "index.html"]) {
      await page.goto("./" + target);
      for (const mode of ["start", "stop"]) {
        await page.locator(`[data-mode="${mode}"]`).click();
        await expect(page.getByRole("checkbox")).toHaveCount(3);
        expect(await page.getByRole("checkbox").evaluateAll(steps => steps.map(step => step.getAttribute("aria-checked")))).toEqual(["true", "false", "true"]);
        await expect(page.locator(".group").last()).toHaveText("4 · After");
        await expect(page.locator(".note")).toHaveText("Custom note");
        await expect(page.locator(".shot")).toHaveAttribute("src", "images/reference-10.webp");
      }
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("qubba.steps.v2")));
      expect(saved.start).not.toContain(title);
      expect(saved.stop).not.toContain("Remove");
      expect(saved.shows).toBe("Custom show");
    }
  });
}
