import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConfirmationEmail,
  buildInternalEmail,
  escapeHtml,
} from "../../server/contact/email.js";

const contact = {
  email: "anna@example.com",
  firstName: "Anna <script>",
  intent: "visit",
  lastName: "Beispiel",
  locale: "fr",
  message: "Bonjour <img src=x onerror=alert(1)>\nDeuxième ligne",
  phone: "+49 208 123 45",
  preferredContact: "email",
  preferredDate: "2026-09-15",
  submissionId: "123e4567-e89b-42d3-a456-426614174000",
};

test("échappe toutes les données injectées dans les emails HTML", () => {
  const internal = buildInternalEmail(contact, {
    from: "Aureum <contact@example.test>",
    receivedAt: "2026-07-28T12:00:00.000Z",
    to: "team@example.test",
  });
  const confirmation = buildConfirmationEmail(contact, {
    fallbackPhone: "+49 208 000 00",
    from: "Aureum <contact@example.test>",
    siteUrl: "https://example.test",
  });

  assert.doesNotMatch(internal.html, /<img|<script>/u);
  assert.doesNotMatch(confirmation.html, /<script>/u);
  assert.match(internal.html, /&lt;img/);
  assert.match(confirmation.html, /Anna &lt;script&gt;/);
  assert.match(internal.text, /Bonjour <img/);
  assert.equal(internal.replyTo, contact.email);
});

test("escapeHtml couvre les cinq caractères dangereux", () => {
  assert.equal(
    escapeHtml(`<tag attr="'">&`),
    "&lt;tag attr=&quot;&#39;&quot;&gt;&amp;",
  );
});
