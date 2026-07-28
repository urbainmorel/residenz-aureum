import "../styles/main.css";
import { initContactForms } from "./contact-form.js";
import { initFaq } from "./faq.js";
import { initLanguage } from "./language.js";
import { initNavigation } from "./navigation.js";

document.documentElement.classList.add("has-js");

function initialize() {
  initContactForms();
  initFaq();
  initLanguage();
  initNavigation();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
