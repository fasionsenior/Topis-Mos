// 花筏 (hanaikada, "flower rafts"): cherry blossom petals drifting on a stream behind
// the whole page.
//
// - The stream runs the full length of the document; one fixed <canvas> shows the part
//   under the window. Scrolling moves the water and petals with the page, at slightly
//   less than page speed (PARALLAX), so it reads as water lying beneath the paper.
// - Colours come from the :root tokens (--ai for the water, --sakura for the petals).
// - The canvas is drawn at 50% opacity (css: .hanaikada), so overlapping petals never
//   darken enough to pull small grey text below WCAG AA contrast.
// - Reduced motion: petals don't drift, but still move with the page on scroll.
//   The drift loop stops while the tab is hidden; frame rate and pixel ratio are capped.
(function (Topis) {
  if (!window.HTMLCanvasElement) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hanaikada';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.body.prepend(canvas);

  const css = getComputedStyle(document.documentElement);
  const WATER = css.getPropertyValue('--ai').trim();
  const PETAL = css.getPropertyValue('--sakura').trim();

  const MAX_DPR = 2;
  const FRAME_MS = 1000 / 40;  // ~40 fps is plenty for slow drift
  const PARALLAX = 0.85;       // stream scrolls at 85% of page speed
  const LANE_GAP = 190;        // vertical distance between stream lines, px
  const MARGIN = 80;           // draw a little beyond the window edges

  let width = 0;        // window size
  let height = 0;
  let worldHeight = 0;  // height of the whole stream
  let lanes = [];
  let petals = [];
  let running = false;
  let rafId = 0;
  let last = 0;
  let time = 0;
  let drawnAt = -1;     // view offset of the last render

  const rand = (min, max) => min + Math.random() * (max - min);
  const viewTop = () => window.scrollY * PARALLAX;

  // --- Stream ------------------------------------------------------------------
  // Each lane is a long, gentle wave (ryūsui, the flowing-water motif) whose phase
  // advances over time, so the water appears to flow left to right.
  function makeLane(i) {
    return {
      base: (i + 0.5) * LANE_GAP,
      amp: rand(18, 34),
      k: rand(0.0018, 0.0032),     // wavelength
      speed: rand(0.12, 0.2),      // phase speed
      phase: rand(0, Math.PI * 2),
      amp2: rand(6, 12),
      k2: rand(0.006, 0.009),
      phase2: rand(0, Math.PI * 2),
      flow: rand(14, 22),          // px per second that petals in this lane drift
    };
  }

  function laneY(lane, x, t) {
    return (
      lane.base +
      lane.amp * Math.sin(x * lane.k - t * lane.speed + lane.phase) +
      lane.amp2 * Math.sin(x * lane.k2 - t * lane.speed * 1.7 + lane.phase2)
    );
  }

  function laneSlope(lane, x, t) {
    return (
      lane.amp * lane.k * Math.cos(x * lane.k - t * lane.speed + lane.phase) +
      lane.amp2 * lane.k2 * Math.cos(x * lane.k2 - t * lane.speed * 1.7 + lane.phase2)
    );
  }

  const inView = (y, top) => y > top - MARGIN && y < top + height + MARGIN;

  function drawStream(t, top) {
    ctx.strokeStyle = WATER;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.22;
    lanes.forEach((lane) => {
      if (!inView(lane.base, top)) return;
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 16) {
        const y = laneY(lane, x, t);
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // --- Petals ------------------------------------------------------------------
  function makePetal(x, lane, offset) {
    const l = lane == null ? Math.floor(Math.random() * lanes.length) : lane;
    return {
      lane: l,
      offset: offset == null ? rand(-26, 26) : offset, // distance from the lane's line
      x: x == null ? rand(-40, width) : x,
      speed: lanes[l].flow * rand(0.9, 1.1), // close to the lane's flow, so rafts drift apart slowly
      size: rand(12, 20),
      spin: rand(0, Math.PI * 2),     // slow turning on the water
      spinSpeed: rand(-0.35, 0.35),
      flip: rand(0, Math.PI * 2),     // rocking, shown as a narrowing of the petal
      flipSpeed: rand(0.6, 1.2),
    };
  }

  // Petals start in small rafts (花筏) of 1–4 that share a lane and slowly separate.
  // About one petal per 70,000 px² of stream, spread over the lanes from `fromLane` on.
  function addPetals(fromLane) {
    const area = width * (lanes.length - fromLane) * LANE_GAP;
    const count = Math.max(fromLane === 0 ? 10 : 1, Math.round(area / 70000));
    for (let n = 0; n < count; ) {
      const lane = fromLane + Math.floor(Math.random() * (lanes.length - fromLane));
      const x = rand(-40, width);
      const offset = rand(-22, 22);
      const raft = Math.min(count - n, 1 + Math.floor(Math.random() * 4));
      for (let i = 0; i < raft; i++, n++) {
        petals.push(makePetal(x + rand(-18, 18), lane, offset + rand(-10, 10)));
      }
    }
  }

  // Grow the stream when the page gets taller (web fonts, images). Existing lanes and
  // petals are kept, so nothing visibly reshuffles while someone is reading. Extra
  // lanes after the page gets shorter are harmless: they're simply never in view.
  function extendStream() {
    const needed = Math.max(1, Math.ceil(worldHeight / LANE_GAP));
    if (needed <= lanes.length) return;
    const from = lanes.length;
    for (let i = from; i < needed; i++) lanes.push(makeLane(i));
    addPetals(from);
  }

  // Sakura petal: rounded, with the small notch at its tip
  function drawPetal(p, t, top) {
    const lane = lanes[p.lane];
    if (!inView(lane.base, top)) return;
    const y = laneY(lane, p.x, t) + p.offset;
    const angle = Math.atan(laneSlope(lane, p.x, t)) + p.spin;
    const L = p.size;
    const w = L * 0.46;

    ctx.save();
    ctx.translate(p.x, y);
    ctx.rotate(angle);
    ctx.scale(0.55 + 0.45 * Math.abs(Math.cos(p.flip)), 1);
    ctx.translate(0, L / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-w, -L * 0.28, -w * 0.95, -L * 0.88, -w * 0.28, -L);
    ctx.lineTo(0, -L * 0.84);
    ctx.lineTo(w * 0.28, -L);
    ctx.bezierCurveTo(w * 0.95, -L * 0.88, w, -L * 0.28, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  function step(dt) {
    petals.forEach((p, i) => {
      p.x += p.speed * dt;
      p.spin += p.spinSpeed * dt;
      p.flip += p.flipSpeed * dt;
      if (p.x > width + 40) petals[i] = makePetal(-40); // drifts off, a new one arrives
    });
  }

  // --- Rendering ---------------------------------------------------------------
  function render() {
    const top = viewTop();
    drawnAt = top;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(0, -top);
    drawStream(time, top);
    ctx.fillStyle = PETAL;
    petals.forEach((p) => drawPetal(p, time, top));
    ctx.restore();
  }

  // Drift loop at ~40 fps. Scrolling redraws separately (see the scroll listener).
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (now - last < FRAME_MS) return;
    const dt = Math.min((now - last) / 1000, 0.1); // no jump after a pause
    last = now;
    time += dt;
    step(dt);
    render();
  }

  function start() {
    if (running || Topis.reducedMotion() || document.hidden) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // Follow the page on every scroll, with or without the drift loop. Browsers fire
  // scroll at most once per frame, so drawing here keeps the petals locked to the page
  // with no one-frame lag.
  window.addEventListener(
    'scroll',
    () => {
      if (viewTop() !== drawnAt) render();
    },
    { passive: true }
  );

  // --- Size --------------------------------------------------------------------
  function streamHeight() {
    const doc = document.documentElement.scrollHeight;
    // The stream only has to reach the view offset at the bottom of the page
    return (doc - window.innerHeight) * PARALLAX + window.innerHeight;
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Full rebuild: first load, and when the width changes (the waves span the width)
  function build() {
    width = window.innerWidth;
    worldHeight = streamHeight();
    sizeCanvas();
    lanes = [];
    petals = [];
    extendStream();
    render();
  }

  // Width change: rebuild. Height change (mobile address bar, page growing as fonts
  // and images load): resize the canvas and extend the stream, keeping every petal.
  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth !== width) {
        build();
        return;
      }
      if (window.innerHeight !== height) sizeCanvas();
      worldHeight = streamHeight();
      extendStream();
      render();
    }, 150);
  }

  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(document.body);

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    if (Topis.reducedMotion()) {
      stop();
      render();
    } else {
      start();
    }
  });

  build();
  start();
})(window.Topis);
