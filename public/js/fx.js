// SinCalma — motion engine (ported from the design handoff).
const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
const KF = {
  up: [{ opacity: 0, transform: 'translateY(56px)' }, { opacity: 1, transform: 'none' }],
  mask: [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(40%)' }, { clipPath: 'inset(0 0 -10% 0)', transform: 'none' }],
  fade: [{ opacity: 0 }, { opacity: 1 }],
  scale: [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 1, transform: 'none' }],
  wipe: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
  open: [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' }],
  rise: [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)' }],
  dots: [{ filter: 'grayscale(1) contrast(5) blur(10px)', opacity: 0.25 }, { filter: 'grayscale(0) contrast(1) blur(0px)', opacity: 1 }],
};

export function createEngine(root, { reduced = false } = {}) {
  const hooks = [];
  const noReveal = reduced || document.hidden;
  let alive = true, lastY = scrollY, vel = 0, raf = 0, t0 = performance.now();
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, nx: 0.5, ny: 0.5, sx: 0.5, sy: 0.5, active: false };
  const onMove = (e) => { const p = e.touches ? e.touches[0] : e; ptr.x = p.clientX; ptr.y = p.clientY; ptr.nx = p.clientX / innerWidth; ptr.ny = p.clientY / innerHeight; ptr.active = true; };
  addEventListener('pointermove', onMove, { passive: true });

  const anims = new Map();
  const guard = (a) => setTimeout(() => { if (a.playState === 'running' && (a.currentTime || 0) < 60) a.finish(); }, 1600);
  let rafSeen = false, throttled = false;
  setTimeout(() => { if (!rafSeen) { throttled = true; anims.forEach((a) => a.finish()); } }, 500);
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const a = anims.get(e.target); if (a && a.playState !== 'finished') { a.play(); guard(a); } io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const scanReveals = () => {
    if (noReveal) return;
    root.querySelectorAll('[data-in]').forEach((el) => {
      if (anims.has(el)) return;
      const a = el.animate(KF[el.dataset.in] || KF.up, { duration: reduced ? 1 : +(el.dataset.dur || 1200), delay: reduced ? 0 : +(el.dataset.delay || 0), easing: 'cubic-bezier(.16,.84,.24,1)', fill: 'both' });
      a.pause(); a.currentTime = 0; anims.set(el, a);
      if (throttled) a.finish(); else if (el.dataset.now !== undefined) { a.play(); guard(a); } else if (CLIPS.has(el.dataset.in)) pendingClip.add(el); else io.observe(el);
    });
  };
  // Variants that start fully clipped have zero visible area, so IntersectionObserver never
  // reports them. Trigger those from their layout box on each frame instead.
  const CLIPS = new Set(['mask', 'wipe', 'open', 'rise']);
  const pendingClip = new Set();
  const checkClips = () => {
    if (!pendingClip.size) return;
    const vh = innerHeight, vw = innerWidth;
    pendingClip.forEach((el) => {
      const r = el.getBoundingClientRect(); const h = Math.max(1, r.height);
      const visH = Math.min(r.bottom, vh * 0.94) - Math.max(r.top, 0);
      if (r.width > 0 && r.right > 0 && r.left < vw && visH / Math.min(h, vh) > 0.12) {
        pendingClip.delete(el); const a = anims.get(el); if (a && a.playState !== 'finished') { a.play(); guard(a); }
      }
    });
  };
  const marquees = new Map();
  const scanMarquees = () => {
    root.querySelectorAll('[data-marquee]').forEach((el) => {
      if (marquees.has(el)) return;
      const rev = el.dataset.marquee === 'rev';
      const a = el.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-50%,0,0)' }], { duration: +(el.dataset.speed || 30000), iterations: Infinity });
      if (rev) a.playbackRate = -1;
      marquees.set(el, { a, base: rev ? -1 : 1, cur: rev ? -1 : 1 });
    });
  };
  const scan = () => { scanReveals(); scanMarquees(); };
  scan();

  const progressOf = (el) => {
    const r = el.getBoundingClientRect(); const vh = innerHeight; const span = r.height - vh;
    if (el.dataset.pin === 'enter') return clamp((vh - r.top) / (vh + r.height));
    return span > 1 ? clamp(-r.top / span) : clamp((vh - r.top) / (vh + r.height));
  };
  const visibleOf = (el) => { const r = el.getBoundingClientRect(); return r.bottom > -200 && r.top < innerHeight + 200; };

  const frame = (now) => {
    if (!alive) return;
    rafSeen = true;
    checkClips();
    const y = scrollY; const dv = y - lastY; lastY = y; vel += (dv - vel) * 0.12;
    ptr.sx += (ptr.nx - ptr.sx) * 0.08; ptr.sy += (ptr.ny - ptr.sy) * 0.08;
    const t = (now - t0) / 1000;
    if (!ptr.active) { ptr.nx = 0.5 + Math.sin(t * 0.35) * 0.22; ptr.ny = 0.45 + Math.cos(t * 0.27) * 0.16; }
    root.style.setProperty('--mx', (ptr.sx * 100).toFixed(2) + '%');
    root.style.setProperty('--my', (ptr.sy * 100).toFixed(2) + '%');
    root.style.setProperty('--scrolled', clamp(y / 160).toFixed(3));
    root.querySelectorAll('[data-pin]').forEach((el) => { if (visibleOf(el)) el.style.setProperty('--p', progressOf(el).toFixed(4)); });
    root.querySelectorAll('[data-spin]').forEach((el) => { el.style.rotate = ((t * +el.dataset.spin) % 360).toFixed(2) + 'deg'; });
    root.querySelectorAll('[data-pulse]').forEach((el, i) => { el.style.scale = (1 + Math.sin(t * 2.2 + i) * +el.dataset.pulse).toFixed(3); });
    root.querySelectorAll('[data-par]').forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.bottom < -300 || r.top > innerHeight + 300) return;
      const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; el.style.translate = `0 ${(c * +el.dataset.par * -100).toFixed(1)}px`;
    });
    if (!reduced) marquees.forEach((m) => {
      const boost = 1 + Math.min(Math.abs(vel) / 6, 5); const dir = vel < -0.6 ? -1 : vel > 0.6 ? 1 : Math.sign(m.cur) || 1;
      const target = m.base * dir * boost; m.cur += (target - m.cur) * 0.08; m.a.playbackRate = m.cur;
    });
    const st = { y, t, vel, vw: innerWidth, vh: innerHeight, ptr, progressOf, visibleOf, reduced };
    for (const h of hooks) h(st);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    onFrame: (fn) => hooks.push(fn), rescan: scan, progressOf,
    destroy() { alive = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener('pointermove', onMove); anims.forEach((a) => a.cancel()); marquees.forEach((m) => m.a.cancel()); },
  };
}

