export function setFaqExpanded(button, expanded) {
  const answerId = button.getAttribute("aria-controls");
  const answer = answerId ? document.getElementById(answerId) : null;

  button.setAttribute("aria-expanded", String(expanded));
  if (answer) {
    answer.hidden = !expanded;
  }
}

export function initFaq() {
  document.querySelectorAll("[data-faq]").forEach((faq) => {
    const buttons = [...faq.querySelectorAll("[data-faq-toggle]")];

    buttons.forEach((button) => {
      setFaqExpanded(button, false);
      button.addEventListener("click", () => {
        const willExpand = button.getAttribute("aria-expanded") !== "true";
        setFaqExpanded(button, willExpand);
      });
    });
  });
}
