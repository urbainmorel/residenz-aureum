const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "summary",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function visibleFocusable(container) {
  return [...container.querySelectorAll(focusableSelector)].filter(
    (element) =>
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

export function initNavigation() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");

  if (!toggle || !menu) {
    return;
  }

  const header = toggle.closest(".header-inner") ?? toggle.parentElement;
  const openLabel = toggle.querySelector("[data-menu-open-label]");
  const closeLabel = toggle.querySelector("[data-menu-close-label]");
  const mobileQuery = window.matchMedia("(max-width: 63.99rem)");

  const closeNestedMenus = () => {
    menu.querySelectorAll("details[open]").forEach((details) => {
      details.open = false;
    });
  };

  const setOpen = (open, { focusFirst = false, restoreFocus = false } = {}) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.toggleAttribute("data-open", open);
    document.body.classList.toggle("menu-open", open && mobileQuery.matches);
    if (openLabel) {
      openLabel.hidden = open;
    }
    if (closeLabel) {
      closeLabel.hidden = !open;
    }

    if (!open) {
      closeNestedMenus();
    }

    if (restoreFocus) {
      toggle.focus();
    } else if (focusFirst) {
      queueMicrotask(() => visibleFocusable(menu)[0]?.focus());
    }
  };

  toggle.hidden = false;
  setOpen(false);

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(open, { focusFirst: open });
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (
      mobileQuery.matches &&
      toggle.getAttribute("aria-expanded") === "true" &&
      !header?.contains(event.target)
    ) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    if (!open || !mobileQuery.matches) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false, { restoreFocus: true });
      return;
    }

    if (event.key !== "Tab" || !header) {
      return;
    }

    const focusable = visibleFocusable(header);
    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });

  mobileQuery.addEventListener("change", () => {
    setOpen(false);
  });
}