export function grain(canvas, { alpha = 26, fps = 14 } = {}) {
  const w = 220, h = 220; canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(w, h); let alive = true, last = 0;
  const loop = (now) => {
    if (!alive) return;
    if (now - last > 1000 / fps && onScreen(canvas)) { last = now; const d = id.data; for (let i = 0; i < d.length; i += 4) { const v = (Math.random() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = alive ? alpha : 0; } ctx.putImageData(id, 0, 0); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return () => { alive = false; };
}

export function timecode(el) {
  const s = performance.now(); let alive = true;
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => { if (!alive) return; const t = (performance.now() - s) / 1000; el.textContent = `${pad((t / 3600) | 0)}:${pad(((t / 60) | 0) % 60)}:${pad((t | 0) % 60)}:${pad(((t * 25) | 0) % 25)}`; requestAnimationFrame(tick); };
  tick(); return () => { alive = false; };
}

export function clock(el, tz = 'America/Argentina/Buenos_Aires') {
  const f = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz });
  const tick = () => { el.textContent = f.format(new Date()); }; tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
}

// Audio bars. With `audioOnly`, they only move when `source` returns a level (sound on);
// otherwise they ease down and rest flat.
export function bars(container, { min = 0.08, energy = 1, source = null, audioOnly = false } = {}) {
  const kids = [...container.children]; let alive = true; const seeds = kids.map(() => Math.random() * 10); const cur = kids.map(() => min);
  const loop = (now) => {
    if (!alive) return; const t = now / 1000;
    kids.forEach((k, i) => {
      const lv = source ? source(i, kids.length) : -1;
      let target;
      if (lv >= 0) target = min + Math.pow(lv, 1.3) * (1 - min) * energy;
      else if (audioOnly) target = min;
      else target = min + Math.abs(Math.sin(t * (2.1 + (i % 5) * 0.37) + seeds[i]) * Math.sin(t * 0.9 + i * 0.6)) * (1 - min) * energy;
      const next = cur[i] + (target - cur[i]) * (lv >= 0 || !audioOnly ? 0.6 : 0.12);
      if (Math.abs(next - cur[i]) < 0.0005 && Math.abs(target - cur[i]) < 0.001) return;
      cur[i] = next; k.style.transform = `scaleY(${next.toFixed(3)})`;
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop); return () => { alive = false; };
}

// Interactive halftone: renders an image as a dot screen; dots swell around the pointer and scatter with --scatter.
export function halftone(canvas, src, opts = {}) {
  const o = { bg: '#3842E7', ink: '#FFFFFF', mid: '#AECBFF', accent: '#51FF00', cell: 11, focusY: 0.5, ...opts };
  const ctx = canvas.getContext('2d'); let alive = true, cells = [], cols = 0, rows = 0, W = 0, H = 0, cell = o.cell, scatter = 0, img = new Image();
  const ptr = { x: -999, y: -999, sx: -999, sy: -999 };
  const sample = () => {
    if (!img.naturalWidth) return; const dpr = Math.min(devicePixelRatio || 1, 1.6);
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = W < 700 ? Math.max(7, o.cell - 3) : o.cell; cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / cell) + 1;
    const off = document.createElement('canvas'); off.width = cols; off.height = rows; const ox = off.getContext('2d', { willReadFrequently: true });
    const ir = img.naturalWidth / img.naturalHeight, cr = W / H; let sw, sh, sx, sy;
    if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) / 2; sy = 0; } else { sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) * o.focusY; }
    ox.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows); const d = ox.getImageData(0, 0, cols, rows).data; cells = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 4, R = d[k], G = d[k + 1], B = d[k + 2]; const lum = (0.3 * R + 0.59 * G + 0.11 * B) / 255;
      const green = G > 150 && G - B > 70 && G - R > 40; cells.push({ x: i * cell, y: j * cell, l: lum, g: green, a: Math.random() * Math.PI * 2, s: 0.4 + Math.random() });
    }
  };
  img.onload = () => { sample(); draw(performance.now()); }; img.src = src;
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; };
  const onLeave = () => { ptr.x = -999; ptr.y = -999; };
  addEventListener('pointermove', onMove, { passive: true }); canvas.addEventListener('pointerleave', onLeave);
  const ro = new ResizeObserver(() => { sample(); draw(performance.now()); }); ro.observe(canvas);
  const draw = (now) => {
    const t = now / 1000;
    if (ptr.x < -900) { ptr.sx += ((W * (0.5 + Math.sin(t * 0.4) * 0.25)) - ptr.sx) * 0.03; ptr.sy += ((H * (0.45 + Math.cos(t * 0.3) * 0.18)) - ptr.sy) * 0.03; }
    else { ptr.sx += (ptr.x - ptr.sx) * 0.14; ptr.sy += (ptr.y - ptr.sy) * 0.14; }
    ctx.fillStyle = o.bg; ctx.fillRect(0, 0, W, H);
    const lens = Math.min(W, H) * 0.22, l2 = lens * lens, scanY = ((t * 0.12) % 1.3 - 0.15) * H, half = cell / 2;
    const paths = { ink: new Path2D(), mid: new Path2D(), acc: new Path2D() };
    for (const c of cells) {
      const dx = c.x - ptr.sx, dy = c.y - ptr.sy; const near = Math.exp(-(dx * dx + dy * dy) / l2);
      const scan = Math.exp(-Math.pow((c.y - scanY) / (cell * 3), 2)) * 0.5;
      let r = half * Math.pow(c.l, 1.15) * (0.92 + near * 0.9 + scan);
      if (r < 0.5) continue; r = Math.min(r, half * 1.6);
      const px = c.x + half + Math.cos(c.a) * scatter * 260 * c.s - dx * near * 0.12, py = c.y + half + Math.sin(c.a) * scatter * 260 * c.s - dy * near * 0.12;
      const p = c.g ? paths.acc : c.l > 0.62 ? paths.ink : paths.mid; p.moveTo(px + r, py); p.arc(px, py, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = o.mid; ctx.fill(paths.mid); ctx.fillStyle = o.ink; ctx.fill(paths.ink); ctx.fillStyle = o.accent; ctx.fill(paths.acc);
  };
  const loop = (now) => { if (!alive) return; if (onScreen(canvas)) draw(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  return { setScatter: (v) => { scatter = v; }, destroy() { alive = false; ro.disconnect(); removeEventListener('pointermove', onMove); } };
}

// Custom cursor: green dot + ring that morphs over [data-cursor] targets and shows their label.
export function cursor(root) {
  if (matchMedia('(pointer: coarse)').matches) return () => {};
  const dot = document.createElement('div'), ring = document.createElement('div'), lab = document.createElement('span');
  dot.style.cssText = 'position:fixed;left:0;top:0;width:38px;height:12px;margin:-6px 0 0 -19px;background:url(/assets/star-green.png) center/contain no-repeat;z-index:9999;pointer-events:none;transition:opacity .2s';
  ring.style.cssText = 'position:fixed;left:0;top:0;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:1.5px solid rgba(255,255,255,.5);z-index:9998;pointer-events:none;display:flex;align-items:center;justify-content:center;transition:width .35s cubic-bezier(.2,.8,.2,1),height .35s cubic-bezier(.2,.8,.2,1),margin .35s cubic-bezier(.2,.8,.2,1),background .35s,border-color .35s';
  lab.style.cssText = 'font:600 11px/1 Archivo,sans-serif;letter-spacing:.12em;color:#000;opacity:0;transition:opacity .25s';
  ring.appendChild(lab); document.body.append(ring, dot);
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, alive = true, big = false;
  const mv = (e) => { x = e.clientX; y = e.clientY; const t = e.target.closest && e.target.closest('a,button,[data-cursor]'); const label = t ? (t.dataset.cursor || '') : null;
    if (!!t !== big || (t && lab.textContent !== label)) { big = !!t; const s = big ? (label ? 72 : 52) : 36; ring.style.width = ring.style.height = s + 'px'; ring.style.margin = (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px'; ring.style.background = label ? 'rgba(81,255,0,.92)' : 'transparent'; ring.style.borderColor = big ? '#51FF00' : 'rgba(255,255,255,.5)'; lab.textContent = label || ''; lab.style.opacity = label ? 1 : 0; dot.style.opacity = big ? 0 : 1; } };
  addEventListener('pointermove', mv, { passive: true });
  const loop = () => { if (!alive) return; rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; dot.style.transform = 'translate(' + x + 'px,' + y + 'px)'; ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)'; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  return () => { alive = false; removeEventListener('pointermove', mv); dot.remove(); ring.remove(); };
}

// Synthesized studio drone (no audio files). Returns {toggle, level()}.
export function drone() {
  let ctx = null, master, an, data, on = false;
  const build = () => {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.55; an.minDecibels = -90; an.maxDecibels = -36; data = new Uint8Array(an.frequencyBinCount);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 6;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.08; lfoG.gain.value = 500; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    [55, 82.41, 110.3, 164.8].forEach((f, i) => { const o = ctx.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 7; const g = ctx.createGain(); g.gain.value = 0.16 / (i + 1); o.connect(g); g.connect(lp); o.start(); });
    const pulse = ctx.createOscillator(), pg = ctx.createGain(); pulse.frequency.value = 2; pg.gain.value = 0.25; const amp = ctx.createGain(); amp.gain.value = 0.75; pulse.connect(pg); pg.connect(amp.gain); pulse.start();
    lp.connect(amp); amp.connect(master); master.connect(an); an.connect(ctx.destination);
  };
  return {
    toggle() { if (!ctx) build(); on = !on; if (ctx.state === 'suspended') ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(on ? 0.35 : 0, ctx.currentTime + (on ? 1.6 : 0.6)); return on; },
    // One band per bar, log-spaced over the drone's real range (≈45 Hz – 1.8 kHz).
    level(i = 0, n = 12) {
      if (!an || !on) return -1;
      const now = ctx.currentTime; if (now !== this._t) { this._t = now; an.getByteFrequencyData(data); }
      const hz = ctx.sampleRate / an.fftSize, f0 = 45 * Math.pow(40, i / n), f1 = 45 * Math.pow(40, (i + 1) / n);
      let a = Math.floor(f0 / hz), b = Math.max(a + 1, Math.ceil(f1 / hz)), peak = 0;
      for (let k = a; k < b && k < data.length; k++) peak = Math.max(peak, data[k]);
      return Math.min(1, (peak / 255) * (0.82 + i * 0.045));
    },
    get on() { return on; },
  };
}

// Decode/scramble text on reveal: [data-scramble] elements (plain text only).
export function scramble(root) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; io.unobserve(e.target); run(e.target); }), { threshold: 0.4 });
  const run = (el) => { const final = el.dataset.text || el.textContent; el.dataset.text = final; const D = 900, s = performance.now();
    const tick = (now) => { const t = Math.min(1, (now - s) / D); el.textContent = final.split('').map((c, i) => (c === ' ' || i / final.length < t) ? c : chars[(Math.random() * chars.length) | 0]).join(''); if (t < 1) requestAnimationFrame(tick); else el.textContent = final; };
    requestAnimationFrame(tick); };
  root.querySelectorAll('[data-scramble]').forEach((el) => io.observe(el));
  return () => io.disconnect();
}

// Inertia scroll (desktop): wheel → lerped window scroll; anchors glide.
export function smooth() {
  if (matchMedia('(pointer: coarse)').matches) return () => {};
  document.documentElement.style.scrollBehavior = 'auto';
  let target = scrollY, cur = scrollY, active = false, alive = true;
  const max = () => document.documentElement.scrollHeight - innerHeight;
  const onWheel = (e) => { if (document.body.classList.contains('locked') || e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; e.preventDefault(); if (!active) { target = cur = scrollY; } active = true; target = Math.max(0, Math.min(max(), target + e.deltaY * (e.deltaMode === 1 ? 40 : 1))); };
  const onClick = (e) => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href').slice(1); const el = id === 'top' ? null : document.getElementById(id); if (id !== 'top' && !el) return; e.preventDefault(); cur = scrollY; target = el ? Math.min(max(), el.getBoundingClientRect().top + scrollY) : 0; active = true; };
  const onKey = () => { active = false; };
  addEventListener('wheel', onWheel, { passive: false }); addEventListener('click', onClick); addEventListener('keydown', onKey); addEventListener('pointerdown', onKey);
  const loop = () => { if (!alive) return; if (active) { cur += (target - cur) * 0.085; if (Math.abs(target - cur) < 0.6) { cur = target; active = false; } scrollTo(0, cur); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  return () => { alive = false; removeEventListener('wheel', onWheel); removeEventListener('click', onClick); removeEventListener('keydown', onKey); removeEventListener('pointerdown', onKey); document.documentElement.style.scrollBehavior = ''; };
}

// Magnetic [data-magnet] + star burst on click.
export function magnets(root) {
  if (matchMedia('(pointer: coarse)').matches) return () => {};
  const els = [...root.querySelectorAll('[data-magnet]')];
  const mv = (e) => { els.forEach((el) => { const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); const R = Math.max(r.width, r.height) * 0.9 + 40; el.style.transition = 'translate .5s cubic-bezier(.2,.8,.2,1)'; el.style.translate = d < R ? (dx * 0.28).toFixed(1) + 'px ' + (dy * 0.35).toFixed(1) + 'px' : '0 0'; }); };
  const burst = (e) => { for (let i = 0; i < 7; i++) { const s = document.createElement('img'); s.src = '/assets/star-green.png'; s.alt = ''; const w = 30 + Math.random() * 40; s.style.cssText = 'position:fixed;z-index:9997;pointer-events:none;left:' + e.clientX + 'px;top:' + e.clientY + 'px;width:' + w + 'px;margin:' + (-w * 0.16) + 'px 0 0 ' + (-w / 2) + 'px'; document.body.appendChild(s); const a = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 90, rot = Math.random() * 360; const an = s.animate([{ transform: 'translate(0,0) rotate(' + rot + 'deg) scale(.2)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * dist + 'px,' + Math.sin(a) * dist + 'px) rotate(' + (rot + 140) + 'deg) scale(1)', opacity: 0 }], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.16,.84,.24,1)' }); an.onfinish = () => s.remove(); } };
  addEventListener('pointermove', mv, { passive: true }); addEventListener('pointerdown', burst);
  return () => { removeEventListener('pointermove', mv); removeEventListener('pointerdown', burst); };
}

// Scan-glitch cut when a [data-cut] section crosses the viewport center.
export function cuts(root) {
  const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;z-index:80;pointer-events:none;display:flex;flex-direction:column';
  const strips = []; for (let i = 0; i < 16; i++) { const s = document.createElement('div'); const k = i % 5; s.style.cssText = 'flex:1;opacity:0;' + (k === 0 || k === 3 ? 'background:#fff;mix-blend-mode:difference' : k === 2 ? 'background:#51FF00;flex:.35' : 'background:#3842E7'); ov.appendChild(s); strips.push(s); }
  document.body.appendChild(ov);
  let last = 0; const born = performance.now();
  const fire = () => { const now = performance.now(); if (now - born < 1500 || now - last < 1100) return; last = now; strips.forEach((s) => { if (Math.random() < 0.4) return; const dx = (Math.random() * 2 - 1) * 30; s.animate([{ opacity: 0, transform: 'translateX(' + dx + '%)' }, { opacity: 1, transform: 'translateX(' + (-dx * 0.6) + '%)', offset: 0.35 }, { opacity: 0, transform: 'translateX(0)' }], { duration: 380 + Math.random() * 220, delay: Math.random() * 90, easing: 'steps(5)' }); }); };
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) fire(); }), { rootMargin: '-49% 0px -49% 0px' });
  root.querySelectorAll('[data-cut]').forEach((el) => io.observe(el));
  return () => { io.disconnect(); ov.remove(); };
}

