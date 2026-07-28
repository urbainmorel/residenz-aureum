import "../styles/main.css";
import { initLanguage } from "./language.js";
import { initNavigation } from "./navigation.js";

document.documentElement.classList.add("has-js");

function initialize() {
  initLanguage();
  initNavigation();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
