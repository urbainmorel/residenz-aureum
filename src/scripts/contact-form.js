const copy = {
  de: {
    email: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    generic:
      "Die Anfrage konnte noch nicht gesendet werden. Bitte versuchen Sie es später erneut.",
    invalid: "Bitte prüfen Sie dieses Feld.",
    message: "Bitte schreiben Sie mindestens 20 Zeichen.",
    offline:
      "Es besteht gerade keine Verbindung. Ihre Eingaben bleiben erhalten.",
    phone: "Bitte geben Sie eine gültige Telefonnummer ein.",
    privacy: "Bitte bestätigen Sie die Datenschutzhinweise.",
    rateLimited:
      "Zu viele Versuche. Bitte warten Sie einige Minuten und versuchen Sie es erneut.",
    required: "Bitte füllen Sie dieses Pflichtfeld aus.",
    sending: "Wird sicher gesendet …",
  },
  fr: {
    email: "Saisissez une adresse e-mail valide.",
    generic:
      "La demande n’a pas encore pu être envoyée. Réessayez un peu plus tard.",
    invalid: "Vérifiez ce champ.",
    message: "Écrivez au moins 20 caractères.",
    offline:
      "La connexion est indisponible. Vos informations restent dans le formulaire.",
    phone: "Saisissez un numéro de téléphone valide.",
    privacy: "Confirmez la lecture des informations de confidentialité.",
    rateLimited:
      "Trop de tentatives. Attendez quelques minutes avant de réessayer.",
    required: "Complétez ce champ obligatoire.",
    sending: "Envoi sécurisé en cours…",
  },
};

