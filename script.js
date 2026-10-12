// Site-wide behaviour: mobile menu, local clocks, placeholder review mode.
(function () {
  // --- Mobile menu ------------------------------------------------------------
  // State lives in aria-expanded; css hides the nav when it is "false" (mobile only).
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('site-menu');

  if (toggle && menu) {
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => toggle.setAttribute('aria-expanded', String(open));

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Close after choosing a link, on Escape, and when the layout grows to desktop.
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  // --- Local clocks (Across the Pacific) ---------------------------------------
  // Each [data-zone] item shows its current time; US items also show how far behind
  // Fujisawa they are. Offsets come from Intl, so daylight saving time is handled.
  const clocks = document.querySelectorAll('[data-zone]');
  const HOME_ZONE = 'Asia/Tokyo';

  if (clocks.length && typeof Intl !== 'undefined') {
    const timeFormats = new Map();
    const partFormats = new Map();

    const timeIn = (zone, now) => {
      if (!timeFormats.has(zone)) {
        timeFormats.set(zone, new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }));
      }
      return timeFormats.get(zone).format(now);
    };

    // Minutes east of UTC for `zone` at instant `now`
    const offsetIn = (zone, now) => {
      if (!partFormats.has(zone)) {
        partFormats.set(zone, new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          hourCycle: 'h23',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        }));
      }
      const p = {};
      partFormats.get(zone).formatToParts(now).forEach(({ type, value }) => (p[type] = Number(value)));
      const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
      return Math.round((wall - Math.floor(now / 60000) * 60000) / 60000);
    };

    const tick = () => {
      const now = Date.now();
      clocks.forEach((item) => {
        const zone = item.dataset.zone;
        const time = item.querySelector('[data-zone-time]');
        time.textContent = timeIn(zone, now);
        time.hidden = false;

        const diff = item.querySelector('[data-zone-diff]');
        if (diff) {
          const hours = (offsetIn(HOME_ZONE, now) - offsetIn(zone, now)) / 60;
          diff.textContent = `${hours} hours behind Fujisawa`;
          diff.hidden = false;
        }
      });
    };

    tick();
    setInterval(tick, 30 * 1000);
  }

  // --- Placeholder review -----------------------------------------------------
  // Visit the page with ?review to outline every element still marked .ph.
  if (new URLSearchParams(location.search).has('review')) {
    document.documentElement.classList.add('review');
  }
})();
