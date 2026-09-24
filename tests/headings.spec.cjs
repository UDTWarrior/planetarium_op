const { test, expect } = require("@playwright/test");

const location = "لوحة الكهرباء في المخزن، على الحائط الشمال وانت داخل";
const ups = "لوحة الكهرباء جوه غرفة الـ UPS، أول لوحة على اليمين";
const style = element => {
  const css = getComputedStyle(element);
  return [css.fontSize, css.fontWeight, css.color, css.padding, css.borderBottom];
};

for (const file of ["index.html", "classic.html"]) {
  test(`${file}: equipment locations use the section heading style`, async ({ page }) => {
    await page.goto(`./${file}`);
    const section = page.locator(".group").filter({ hasText: "3 · التكييف المركزي" });
    for (const title of [location, ups]) {
      const heading = page.locator(".group").filter({ hasText: title });
      await expect(heading).toHaveCount(1);
      await expect(heading).toHaveText(title);
      expect(await heading.evaluate(style)).toEqual(await section.evaluate(style));
    }
    await expect(page.locator("#domeCount")).toHaveText("0/24");
    await page.locator('[data-mode="stop"]').click();
    await expect(page.locator(".note").first()).toContainText("معكوس");
    await page.locator('[data-mode="shows"]').click();
    await expect(page.locator(".note").first()).toContainText("AAST2025ARABICOneTrailer");
  });

  test(`${file}: saved plain and bold location notes upgrade without changing progress`, async ({ page }) => {
    await page.addInitScript(({ location, ups }) => {
      if (localStorage.getItem("qubba.steps.v2")) return;
      localStorage.setItem("qubba.steps.v2", JSON.stringify({
        start: "# Custom\n> <b>" + location + "</b>\nStep one\n> " + ups + "\nStep two\n> Keep my custom note\n!images/reference-10.webp"
      }));
      localStorage.setItem("qubba.prog.v2", JSON.stringify({ start: [false, false, true, false, true] }));
    }, { location, ups });
    await page.goto(`./${file}`);
    await expect(page.locator(".group")).toHaveCount(3);
    await expect(page.locator(".group").nth(1)).toHaveText(location);
    await expect(page.locator(".group").nth(2)).toHaveText(ups);
    await expect(page.locator(".note")).toHaveText("Keep my custom note");
    await expect(page.getByRole("checkbox")).toHaveCount(2);
    await expect(page.locator("#domeCount")).toHaveText("2/2");
    await expect(page.locator(".shot")).toHaveAttribute("src", "images/reference-10.webp");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("qubba.steps.v2")).start);
    expect(saved).toContain("## " + location);
    expect(saved).not.toContain("<b>");
    await page.locator("#editBtn").click();
    await page.locator("#saveBtn").click();
    await page.reload();
    await expect(page.locator("#domeCount")).toHaveText("2/2");
    await expect(page.locator(".group")).toHaveCount(3);
  });
}
