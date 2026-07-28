import { expect, test } from "@playwright/test";

test("le lien d’évitement place le focus sur le contenu", async ({ page }) => {
  await page.goto("/fr/");
  await page.keyboard.press("Tab");

  const skipLink = page.locator(".skip-link");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("le menu mobile gère focus, Échap et restauration", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/de/");

  const toggle = page.locator("[data-menu-toggle]");
  const menu = page.locator("[data-menu]");
  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toHaveAttribute("data-open", "");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const navigation = document.querySelector("[data-menu]");
        return Boolean(navigation?.contains(document.activeElement));
      }),
    )
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("une FAQ reste explicite au clavier", async ({ page }) => {
  await page.goto("/de/faq/");
  const toggle = page.locator("[data-faq-toggle]").first();
  const answerId = await toggle.getAttribute("aria-controls");
  const answer = page.locator(`#${answerId}`);

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(answer).toBeHidden();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(answer).toBeVisible();
});

test("le sélecteur de langue conserve la route équivalente", async ({
  page,
}) => {
  await page.goto("/de/kontakt-besichtigung/");
  await page.locator(".header-actions [data-language-choice]").click();
  await expect(page).toHaveURL(/\/fr\/contact-visite\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("le mode mouvement réduit neutralise les transitions longues", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fr/");

  const durations = await page
    .locator(".button")
    .first()
    .evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(",")
        .map((duration) =>
          duration.endsWith("ms")
            ? Number.parseFloat(duration) / 1000
            : Number.parseFloat(duration),
        ),
    );
  expect(Math.max(...durations)).toBeLessThanOrEqual(0.001);
});

const reflowRoutes = {
  de: ["/de/", "/de/kontakt-besichtigung/"],
  fr: ["/fr/", "/fr/contact-visite/"],
};

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
  for (const [locale, paths] of Object.entries(reflowRoutes)) {
    for (const path of paths) {
      test(`aucun débordement à ${width}px en ${locale} sur ${path}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: width < 768 ? 900 : 1080 });
        await page.goto(path);

        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(
          dimensions.clientWidth + 1,
        );
      });
    }
  }
}
