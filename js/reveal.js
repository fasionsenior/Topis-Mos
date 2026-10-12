// Scroll reveal: adds .is-revealed to [data-reveal] elements once, as they enter the viewport.
// data-reveal          -> fade up 12px (css/reveal.css)
// data-reveal="brush"  -> brush-stroke mask, used by the vertical kanji labels (css/kanji.css)
(function () {
  const items = document.querySelectorAll('[data-reveal]');
  const show = (el) => el.classList.add('is-revealed');

  if (Topis.reducedMotion()) {
    items.forEach(show);
    return;
  }

  items.forEach((el) => Topis.observeOnce(el, show));
})();
