const supportedLocales = new Set(["de", "fr"]);

export function chooseLocale({ languages = [], savedLocale = null } = {}) {
  if (supportedLocales.has(savedLocale)) {
    return savedLocale;
  }

  const detected = languages
    .filter(Boolean)
    .map((value) => value.toLowerCase().split("-")[0])
    .find((value) => supportedLocales.has(value));

  return detected ?? "de";
}

function readSavedLocale() {
  try {
    return localStorage.getItem("ra-locale");
  } catch {
    return null;
  }
}

function saveLocale(locale) {
  try {
    localStorage.setItem("ra-locale", locale);
  } catch {
    // Le choix reste fonctionnel même lorsque le stockage est indisponible.
  }
}

export function initLanguage() {
  document.querySelectorAll("[data-language-choice]").forEach((link) => {
    link.addEventListener("click", () => {
      const locale = link.getAttribute("lang");
      if (supportedLocales.has(locale)) {
        saveLocale(locale);
      }
    });
  });

  if (!document.body.hasAttribute("data-root-locale-selector")) {
    return;
  }

  const locale = chooseLocale({
    languages: navigator.languages?.length
      ? [...navigator.languages]
      : [navigator.language],
    savedLocale: readSavedLocale(),
  });
  const destination = document.querySelector(
    `[data-language-choice][lang="${locale}"]`,
  );

  if (destination) {
    window.location.replace(destination.href);
  }
}
