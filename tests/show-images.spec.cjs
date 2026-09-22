const { test, expect } = require("@playwright/test");

const replacements = [
  "Shows_Trailers", "Shows_scriptvisits", "Shows_Arabic", "Shows_English", "Shows_Trailers"
].map(name => "images/" + name + ".webp");

for (const file of ["index.html", "classic.html"]) {
  test(`${file}: shows use the replacement images`, async ({ page }) => {
    await page.goto("./" + file);
    await page.locator('[data-mode="shows"]').click();
    const expected = [...replacements];
    expected.splice(2, 0, "images/reference-14.webp");
    expect(await page.locator(".shot").evaluateAll(images => images.map(image => image.getAttribute("src")))).toEqual(expected);
    await page.locator(".shot").evaluateAll(async images => {
      await Promise.all(images.map(image => { image.loading = "eager"; return image.decode(); }));
    });
  });

  test(`${file}: saved image paths upgrade without losing custom content or progress`, async ({ page }) => {
    const original = [
      "# Custom", "My checked step", "!images/reference-12.webp",
      "!./images/reference-13.webp", "!images/reference-15.webp",
      "  !images/reference-16.webp  ", "!images/reference-17.webp",
      "> Keep this note", "!images/reference-14.webp"
    ].join("\r\n");
    await page.addInitScript(original => {
      if (localStorage.getItem("qubba.steps.v2")) return;
      localStorage.setItem("qubba.steps.v2", JSON.stringify({ start: original }));
      localStorage.setItem("qubba.prog.v2", JSON.stringify({ start: [false, true] }));
    }, original);
    await page.goto("./" + file);
    const expected = [...replacements, "images/reference-14.webp"];
    expect(await page.locator(".shot").evaluateAll(images => images.map(image => image.getAttribute("src")))).toEqual(expected);
    await expect(page.locator("#domeCount")).toHaveText("1/1");
    await expect(page.locator(".note")).toHaveText("Keep this note");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("qubba.steps.v2")).start);
    expect(saved.split("\r\n")).toHaveLength(original.split("\r\n").length);
    expect(saved).toContain("  !images/Shows_English.webp  ");
    expect(saved).not.toMatch(/reference-(12|13|15|16|17)\.webp/);
    await page.reload();
    await expect(page.locator("#domeCount")).toHaveText("1/1");
    expect(await page.locator(".shot").evaluateAll(images => images.map(image => image.getAttribute("src")))).toEqual(expected);
  });
}
