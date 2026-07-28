const desktopQuery = window.matchMedia("(min-width: 64rem)");

export function initNavigation() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");

  if (!toggle || !menu) {
    return;
  }

  const openLabel = toggle.querySelector("[data-menu-open-label]");
  const closeLabel = toggle.querySelector("[data-menu-close-label]");

  const setOpen = (open, { restoreFocus = false } = {}) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.toggleAttribute("data-open", open);
    openLabel?.classList.toggle("u-visually-hidden", open);
    closeLabel?.classList.toggle("u-visually-hidden", !open);

    if (restoreFocus) {
      toggle.focus();
    }
  };

  toggle.hidden = false;
  setOpen(false);

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      setOpen(false, { restoreFocus: true });
    }
  });

  desktopQuery.addEventListener("change", ({ matches }) => {
    if (matches) {
      setOpen(false);
    }
  });
}
