// Shared helpers for all Topis modules. Load this first, with `defer`.
window.Topis = window.Topis || {};

(function (Topis) {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  Topis.reducedMotion = () => motionQuery.matches;

  // One IntersectionObserver per option set, shared by every module.
  // Calls `callback(el)` once, the first time `el` enters the viewport.
  const observers = new Map();

  Topis.observeOnce = function (el, callback, options = {}) {
    const rootMargin = options.rootMargin || '0px 0px -10% 0px';
    const threshold = options.threshold ?? 0.1;

    if (!('IntersectionObserver' in window)) {
      callback(el);
      return;
    }

    const key = rootMargin + '|' + threshold;
    let shared = observers.get(key);

    if (!shared) {
      const callbacks = new WeakMap();
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            io.unobserve(entry.target);
            const cb = callbacks.get(entry.target);
            callbacks.delete(entry.target);
            if (cb) cb(entry.target);
          });
        },
        { rootMargin, threshold }
      );
      shared = { io, callbacks };
      observers.set(key, shared);
    }

    shared.callbacks.set(el, callback);
    shared.io.observe(el);
  };
})(window.Topis);
