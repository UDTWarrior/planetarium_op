const { test, expect } = require("@playwright/test");

const title = "إضاءة الطوارئ والسلم";
const omission = "> إضاءة الطوارئ والسلم مش في قايمة الإغلاق بالدوك — سايبها زي ما هي";

for (const file of ["index.html", "classic.html"]) {
  test(`${file}: shutdown includes the lighting review before returning keys`, async ({ page }) => {
    await page.goto("./" + file);
    await page.locator('[data-mode="stop"]').click();
    await expect(page.locator(".group").filter({ hasText: "6 · " + title })).toHaveCount(1);
    await expect(page.locator(".group").last()).toHaveText("7 · المفاتيح");
    await expect(page.locator('img[src="images/reference-09.webp"]')).toHaveCount(1);
    for (const text of ["راجع نور الطوارئ: قاطع 4 و 5", "راجع نور السلم: قاطع 6 و 9"]) {
      await expect(page.getByRole("checkbox").filter({ hasText: text })).toHaveAttribute("aria-checked", "false");
    }
    await expect(page.locator(".note").filter({ hasText: "إجراء الموقع المعتمد" })).toHaveCount(1);
    await expect(page.locator(".note").filter({ hasText: "سايبها زي ما هي" })).toHaveCount(0);
    await page.locator("#editBtn").click();
    expect(await page.locator("#editorText").inputValue()).toContain("# 6 · " + title);
  });

  for (const interiorLightingRemoved of [false, true]) {
    test(`${file}: default progress migrates with interiorLightingRemoved=${interiorLightingRemoved}`, async ({ page }) => {
      await page.addInitScript(interiorLightingRemoved => {
        if (localStorage.getItem("qubba.prog.v2")) return;
        const stop = Array(29).fill(false);
        stop[19] = true;
        stop[27] = true;
        if (!interiorLightingRemoved) stop.splice(13, 0, false, true, false);
        localStorage.setItem("qubba.prog.v2", JSON.stringify({ stop, interiorLightingRemoved }));
      }, interiorLightingRemoved);
      for (const target of [file, file === "index.html" ? "classic.html" : "index.html"]) {
        await page.goto("./" + target);
        await page.locator('[data-mode="stop"]').click();
        await expect(page.getByRole("checkbox").filter({ hasText: "إضاءة المدخل: قاطع 15 و 16" })).toHaveAttribute("aria-checked", "true");
        await expect(page.getByRole("checkbox").filter({ hasText: "رجّع مفاتيح القبة" })).toHaveAttribute("aria-checked", "true");
        await expect(page.getByRole("checkbox").filter({ hasText: "رجّع مفتاح المكتب" })).toHaveAttribute("aria-checked", "false");
        await expect(page.getByRole("checkbox").filter({ hasText: "راجع نور الطوارئ" })).toHaveAttribute("aria-checked", "false");
        await expect(page.getByRole("checkbox").filter({ hasText: "راجع نور السلم" })).toHaveAttribute("aria-checked", "false");
        await expect(page.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(2);
      }
    });
  }

  test(`${file}: saved lists gain the section without resetting or duplicating checks`, async ({ page }) => {
    await page.addInitScript(omission => {
      if (localStorage.getItem("qubba.steps.v2")) return;
      localStorage.setItem("qubba.steps.v2", JSON.stringify({
        stop: ["# 5 · الإضاءة الخارجية", "Custom before", omission, "!images/reference-02.webp", "", "# 6 · المفاتيح", "Custom after"].join("\r\n"),
        shows: "My show"
      }));
      localStorage.setItem("qubba.prog.v2", JSON.stringify({ stop: [false, true, false, false, false, true], interiorLightingRemoved: true }));
    }, omission);
    for (const target of [file, file === "index.html" ? "classic.html" : "index.html"]) {
      await page.goto("./" + target);
      await page.locator('[data-mode="stop"]').click();
      await expect(page.locator(".group").filter({ hasText: "6 · " + title })).toHaveCount(1);
      await expect(page.locator(".group").last()).toHaveText("7 · المفاتيح");
      expect(await page.getByRole("checkbox").evaluateAll(steps => steps.map(step => step.getAttribute("aria-checked")))).toEqual(["true", "false", "false", "true"]);
      await expect(page.locator('img[src="images/reference-02.webp"]')).toHaveCount(1);
      const edits = await page.evaluate(() => JSON.parse(localStorage.getItem("qubba.steps.v2")));
      expect(edits.stop).not.toContain("سايبها زي ما هي");
      expect(edits.shows).toBe("My show");
    }
  });
}
