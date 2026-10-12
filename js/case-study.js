// Selected work: renders project rows from window.TOPIS_PROJECTS and opens each as a case study
// in a modal <dialog>, addressed by #work/<slug>.
//
// - Rows are real links, so a case study can be shared and opened directly.
// - Back button closes; Close button / Escape / backdrop click close and return focus to the row.
// - View Transitions morph the row's title and image into the detail view; other browsers get
//   a short fade; reduced motion gets neither.
// Load after projects.js and count-up.js, and before reveal.js (so the rows can be revealed).
(function () {
  const projects = window.TOPIS_PROJECTS || [];
  const list = document.querySelector('[data-work-list]');
  const dialog = document.querySelector('[data-case]');
  if (!list || !dialog || !projects.length) return;

  const body = dialog.querySelector('[data-case-body]');
  const PREFIX = '#work/';
  const LIST_HASH = '#work';

  let openedInPage = false; // true when the case study was opened by navigating within this page
  let currentRow = null;

  // --- Rendering -------------------------------------------------------------

  function el(tag, className, text, ph) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (ph) node.classList.add('ph');
    if (text != null) node.textContent = text;
    return node;
  }

  function media(image, className, ph) {
    if (image && image.src) {
      const img = el('img', className);
      img.src = image.src;
      img.alt = image.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      return img;
    }
    const block = el('div', className + ' media-placeholder', null, ph);
    block.setAttribute('aria-hidden', 'true');
    return block;
  }

  function renderRows() {
    const rows = projects.map((project, index) => {
      const ph = project.placeholder;
      const item = el('li', 'work-row');
      item.dataset.reveal = '';
      if (index > 0 && index < 4) item.dataset.revealDelay = String(Math.min(index, 3));

      const link = el('a', 'work-row__link');
      link.href = PREFIX + project.slug;
      link.dataset.slug = project.slug;

      const text = el('div', 'work-row__text');
      text.append(
        el('h3', 'work-row__title', project.title, ph),
        el('p', 'work-row__summary', project.summary, ph)
      );

      link.append(
        media(project.image, 'work-row__media', ph),
        text,
        el('span', 'work-row__cta', 'Read case study')
      );
      item.append(link);
      return item;
    });

    list.replaceChildren(...rows);
  }

  function section(title, ...content) {
    const wrap = el('section', 'case__section');
    wrap.append(el('h3', 'case__heading', title), ...content);
    return wrap;
  }

  function metric(m, ph) {
    const decimals = m.decimals || 0;
    const final =
      (m.prefix || '') +
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(m.value) +
      (m.suffix || '');

    const count = el('span', 'count');
    Object.assign(count.dataset, {
      countTo: String(m.value),
      decimals: String(decimals),
      prefix: m.prefix || '',
      suffix: m.suffix || '',
    });
    const sizer = el('span', 'count__sizer', final);
    const value = el('span', 'count__value', final);
    sizer.setAttribute('aria-hidden', 'true');
    value.setAttribute('aria-hidden', 'true');
    count.append(sizer, value, el('span', 'visually-hidden', final));

    const item = el('li', 'metric', null, ph);
    item.append(count, el('span', 'metric__label', m.label));
    return item;
  }

  function renderCase(project) {
    const ph = project.placeholder;
    const header = el('header', 'case__header');
    const title = el('h2', 'case__title', project.title, ph);
    title.id = 'case-title';
    header.append(el('p', 'case__client', project.client, ph), title);

    const parts = [
      header,
      media(project.image, 'case__media', ph),
      section('Challenge', el('p', null, project.challenge, ph)),
      section('Our approach', el('p', null, project.approach, ph)),
    ];

    const result = project.result || {};
    const resultParts = [el('p', null, result.text, ph)];
    const metrics = (result.metrics || []).slice(0, 3);
    if (metrics.length) {
      const ul = el('ul', 'case__metrics');
      ul.append(...metrics.map((m) => metric(m, ph)));
      resultParts.push(ul);
    }
    parts.push(section('Result', ...resultParts));

    if (project.stack && project.stack.length) {
      const ul = el('ul', 'case__stack');
      ul.append(...project.stack.map((t) => el('li', null, t, ph)));
      parts.push(section('Tech stack', ul));
    }

    if (project.gallery && project.gallery.length) {
      const ul = el('ul', 'case__gallery');
      ul.append(
        ...project.gallery.map((image) => {
          const li = el('li');
          li.append(media(image, 'case__gallery-item', ph));
          return li;
        })
      );
      parts.push(section('Gallery', ul));
    }

    body.replaceChildren(...parts);
    dialog.setAttribute('aria-labelledby', 'case-title');
  }

  // --- Open / close ----------------------------------------------------------

  const canMorph = () => 'startViewTransition' in document && !Topis.reducedMotion();

  function rowFor(slug) {
    return list.querySelector('[data-slug="' + CSS.escape(slug) + '"]');
  }

  function open(slug) {
    const project = projects.find((p) => p.slug === slug);
    if (!project) return;

    const row = rowFor(slug);
    currentRow = row;

    const show = () => {
      renderCase(project);
      if (!dialog.open) dialog.showModal();
      if (row) row.classList.remove('is-vt-source');
      Topis.countUp(body);
    };

    if (canMorph()) {
      if (row) row.classList.add('is-vt-source');
      document.startViewTransition(show);
    } else {
      show();
      if (!Topis.reducedMotion()) fadeIn();
    }
  }

  function close() {
    if (!dialog.open) return;
    const row = currentRow;
    const link = row && row.querySelector('a');

    const hide = () => {
      dialog.close();
      if (row && canMorph()) row.classList.add('is-vt-source');
      if (link) link.focus();
    };

    if (canMorph()) {
      const transition = document.startViewTransition(hide);
      transition.finished.finally(() => row && row.classList.remove('is-vt-source'));
    } else if (!Topis.reducedMotion()) {
      fadeOut(hide);
    } else {
      hide();
    }
  }

  function fadeIn() {
    dialog.classList.add('is-fading-in');
    setTimeout(() => dialog.classList.remove('is-fading-in'), 300);
  }

  function fadeOut(done) {
    dialog.classList.add('is-fading-out');
    setTimeout(() => {
      dialog.classList.remove('is-fading-out');
      done();
    }, 200);
  }

  // Close from the UI: step back in history if we pushed the case-study entry ourselves,
  // otherwise (opened from a shared link) swap the hash without adding a history entry.
  function requestClose() {
    if (openedInPage) {
      history.back(); // fires hashchange -> close()
    } else {
      history.replaceState(null, '', LIST_HASH);
      close();
    }
  }

  function slugFromHash() {
    return location.hash.startsWith(PREFIX) ? decodeURIComponent(location.hash.slice(PREFIX.length)) : null;
  }

  // --- Events ----------------------------------------------------------------

  window.addEventListener('hashchange', () => {
    const slug = slugFromHash();
    if (slug) {
      openedInPage = true;
      open(slug);
    } else {
      openedInPage = false;
      close();
    }
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault(); // Escape: route through history so Back and Escape stay in sync
    requestClose();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-case-close]')) requestClose();
  });

  renderRows();

  const initial = slugFromHash();
  if (initial) open(initial);
})();