const allowedIntents = new Set(["general", "visit"]);
const allowedPreferredContacts = new Set(["email", "phone", "none"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const phonePattern = /^[+0-9() ./-]{6,30}$/u;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateContactPayload(payload, locale = "de") {
  const messages = copy[locale] ?? copy.de;
  const values = {
    ...payload,
    email: stringValue(payload.email),
    firstName: stringValue(payload.firstName),
    lastName: stringValue(payload.lastName),
    message: stringValue(payload.message),
    phone: stringValue(payload.phone),
    preferredDate: stringValue(payload.preferredDate),
  };
  const errors = {};

  for (const field of ["firstName", "lastName"]) {
    if (!values[field]) {
      errors[field] = messages.required;
    } else if (values[field].length > 80) {
      errors[field] = messages.invalid;
    }
  }

  if (!values.email) {
    errors.email = messages.required;
  } else if (values.email.length > 254 || !emailPattern.test(values.email)) {
    errors.email = messages.email;
  }

  if (values.phone && !phonePattern.test(values.phone)) {
    errors.phone = messages.phone;
  }

  const preferredContact = stringValue(payload.preferredContact);
  if (!allowedPreferredContacts.has(preferredContact)) {
    errors.preferredContact = messages.required;
  } else if (preferredContact === "phone" && !values.phone) {
    errors.phone = messages.phone;
  }

  if (!allowedIntents.has(stringValue(payload.intent))) {
    errors.intent = messages.required;
  }

  if (values.preferredDate) {
    const today = localIsoDate(new Date());
    if (
      !isoDatePattern.test(values.preferredDate) ||
      values.preferredDate <= today
    ) {
      errors.preferredDate = messages.invalid;
    }
  }

  if (values.message.length < 20 || values.message.length > 3000) {
    errors.message = messages.message;
  }

  const privacyAccepted =
    payload.privacyAccepted === true || payload.privacyAccepted === "true";
  if (!privacyAccepted) {
    errors.privacyAccepted = messages.privacy;
  }

  return {
    errors,
    values: {
      ...values,
      intent: stringValue(payload.intent),
      locale,
      preferredContact,
      privacyAccepted,
    },
  };
}

function formPayload(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function errorTarget(form, name) {
  return form.elements.namedItem(name);
}

function clearErrors(form) {
  form.querySelectorAll("[data-field-error]").forEach((element) => {
    element.textContent = "";
  });
  form.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute("aria-invalid");
  });
  const phoneFallback = form.querySelector("[data-form-phone-fallback]");
  if (phoneFallback) {
    phoneFallback.hidden = true;
  }
}

function showErrors(
  form,
  errors,
  fallbackMessage = "",
  { showPhoneFallback = false } = {},
) {
  clearErrors(form);
  const summary = form.querySelector("[data-form-errors]");
  const list = summary?.querySelector("ul");
  const phoneFallback = form.querySelector("[data-form-phone-fallback]");

  if (!summary || !list) {
    return;
  }

  list.replaceChildren();
  for (const [name, message] of Object.entries(errors)) {
    const target = errorTarget(form, name);
    const control =
      typeof target?.setAttribute === "function" ? target : target?.[0];
    const error = form.querySelector(`[data-field-error="${name}"]`);

    control?.setAttribute("aria-invalid", "true");
    if (error) {
      error.textContent = message;
    }

    const item = document.createElement("li");
    if (control?.id) {
      const link = document.createElement("a");
      link.href = `#${control.id}`;
      link.textContent = message;
      item.append(link);
    } else {
      item.textContent = message;
    }
    list.append(item);
  }

  if (Object.keys(errors).length === 0 && fallbackMessage) {
    const item = document.createElement("li");
    item.textContent = fallbackMessage;
    list.append(item);
  }

  if (phoneFallback) {
    phoneFallback.hidden = !showPhoneFallback;
  }
  summary.hidden = false;
  summary.focus();
}

function ensureSubmissionMetadata(form) {
  const submission = form.querySelector("[data-submission-id]");
  const startedAt = form.querySelector("[data-form-started-at]");

  if (submission && !submission.value) {
    submission.value =
      globalThis.crypto?.randomUUID?.() ??
      `contact-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  if (startedAt && !startedAt.value) {
    startedAt.value = String(Date.now());
  }
}

function serverErrorMessage(code, locale) {
  const messages = copy[locale] ?? copy.de;
  if (code === "RATE_LIMITED") {
    return messages.rateLimited;
  }
  return messages.generic;
}

export function localizeServerFieldErrors(fields, locale = "de") {
  const messages = copy[locale] ?? copy.de;
  const messageByField = {
    email: messages.email,
    firstName: messages.invalid,
    intent: messages.invalid,
    lastName: messages.invalid,
    message: messages.message,
    phone: messages.phone,
    preferredContact: messages.invalid,
    preferredDate: messages.invalid,
    privacyAccepted: messages.privacy,
  };
  return Object.fromEntries(
    Object.keys(fields ?? {})
      .filter((field) => messageByField[field])
      .map((field) => [field, messageByField[field]]),
  );
}

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function submitContactForm(form, payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(form.action, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    return { body, ok: response.ok };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function initContactForms() {
  document.querySelectorAll("[data-contact-form]").forEach((form) => {
    const locale = form.dataset.formLocale === "fr" ? "fr" : "de";
    const messages = copy[locale];
    const submit = form.querySelector('button[type="submit"]');
    const success = form.querySelector("[data-form-success]");
    const summary = form.querySelector("[data-form-errors]");
    const preferredDate = form.elements.namedItem("preferredDate");

    form.noValidate = true;
    ensureSubmissionMetadata(form);
    if (preferredDate instanceof HTMLInputElement) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      preferredDate.min = localIsoDate(tomorrow);
    }

    form.addEventListener("input", (event) => {
      const name = event.target?.name;
      if (!name) {
        return;
      }
      event.target.removeAttribute("aria-invalid");
      const phoneFallback = form.querySelector("[data-form-phone-fallback]");
      if (phoneFallback) {
        phoneFallback.hidden = true;
      }
      const error = form.querySelector(`[data-field-error="${name}"]`);
      if (error) {
        error.textContent = "";
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submit?.getAttribute("aria-busy") === "true") {
        return;
      }

      ensureSubmissionMetadata(form);
      const { errors, values } = validateContactPayload(
        formPayload(form),
        locale,
      );

      if (Object.keys(errors).length > 0) {
        showErrors(form, errors);
        return;
      }

      clearErrors(form);
      if (summary) {
        summary.hidden = true;
      }
      if (success) {
        success.hidden = true;
      }

      const originalLabel = submit?.dataset.submitLabel ?? submit?.textContent;
      if (submit) {
        submit.disabled = true;
        submit.setAttribute("aria-busy", "true");
        submit.textContent = messages.sending;
      }

      try {
        const result = await submitContactForm(form, values);
        if (!result.ok || result.body?.ok !== true) {
          const serverErrors =
            result.body?.code === "VALIDATION_ERROR"
              ? localizeServerFieldErrors(result.body?.fields, locale)
              : {};
          showErrors(
            form,
            serverErrors,
            serverErrorMessage(result.body?.code, locale),
            { showPhoneFallback: Object.keys(serverErrors).length === 0 },
          );
          return;
        }

        if (success) {
          const reference = success.querySelector(
            "[data-submission-reference]",
          );
          if (reference) {
            reference.textContent = values.submissionId;
          }
          success.hidden = false;
          success.focus?.();
        }
      } catch {
        showErrors(
          form,
          {},
          navigator.onLine === false ? messages.offline : messages.generic,
          { showPhoneFallback: true },
        );
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.removeAttribute("aria-busy");
          submit.textContent = originalLabel;
        }
      }
    });
  });
}
