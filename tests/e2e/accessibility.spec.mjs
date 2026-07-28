import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  { locale: "de", path: "/de/" },
  { locale: "fr", path: "/fr/" },
  { locale: "de", path: "/de/kontakt-besichtigung/" },
  { locale: "fr", path: "/fr/contact-visite/" },
];

for (const { locale, path } of pages) {
  test(`axe WCAG 2.2 AA — ${locale} ${path}`, async ({ page }, testInfo) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    await testInfo.attach(`axe-${locale}.json`, {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });
    expect(results.violations).toEqual([]);
  });
}
