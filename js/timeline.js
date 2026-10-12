// 24-hour time-zone timeline. Replaces the three static clocks.
// Markup: <div class="tz" data-timeline aria-labelledby="…"> (fallback content inside) </div>
//
// - The axis is the visitor's local day (midnight to midnight; 23 or 25 h on DST days).
// - Each row shows 9:00–18:00 local working hours for its zone, computed with Intl, so DST
//   is handled per zone with no hardcoded offsets.
// - The "Live call window" is where the team's hours overlap either US office's hours.
// - The line follows "now" (refreshed every minute) until the visitor drags it or uses the
//   arrow keys; Home, double-click, or the "Back to now" button snap it back.
(function () {
  const root = document.querySelector('[data-timeline]');
  if (!root || typeof Intl === 'undefined') return;

  const TEAM_ZONE = 'Asia/Tokyo';
  const US_ZONES = ['America/Los_Angeles', 'America/New_York'];
  const WORK_HOURS = [9, 18];
  const ZONES = [
    { id: 'Asia/Tokyo', city: 'Tokyo' },
    { id: 'America/Los_Angeles', city: 'San Francisco' },
    { id: 'America/New_York', city: 'New York' },
  ];

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const rows = ZONES.slice();
  if (visitorZone && !ZONES.some((z) => z.id === visitorZone)) {
    rows.push({ id: visitorZone, city: 'You', note: cityFromZone(visitorZone), isVisitor: true });
  }

  // --- Time-zone math (Intl only) -------------------------------------------

  const partsFormatters = new Map();

  function zoneParts(ts, zone) {
    let fmt = partsFormatters.get(zone);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      });
      partsFormatters.set(zone, fmt);
    }
    const p = {};
    fmt.formatToParts(ts).forEach(({ type, value }) => (p[type] = Number(value)));
    return p; // { year, month, day, hour, minute, second }
  }

  // Offset of `zone` from UTC at instant `ts`, in ms.
  function offsetAt(ts, zone) {
    const p = zoneParts(ts, zone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(ts / 1000) * 1000;
  }

  // UTC instant for a wall-clock time in `zone`. Re-checks the offset once, which settles
  // instants near a DST change.
  function zonedTime(year, month, day, hour, zone) {
    const guess = Date.UTC(year, month - 1, day, hour);
    let ts = guess - offsetAt(guess, zone);
    ts = guess - offsetAt(ts, zone);
    return ts;
  }

  // Calendar date (in `zone`) shifted by `days`, with month/year rollover via Date.UTC.
  function shiftDate(p, days) {
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }

  // Working-hour intervals for `zone` that touch [start, end].
  function workIntervals(zone, start, end) {
    const base = zoneParts(start, zone);
    const out = [];
    for (let i = -1; i <= 1; i++) {
      const d = shiftDate(base, i);
      const from = zonedTime(d.year, d.month, d.day, WORK_HOURS[0], zone);
      const to = zonedTime(d.year, d.month, d.day, WORK_HOURS[1], zone);
      const a = Math.max(from, start);
      const b = Math.min(to, end);
      if (b > a) out.push([a, b]);
    }
    return out;
  }

  function intersect(listA, listB) {
    const out = [];
    listA.forEach(([a1, a2]) =>
      listB.forEach(([b1, b2]) => {
        const s = Math.max(a1, b1);
        const e = Math.min(a2, b2);
        if (e > s) out.push([s, e]);
      })
    );
    return out.sort((x, y) => x[0] - y[0]);
  }

  function visitorDay(ts) {
    const p = zoneParts(ts, visitorZone);
    const next = shiftDate(p, 1);
    return {
      start: zonedTime(p.year, p.month, p.day, 0, visitorZone),
      end: zonedTime(next.year, next.month, next.day, 0, visitorZone),
    };
  }

  // --- Formatting -------------------------------------------------------------

  const timeFormatters = new Map();

  function formatTime(ts, zone, withDay) {
    const key = zone + withDay;
    let fmt = timeFormatters.get(key);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hour: 'numeric',
        minute: '2-digit',
        weekday: withDay ? 'short' : undefined,
      });
      timeFormatters.set(key, fmt);
    }
    return fmt.format(ts);
  }

  function cityFromZone(zone) {
    return zone.split('/').pop().replace(/_/g, ' ');
  }

  function isWorking(ts, zone) {
    const h = zoneParts(ts, zone).hour;
    return h >= WORK_HOURS[0] && h < WORK_HOURS[1];
  }

  // --- DOM ----------------------------------------------------------------------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  const legend = el('p', 'tz__legend');
  const legendSwatch = el('span', 'tz__swatch');
  legendSwatch.setAttribute('aria-hidden', 'true');
  const legendText = el('span');
  legend.append(legendSwatch, legendText);

  const grid = el('div', 'tz__grid');
  const rowEls = rows.map((zone) => {
    const label = el('div', 'tz__label');
    const city = el('span', 'tz__city', zone.city);
    if (zone.note) city.append(el('span', 'tz__note', ' · ' + zone.note));
    const time = el('span', 'tz__time');
    const status = el('span', 'tz__status');
    label.append(city, time, status);

    const track = el('div', 'tz__track');
    track.setAttribute('aria-hidden', 'true');
    if (zone.isVisitor) track.classList.add('tz__track--visitor');

    grid.append(label, track);
    return { zone, time, status, track };
  });

  // One layer over all tracks: overlap highlight, now line, and the slider itself.
  const layer = el('div', 'tz__layer');
  layer.tabIndex = 0;
  layer.setAttribute('role', 'slider');
  layer.setAttribute('aria-label', 'Time of day');
  layer.setAttribute('aria-valuemin', '0');
  layer.style.gridRow = '1 / span ' + rows.length;
  const overlapLayer = el('div', 'tz__overlaps');
  const line = el('div', 'tz__line');
  layer.append(overlapLayer, line);
  grid.append(layer);

  const axis = el('div', 'tz__axis');
  axis.setAttribute('aria-hidden', 'true');

  const footer = el('div', 'tz__footer');
  const nowButton = el('button', 'tz__now', 'Back to now');
  nowButton.type = 'button';
  nowButton.hidden = true;
  footer.append(el('span', 'tz__hint', 'Drag the line or use the arrow keys to compare times.'), nowButton);

  root.replaceChildren(legend, grid, axis, footer);
  root.classList.add('is-ready');

  // --- State & render -----------------------------------------------------------

  let day = visitorDay(Date.now());
  let selected = Date.now();
  let following = true;
  let overlaps = [];

  const fraction = (ts) => (ts - day.start) / (day.end - day.start);
  const pct = (f) => (Math.min(Math.max(f, 0), 1) * 100).toFixed(3) + '%';

  function band(className, [a, b]) {
    const node = el('span', className);
    node.style.setProperty('--from', pct(fraction(a)));
    node.style.setProperty('--to', pct(fraction(b)));
    return node;
  }

  function renderDay() {
    rowEls.forEach((row) => {
      row.track.replaceChildren(...workIntervals(row.zone.id, day.start, day.end).map((i) => band('tz__band', i)));
    });

    const team = workIntervals(TEAM_ZONE, day.start, day.end);
    const us = US_ZONES.flatMap((z) => workIntervals(z, day.start, day.end));
    overlaps = intersect(team, us);
    overlapLayer.replaceChildren(...overlaps.map((i) => band('tz__overlap', i)));

    legendText.textContent = overlaps.length
      ? 'Live call window: ' +
        overlaps.map(([a, b]) => formatTime(a, visitorZone) + '–' + formatTime(b, visitorZone)).join(', ') +
        ' your time'
      : 'Live call window: no overlap today';

    // Ticks sit at wall-clock hours, so they stay right on 23- and 25-hour DST days.
    const d = zoneParts(day.start, visitorZone);
    axis.replaceChildren(
      ...[0, 6, 12, 18, 24].map((h) => {
        const at = h === 24 ? day.end : zonedTime(d.year, d.month, d.day, h, visitorZone);
        const tick = el('span', 'tz__tick', h === 24 ? '24:00' : String(h).padStart(2, '0') + ':00');
        tick.style.setProperty('--at', pct(fraction(at)));
        return tick;
      })
    );
    const lengthMinutes = Math.round((day.end - day.start) / MINUTE);
    layer.setAttribute('aria-valuemax', String(lengthMinutes));
  }

  function renderSelection() {
    line.style.setProperty('--at', pct(fraction(selected)));
    line.classList.toggle('is-now', following);
    nowButton.hidden = following;

    const inWindow = overlaps.some(([a, b]) => selected >= a && selected < b);
    line.classList.toggle('is-live', inWindow);

    const spoken = rowEls.map((row) => {
      const t = formatTime(selected, row.zone.id, true);
      const working = isWorking(selected, row.zone.id);
      row.time.textContent = t;
      row.status.textContent = working ? 'Working hours' : 'Off hours';
      row.status.classList.toggle('is-working', working);
      return (row.zone.isVisitor ? 'Your time' : row.zone.city) + ' ' + t;
    });

    layer.setAttribute('aria-valuenow', String(Math.round((selected - day.start) / MINUTE)));
    layer.setAttribute(
      'aria-valuetext',
      (following ? 'Now. ' : '') + spoken.join(', ') + (inWindow ? '. Inside the live call window.' : '.')
    );
  }

  function goToNow() {
    following = true;
    const now = Date.now();
    if (now >= day.end || now < day.start) {
      day = visitorDay(now);
      renderDay();
    }
    selected = now;
    renderSelection();
  }

  function select(ts) {
    following = false;
    selected = Math.min(Math.max(ts, day.start), day.end - MINUTE);
    renderSelection();
  }

  // --- Input --------------------------------------------------------------------

  function tsFromPointer(event) {
    const rect = layer.getBoundingClientRect();
    const f = (event.clientX - rect.left) / rect.width;
    const ts = day.start + f * (day.end - day.start);
    return Math.round(ts / (5 * MINUTE)) * 5 * MINUTE; // snap to 5 minutes
  }

  layer.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    layer.setPointerCapture(event.pointerId);
    layer.focus({ preventScroll: true });
    root.classList.add('is-dragging');
    select(tsFromPointer(event));
  });

  layer.addEventListener('pointermove', (event) => {
    if (layer.hasPointerCapture(event.pointerId)) select(tsFromPointer(event));
  });

  const endDrag = () => root.classList.remove('is-dragging');
  layer.addEventListener('pointerup', endDrag);
  layer.addEventListener('pointercancel', endDrag);
  layer.addEventListener('dblclick', goToNow);
  nowButton.addEventListener('click', goToNow);

  layer.addEventListener('keydown', (event) => {
    const steps = {
      ArrowRight: 15 * MINUTE,
      ArrowUp: 15 * MINUTE,
      ArrowLeft: -15 * MINUTE,
      ArrowDown: -15 * MINUTE,
      PageUp: HOUR,
      PageDown: -HOUR,
    };
    if (event.key in steps) {
      select(selected + steps[event.key]);
    } else if (event.key === 'Home') {
      goToNow();
    } else if (event.key === 'End') {
      select(day.end - MINUTE);
    } else {
      return;
    }
    event.preventDefault();
  });

  // Keep the line on "now": tick at the top of every minute.
  function scheduleTick() {
    setTimeout(() => {
      if (following) goToNow();
      scheduleTick();
    }, MINUTE - (Date.now() % MINUTE) + 50);
  }

  renderDay();
  goToNow();
  scheduleTick();
})();
