export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlLineBreaks(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function intentLabel(intent, locale) {
  const labels = {
    de: { general: "Allgemeine Anfrage", visit: "Besichtigung" },
    fr: { general: "Demande générale", visit: "Visite" },
  };
  return labels[locale][intent];
}

function preferredContactLabel(value, locale) {
  const labels = {
    de: { email: "E-Mail", none: "Keine Präferenz", phone: "Telefon" },
    fr: { email: "E-mail", none: "Aucune préférence", phone: "Téléphone" },
  };
  return labels[locale][value];
}

function internalLines(contact, receivedAt) {
  return [
    `Reference: ${contact.submissionId}`,
    `Received UTC: ${receivedAt}`,
    `Locale: ${contact.locale}`,
    `Request: ${intentLabel(contact.intent, contact.locale)}`,
    `Name: ${contact.firstName} ${contact.lastName}`,
    `Email: ${contact.email}`,
    `Phone: ${contact.phone || "—"}`,
    `Preferred contact: ${preferredContactLabel(contact.preferredContact, contact.locale)}`,
    `Preferred date: ${contact.preferredDate || "—"}`,
    "",
    "Message:",
    contact.message,
  ];
}

export function buildInternalEmail(contact, { from, receivedAt, to }) {
  const lines = internalLines(contact, receivedAt);
  const rows = lines
    .slice(0, 9)
    .map((line) => {
      const separator = line.indexOf(":");
      const key = line.slice(0, separator);
      const value = line.slice(separator + 1).trim();
      return `<tr><th align="left">${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`;
    })
    .join("");

  return {
    from,
    html: `<h1>Neue Kontaktanfrage</h1><table>${rows}</table><h2>Message</h2><p>${htmlLineBreaks(contact.message)}</p>`,
    replyTo: contact.email,
    subject: `[Residenz Aureum] ${intentLabel(contact.intent, "de")} · ${contact.submissionId}`,
    text: lines.join("\n"),
    to,
  };
}

const confirmationCopy = {
  de: {
    greeting: "Guten Tag",
    health:
      "Bitte senden Sie keine medizinischen oder besonders sensiblen Angaben per E-Mail.",
    intro:
      "Wir haben Ihre Nachricht erhalten. Diese Bestätigung sagt keinen Besuchstermin und keine Antwortfrist zu.",
    phone: "Wenn Sie uns telefonisch erreichen möchten:",
    subject: "Ihre Nachricht an Residenz Aureum",
    thanks: "Vielen Dank für Ihre Kontaktaufnahme.",
  },
  fr: {
    greeting: "Bonjour",
    health:
      "Merci de ne transmettre aucune donnée médicale ou particulièrement sensible par e-mail.",
    intro:
      "Nous avons bien reçu votre message. Cet accusé ne confirme ni rendez-vous ni délai de réponse.",
    phone: "Pour nous joindre par téléphone :",
    subject: "Votre message à Residenz Aureum",
    thanks: "Merci pour votre prise de contact.",
  },
};

export function buildConfirmationEmail(
  contact,
  { fallbackPhone, from, siteUrl },
) {
  const copy = confirmationCopy[contact.locale];
  const name = `${contact.firstName} ${contact.lastName}`;
  const text = [
    `${copy.greeting} ${name},`,
    "",
    copy.thanks,
    copy.intro,
    "",
    `${copy.phone} ${fallbackPhone}`,
    siteUrl,
    "",
    copy.health,
    "",
    `Reference: ${contact.submissionId}`,
  ].join("\n");

  return {
    from,
    html: `<p>${escapeHtml(copy.greeting)} ${escapeHtml(name)},</p><p>${escapeHtml(copy.thanks)}</p><p>${escapeHtml(copy.intro)}</p><p>${escapeHtml(copy.phone)} <strong>${escapeHtml(fallbackPhone)}</strong></p><p><a href="${escapeHtml(siteUrl)}">${escapeHtml(siteUrl)}</a></p><p>${escapeHtml(copy.health)}</p><p><small>Reference: ${escapeHtml(contact.submissionId)}</small></p>`,
    subject: copy.subject,
    text,
    to: contact.email,
  };
}
