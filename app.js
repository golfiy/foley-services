(() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const SHOT = params.has('shot');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const secA = document.getElementById('svca');
  const secB = document.getElementById('svcb');
  const panel = document.getElementById('demo');
  const abNav = document.querySelector('.ab');

  /* ---------- shared settings (demo panel / URL) ---------- */
  const settings = {
    autoplay: !reduceMotion && params.get('autoplay') !== '0',
    userStopped: false,          // a tap on touch stops autoplay so the reader is not interrupted
    hoverPause: params.get('hoverpause') === '1',
    dwell: Math.max(2000, parseInt(params.get('dwell'), 10) || 8000),
    fx: params.get('fx') || (reduceMotion ? 'fade' : 'wipe'),
  };
  const autoplayOn = () => settings.autoplay && !settings.userStopped;
  const slowFactor = () => parseFloat(getComputedStyle(root).getPropertyValue('--slow')) || 1;

  /* ---------- variant B is built from variant A's content ---------- */
  const itemsA = [...secA.querySelectorAll('.svc-item')];
  (function buildB() {
    const tabs = secB.querySelector('.svcb-tabs');
    const media = secB.querySelector('.svcb-media');
    const panels = secB.querySelector('.svcb-panels');
    itemsA.forEach((it, k) => {
      const title = it.querySelector('.svc-title').textContent.trim();

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'svcb-tab';
      tab.id = `svcb-t${k}`;
      tab.dataset.text = title;                     // reserves the bold width so the row never shifts
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `svcb-p${k}`);
      tab.setAttribute('aria-selected', 'false');
      tab.tabIndex = -1;
      const bar = document.createElement('span');
      bar.className = 'svc-progress';
      bar.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'svcb-tab-text';
      label.textContent = title;
      tab.append(bar, label);
      tabs.append(tab);

      const pnl = document.createElement('div');
      pnl.className = 'svcb-panel';
      pnl.id = `svcb-p${k}`;
      pnl.setAttribute('role', 'tabpanel');
      pnl.setAttribute('aria-labelledby', tab.id);
      const h = document.createElement('h3');
      h.className = 'svcb-title';
      h.textContent = title;
      pnl.append(h);
      [...it.querySelector('.svc-body-in').children].forEach((n) => pnl.append(n.cloneNode(true)));
      panels.append(pnl);
    });
    secA.querySelectorAll('.ph').forEach((ph) => media.append(ph.cloneNode(true)));
  })();

  /* ---------- one controller per layout ---------- */
  function controller(section, { triggers, axis, onActivate }) {
    const photos = [...section.querySelectorAll('.ph')];
    const n = photos.length;
    const pauses = new Set();
    let index = -1;
    let cleanupTimer = 0;

    const syncPause = () => section.classList.toggle('is-paused', pauses.size > 0);

    function go(next, { dir, instant = false } = {}) {
      next = (next + n) % n;
      if (next === index) return;
      const prev = index;
      index = next;
      const forward = dir ? dir === 'next' : next > prev;
      section.dataset.dir = forward ? 'next' : 'prev';
      onActivate(next, prev, instant);

      clearTimeout(cleanupTimer);
      photos.forEach((p) => p.classList.remove('is-prev', 'is-entering'));
      if (prev < 0 || instant) {
        photos.forEach((p, k) => p.classList.toggle('is-active', k === next));
        return;
      }
      const out = photos[prev];
      const inc = photos[next];
      out.classList.remove('is-active');
      out.classList.add('is-prev');
      inc.dataset.from = axis === 'y' ? (forward ? 'below' : 'above') : (forward ? 'right' : 'left');
      inc.classList.add('is-entering', 'is-active');
      void inc.offsetWidth;                         // commit the start state, then let it transition
      inc.classList.remove('is-entering');
      cleanupTimer = setTimeout(() => out.classList.remove('is-prev'), 1100 * slowFactor());
    }

    /* auto-advance when the active progress bar completes */
    section.addEventListener('animationend', (e) => {
      if (e.animationName !== 'progress' || !e.target.closest('.is-active')) return;
      if (!autoplayOn() || SHOT || section.hidden) return;
      go(index + 1, { dir: 'next' });
    });

    triggers.forEach((t, k) => t.addEventListener('click', () => {
      if (lastPointer === 'touch' && !settings.userStopped) { settings.userStopped = true; syncAutoplay(); }
      go(k);
    }));

    section.addEventListener('pointerenter', (e) => { if (settings.hoverPause && e.pointerType !== 'touch') { pauses.add('hover'); syncPause(); } });
    section.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') { pauses.delete('hover'); syncPause(); } });
    section.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) { pauses.add('focus'); syncPause(); } });
    section.addEventListener('focusout', (e) => { if (!section.contains(e.relatedTarget)) { pauses.delete('focus'); syncPause(); } });
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) pauses.delete('offscreen'); else pauses.add('offscreen');
      syncPause();
    }, { threshold: 0.25 }).observe(section);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauses.add('hidden'); else pauses.delete('hidden');
      syncPause();
    });

    return {
      section,
      go,
      get index() { return index; },
      setHoverPause(on) { if (!on) pauses.delete('hover'); else if (section.matches(':hover')) pauses.add('hover'); syncPause(); },
    };
  }

  let lastPointer = 'mouse';
  document.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);

  /* A: vertical accordion */
  const btnsA = itemsA.map((it) => it.querySelector('.svc-btn'));
  const A = controller(secA, {
    triggers: btnsA,
    axis: 'y',
    onActivate(next) {
      itemsA.forEach((it, k) => {
        it.classList.toggle('is-active', k === next);
        btnsA[k].setAttribute('aria-expanded', String(k === next));
      });
    },
  });
  btnsA.forEach((b, k) => b.addEventListener('keydown', (e) => {
    const map = { ArrowDown: k + 1, ArrowUp: k - 1, Home: 0, End: btnsA.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const t = (map[e.key] + btnsA.length) % btnsA.length;
    btnsA[t].focus();
    A.go(t);
  }));

  /* B: horizontal tabs */
  const tabsB = [...secB.querySelectorAll('.svcb-tab')];
  const panelsB = [...secB.querySelectorAll('.svcb-panel')];
  const tabRow = secB.querySelector('.svcb-tabs');
  let leaveTimer = 0;
  const B = controller(secB, {
    triggers: tabsB,
    axis: 'x',
    onActivate(next, prev, instant) {
      tabsB.forEach((t, k) => {
        const on = k === next;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      clearTimeout(leaveTimer);
      panelsB.forEach((p) => p.classList.remove('is-leaving'));
      if (prev >= 0 && !instant) {
        panelsB[prev].classList.add('is-leaving');
        leaveTimer = setTimeout(() => panelsB[prev].classList.remove('is-leaving'), 320 * slowFactor());
      }
      panelsB.forEach((p, k) => p.classList.toggle('is-active', k === next));
      // keep the active tab in view when the row scrolls (tablet / mobile)
      if (tabRow.scrollWidth > tabRow.clientWidth) {
        const t = tabsB[next];
        tabRow.scrollTo({ left: t.offsetLeft - (tabRow.clientWidth - t.offsetWidth) / 2, behavior: instant ? 'auto' : 'smooth' });
      }
    },
  });
  tabsB.forEach((t, k) => t.addEventListener('keydown', (e) => {
    const map = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: tabsB.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const target = (map[e.key] + tabsB.length) % tabsB.length;
    tabsB[target].focus();
    B.go(target, { dir: e.key === 'ArrowRight' || e.key === 'End' ? 'next' : 'prev' });
  }));
  secB.querySelectorAll('.svcb-arrow').forEach((a) => a.addEventListener('click', () => {
    const step = parseInt(a.dataset.step, 10);
    B.go(B.index + step, { dir: step > 0 ? 'next' : 'prev' });
  }));

  const ctrls = [A, B];

  /* ---------- settings appliers ---------- */
  function setDwell(ms) {
    settings.dwell = ms;
    ctrls.forEach((c) => c.section.style.setProperty('--dwell', `${ms}ms`));
  }
  function setFx(fx) {
    settings.fx = fx;
    ctrls.forEach((c) => { c.section.dataset.fx = fx; });
  }
  function syncAutoplay() {
    ctrls.forEach((c) => c.section.classList.toggle('no-autoplay', !autoplayOn()));
    syncPanel();
  }

  /* ---------- A / B switch ---------- */
  let layout = 'a';
  function setLayout(v, { initial = false } = {}) {
    v = v === 'b' ? 'b' : 'a';
    const from = v === 'a' ? B : A;
    const to = v === 'a' ? A : B;
    if (!initial && v === layout) return;
    layout = v;
    if (!initial) to.go(from.index, { instant: true });   // keep the same service open
    secA.hidden = v !== 'a';
    secB.hidden = v !== 'b';
    abNav.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === v)));
    if (!initial) {
      const url = new URL(location.href);
      url.searchParams.set('v', v);
      history.replaceState(null, '', url);
      try { localStorage.setItem('foley-services-layout', v); } catch {}
    }
  }
  abNav.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-layout]');
    if (b) setLayout(b.dataset.layout);
  });

  /* ---------- boot ---------- */
  root.style.setProperty('--slow', Math.max(1, parseFloat(params.get('slow')) || 1));
  setDwell(settings.dwell);
  setFx(settings.fx);

  let startLayout = params.get('v');
  if (!startLayout) { try { startLayout = localStorage.getItem('foley-services-layout'); } catch {} }

  let start = 0;
  if (SHOT) {
    root.classList.add('shot');
    const n = parseInt(params.get('shot'), 10);
    start = (n >= 1 && n <= itemsA.length ? n : 4) - 1;   // default: Background Checks, as in the mocks
  }
  A.go(start, { instant: true });
  B.go(start, { instant: true });
  setLayout(startLayout || 'a', { initial: true });
  syncAutoplay();

  /* ---------- demo panel ---------- */
  function syncPanel() {
    if (!panel) return;
    const cur = {
      autoplay: autoplayOn() ? 'on' : 'off',
      dwell: String(settings.dwell),
      hoverpause: settings.hoverPause ? 'on' : 'off',
      fx: settings.fx,
      slow: String(slowFactor()),
    };
    panel.querySelectorAll('.seg').forEach((seg) => {
      seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === cur[seg.dataset.key])));
    });
  }

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const key = b.closest('.seg').dataset.key;
    const v = b.dataset.v;
    if (key === 'autoplay') { settings.autoplay = v === 'on'; settings.userStopped = false; syncAutoplay(); }
    if (key === 'dwell') setDwell(parseInt(v, 10));
    if (key === 'hoverpause') { settings.hoverPause = v === 'on'; ctrls.forEach((c) => c.setHoverPause(settings.hoverPause)); }
    if (key === 'fx') setFx(v);
    if (key === 'slow') root.style.setProperty('--slow', v);
    syncPanel();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === '.') { panel.hidden = !panel.hidden; syncPanel(); }
    else if (e.key === 'Escape') panel.hidden = true;
  });
  if (params.has('panel')) panel.hidden = false;
  syncPanel();
})();
