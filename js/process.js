// "How a project works" fallback for browsers without scroll-driven animations.
// Browsers that support animation-timeline are handled entirely in css/process.css.
(function () {
  const process = document.querySelector('[data-process]');
  if (!process) return;
  if (CSS.supports('animation-timeline: view()') || Topis.reducedMotion()) return;
  if (!('IntersectionObserver' in window)) return; // CSS default = finished state

  const steps = Array.from(process.querySelectorAll('.process__step'));
  let shown = 0;
  let target = 0;
  let timer = null;

  process.classList.add('is-io');

  // Reveal steps one at a time so the line travels from circle to circle. On desktop all
  // four steps share a row and become visible together; this keeps the sequence readable.
  function advance() {
    if (shown >= target) {
      timer = null;
      return;
    }
    steps[shown].classList.add('is-reached');
    shown += 1;
    process.dataset.reached = String(shown);
    timer = setTimeout(advance, 300);
  }

  // A step counts as reached when it passes 60% down the viewport.
  steps.forEach((step, index) => {
    Topis.observeOnce(
      step,
      () => {
        target = Math.max(target, index + 1);
        if (!timer) advance();
      },
      { rootMargin: '0px 0px -40% 0px', threshold: 0 }
    );
  });
})();
