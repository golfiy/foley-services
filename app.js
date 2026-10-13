(() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const SHOT = params.has('shot');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const section = document.querySelector('.svc');
  const items = [...section.querySelectorAll('.svc-item')];
  const photos = [...section.querySelectorAll('.ph')];
  const buttons = items.map((it) => it.querySelector('.svc-btn'));
  const panel = document.getElementById('demo');

  const state = {
    i: -1,
    autoplay: !reduceMotion && params.get('autoplay') !== '0',
    userStopped: false,          // a tap on touch stops autoplay so the reader is not interrupted
    dwell: 6000,
    fx: params.get('fx') || (reduceMotion ? 'fade' : 'wipe'),
  };
  const pauses = new Set();      // hover / focus / offscreen / hidden
  let cleanupTimer = 0;

  /* ---------- settings ---------- */
  function setDwell(ms) {
    state.dwell = ms;
    section.style.setProperty('--dwell', `${ms}ms`);
  }
  function setFx(fx) {
    state.fx = fx;
    section.dataset.fx = fx;
  }
  function syncAutoplay() {
    const on = state.autoplay && !state.userStopped;
    section.classList.toggle('no-autoplay', !on);
  }
  function syncPause() {
    section.classList.toggle('is-paused', pauses.size > 0);
  }
  const slowFactor = () => parseFloat(getComputedStyle(root).getPropertyValue('--slow')) || 1;

  /* ---------- core ---------- */
  function go(next, { dir, instant = false } = {}) {
    next = (next + items.length) % items.length;
    if (next === state.i) return;
    const prev = state.i;
    state.i = next;

    items.forEach((it, k) => {
      const on = k === next;
      it.classList.toggle('is-active', on);
      buttons[k].setAttribute('aria-expanded', String(on));
    });

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

    inc.dataset.from = dir || (next > prev ? 'below' : 'above');
    inc.classList.add('is-entering', 'is-active');
    void inc.offsetWidth;                         // commit the start state, then let it transition
    inc.classList.remove('is-entering');

    cleanupTimer = setTimeout(() => out.classList.remove('is-prev'), 1100 * slowFactor());
  }

  /* auto-advance when the active progress bar completes */
  section.addEventListener('animationend', (e) => {
    if (e.animationName !== 'progress') return;
    if (!e.target.closest('.svc-item')?.classList.contains('is-active')) return;
    if (!state.autoplay || state.userStopped || SHOT) return;
    go(state.i + 1, { dir: 'below' });
  });

  /* ---------- input ---------- */
  let lastPointer = 'mouse';
  document.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);

  buttons.forEach((b, k) => {
    b.addEventListener('click', () => {
      if (lastPointer === 'touch' && !state.userStopped) {
        state.userStopped = true;
        syncAutoplay();
      }
      go(k);
    });
    b.addEventListener('keydown', (e) => {
      const map = { ArrowDown: k + 1, ArrowUp: k - 1, Home: 0, End: items.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      const t = (map[e.key] + items.length) % items.length;
      buttons[t].focus();
      go(t);
    });
  });

  section.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') { pauses.add('hover'); syncPause(); } });
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

  /* ---------- review modes ---------- */
  root.style.setProperty('--slow', Math.max(1, parseFloat(params.get('slow')) || 1));
  setDwell(Math.max(2000, parseInt(params.get('dwell'), 10) || 6000));
  setFx(state.fx);

  if (SHOT) {
    root.classList.add('shot');
    const n = parseInt(params.get('shot'), 10);
    go((n >= 1 && n <= items.length ? n : 4) - 1, { instant: true });   // default: Background Checks, as in the mock
  } else {
    go(0, { instant: true });
  }
  syncAutoplay();
  syncPause();

  /* ---------- demo panel ---------- */
  function syncPanel() {
    const cur = {
      autoplay: state.autoplay && !state.userStopped ? 'on' : 'off',
      dwell: String(state.dwell),
      fx: state.fx,
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
    if (key === 'autoplay') { state.autoplay = v === 'on'; state.userStopped = false; syncAutoplay(); }
    if (key === 'dwell') setDwell(parseInt(v, 10));
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
