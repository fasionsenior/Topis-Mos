// Count-up for case-study metrics. Call Topis.countUp(root) after metrics are in the DOM.
// Expected markup (case-study.js builds it):
// <span class="count" data-count-to="60" data-decimals="0" data-prefix="" data-suffix="%">
//   <span class="count__sizer" aria-hidden="true">60%</span>   reserves the final width
//   <span class="count__value" aria-hidden="true">60%</span>   the animated digits
//   <span class="visually-hidden">60%</span>                    what screen readers hear
// </span>
window.Topis = window.Topis || {};

(function (Topis) {
  const DURATION = 1200;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function formatter(el) {
    const decimals = Number(el.dataset.decimals || 0);
    const number = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    return (value) => prefix + number.format(value) + suffix;
  }

  function run(el) {
    const output = el.querySelector('.count__value');
    const target = Number(el.dataset.countTo);
    const format = formatter(el);
    const start = performance.now();

    function frame(now) {
      const t = Math.min((now - start) / DURATION, 1);
      output.textContent = format(target * easeOutCubic(t));
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  Topis.countUp = function (root = document) {
    const counters = root.querySelectorAll('[data-count-to]');
    if (Topis.reducedMotion && Topis.reducedMotion()) return; // final values are already in the markup

    counters.forEach((el) => {
      const output = el.querySelector('.count__value');
      if (!output || Number.isNaN(Number(el.dataset.countTo))) return;
      output.textContent = formatter(el)(0);
      Topis.observeOnce(el, run, { rootMargin: '0px', threshold: 0.6 });
    });
  };
})(window.Topis);
