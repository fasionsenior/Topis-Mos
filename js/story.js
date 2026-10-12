// Pinned scroll story: highlights the principle crossing the middle of the viewport and
// crossfades the matching big word on the sticky left side.
// Desktop (≥900px) with motion allowed only; otherwise the stacked layout stays untouched.
(function () {
  const story = document.querySelector('[data-story]');
  if (!story || !('IntersectionObserver' in window)) return;

  const steps = Array.from(story.querySelectorAll('.story__step'));
  const words = Array.from(story.querySelectorAll('.story__word'));
  const query = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  let observer = null;

  function setActive(index) {
    story.dataset.active = String(index);
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    words.forEach((word, i) => word.classList.toggle('is-active', i === index));
  }

  function enable() {
    story.classList.add('is-enhanced');
    setActive(0);
    // A thin band across the middle of the viewport: whichever step is in it is active.
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(steps.indexOf(entry.target));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    steps.forEach((step) => observer.observe(step));
  }

  function disable() {
    if (observer) observer.disconnect();
    observer = null;
    story.classList.remove('is-enhanced');
    delete story.dataset.active;
    steps.forEach((step) => step.classList.remove('is-active'));
    words.forEach((word) => word.classList.remove('is-active'));
  }

  function update() {
    if (query.matches) {
      if (!observer) enable();
    } else {
      disable();
    }
  }

  query.addEventListener('change', update);
  update();
})();