// Per-letter mask reveal for [data-split] (static text only).
export function splitReveal(root) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; io.unobserve(e.target); e.target.querySelectorAll('[data-ch]').forEach((c, i) => c.animate([{ transform: 'translateY(115%) rotate(6deg)' }, { transform: 'none' }], { duration: 1000, delay: i * 32, easing: 'cubic-bezier(.16,.84,.24,1)', fill: 'both' })); }), { threshold: 0.3 });
  root.querySelectorAll('[data-split]').forEach((el) => {
    if (el._split) return; el._split = true;
    [...el.childNodes].forEach((n) => { if (n.nodeType !== 3) return; const frag = document.createDocumentFragment();
      [...n.textContent].forEach((ch) => { if (ch === ' ' || ch === '\n') { frag.appendChild(document.createTextNode(' ')); return; } const o = document.createElement('span'); o.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em;margin-bottom:-.08em'; const i = document.createElement('span'); i.dataset.ch = ''; i.style.cssText = 'display:inline-block;transform:translateY(115%)'; i.textContent = ch; o.appendChild(i); frag.appendChild(o); });
      n.replaceWith(frag); });
    io.observe(el);
  });
  return () => io.disconnect();
}

// Living membrane: drifting rings, joined with dots where they intersect; pointer pulls them.
export function rings(canvas, { color = '#FFFFFF', count = 13 } = {}) {
  const ctx = canvas.getContext('2d'); let W = 0, H = 0, alive = true; const ptr = { x: -9999, y: -9999 };
  const R = []; const size = () => { const r = canvas.getBoundingClientRect(); const d = Math.min(devicePixelRatio || 1, 1.6); W = r.width; H = r.height; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  size(); const ro = new ResizeObserver(size); ro.observe(canvas);
  for (let i = 0; i < count; i++) R.push({ bx: Math.random(), by: Math.random(), r: 0.05 + Math.random() * 0.11, ph: Math.random() * 9, sp: 0.15 + Math.random() * 0.25, x: 0, y: 0 });
  const mv = (e) => { const r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; };
  addEventListener('pointermove', mv, { passive: true });
  const loop = (now) => { if (!alive) return; if (!onScreen(canvas)) return requestAnimationFrame(loop); const t = now / 1000; ctx.clearRect(0, 0, W, H); const M = Math.min(W, H);
    R.forEach((c) => { let x = (c.bx + Math.sin(t * c.sp + c.ph) * 0.06) * W, y = (c.by + Math.cos(t * c.sp * 0.8 + c.ph) * 0.06) * H; const dx = ptr.x - x, dy = ptr.y - y, d = Math.hypot(dx, dy); const pull = Math.exp(-d / (M * 0.35)) * 0.25; c.x = x + dx * pull; c.y = y + dy * pull; c.rr = c.r * M * (1 + Math.sin(t * 0.9 + c.ph) * 0.08); });
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.2; ctx.beginPath(); R.forEach((c) => { ctx.moveTo(c.x + c.rr, c.y); ctx.arc(c.x, c.y, c.rr, 0, Math.PI * 2); }); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d > a.rr + b.rr || d < Math.abs(a.rr - b.rr) || d === 0) continue; const l = (a.rr * a.rr - b.rr * b.rr + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a.rr * a.rr - l * l)); const mx = a.x + dx * l / d, my = a.y + dy * l / d; [[mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]].forEach(([px, py]) => { ctx.moveTo(px + 5, py); ctx.arc(px, py, 5, 0, Math.PI * 2); }); }
    ctx.fill(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  return () => { alive = false; ro.disconnect(); removeEventListener('pointermove', mv); };
}
