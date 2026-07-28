import { expect, test } from "@playwright/test";

async function fillValidForm(page) {
  const form = page.locator("[data-contact-form]");
  await form.locator('[name="firstName"]').fill("Claire");
  await form.locator('[name="lastName"]').fill("Martin");
  await form.locator('[name="email"]').fill("claire@example.test");
  await form.locator('[name="preferredContact"]').selectOption("email");
  await form
    .locator('[name="message"]')
    .fill(
      "Je souhaite organiser une visite sans transmettre de donnée médicale.",
    );
  await form.locator('[name="privacyAccepted"]').check();
  return form;
}

async function mockContactResponse(page, { body, status = 200 }) {
  await page.route("**/api/contact", async (route) => {
    await route.fulfill({
      body: JSON.stringify(body),
      contentType: "application/json",
      status,
    });
  });
}

test("le succès confirme la référence et conserve les valeurs", async ({
  page,
}) => {
  await mockContactResponse(page, { body: { ok: true }, status: 202 });
  await page.goto("/fr/contact-visite/");
  const form = await fillValidForm(page);

  await form.locator('button[type="submit"]').click();

  await expect(form.locator("[data-form-success]")).toBeVisible();
  await expect(form.locator("[data-submission-reference]")).not.toBeEmpty();
  await expect(form.locator('[name="firstName"]')).toHaveValue("Claire");
  await expect(form.locator('[name="message"]')).toHaveValue(
    /organiser une visite/,
  );
});

test("une erreur 422 cible le champ et conserve la saisie", async ({
  page,
}) => {
  await mockContactResponse(page, {
    body: {
      code: "VALIDATION_ERROR",
      fields: { message: "invalid" },
      ok: false,
    },
    status: 422,
  });
  await page.goto("/fr/contact-visite/");
  const form = await fillValidForm(page);

  await form.locator('button[type="submit"]').click();

  await expect(form.locator("[data-form-errors]")).toBeFocused();
  await expect(form.locator('[name="message"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(form.locator('[name="firstName"]')).toHaveValue("Claire");
});

for (const scenario of [
  {
    body: { code: "RATE_LIMITED", ok: false },
    label: "429",
    status: 429,
    text: "Trop de tentatives",
  },
  {
    body: { code: "EMAIL_UNAVAILABLE", ok: false },
    label: "503",
    status: 503,
    text: "n’a pas encore pu être envoyée",
  },
]) {
  test(`une réponse ${scenario.label} reste compréhensible et non destructive`, async ({
    page,
  }) => {
    await mockContactResponse(page, scenario);
    await page.goto("/fr/contact-visite/");
    const form = await fillValidForm(page);

    await form.locator('button[type="submit"]').click();

    await expect(form.locator("[data-form-errors]")).toContainText(
      scenario.text,
    );
    await expect(form.locator('[name="email"]')).toHaveValue(
      "claire@example.test",
    );
  });
}

test("une panne réseau laisse la reprise possible", async ({ page }) => {
  await page.route("**/api/contact", (route) => route.abort("failed"));
  await page.goto("/fr/contact-visite/");
  const form = await fillValidForm(page);

  await form.locator('button[type="submit"]').click();

  await expect(form.locator("[data-form-errors]")).toContainText(
    "n’a pas encore pu être envoyée",
  );
  await expect(form.locator('[name="firstName"]')).toHaveValue("Claire");
  await expect(form.locator('button[type="submit"]')).toBeEnabled();
});
