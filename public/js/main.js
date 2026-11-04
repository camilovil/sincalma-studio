// SinCalma Studio — landing app
import * as fx from './fx.js';

// ───────────── Client config (pending: real WhatsApp, Instagram and hours) ─────────────
const CONFIG = {
  whatsapp: '5491100000000',      // placeholder — formato internacional sin "+"
  instagram: 'sincalma.studio',   // placeholder
  openHour: 10,                   // horario de atención (hora de Buenos Aires)
  closeHour: 22,
  tz: 'America/Argentina/Buenos_Aires',
};

const SERVICES = ['Grabación', 'Producción', 'Mezcla y master', 'Otra consulta'];
const WHENS = ['Esta semana', 'Este mes', 'Sin fecha aún'];

// Instagram tunnel — placeholder moodboard posts until the real feed arrives.
const IG_POSTS = [
  [-30, -20, 'poster-sincalma.jpg'], [28, -24, 'photo-blue-nails.jpg'], [-26, 22, 'photo-halftone.jpg'],
  [32, 18, 'photo-bw-nails.jpg'], [-6, -30, 'texture-membrane.jpg'], [8, 30, 'photo-eye-star.jpg'],
  [-36, 2, 'photo-duo-glitch.jpg'], [38, -4, 'poster-sincalma.jpg'], [-18, -8, 'photo-blue-nails.jpg'],
  [22, 8, 'photo-halftone.jpg'], [-28, 30, 'photo-bw-nails.jpg'], [16, -34, 'texture-membrane.jpg'],
  [0, 24, 'photo-eye-star.jpg'], [-38, -30, 'photo-duo-glitch.jpg'],
];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const SOLAR = 'invert(1) hue-rotate(180deg) contrast(1.35) saturate(1.8)';

// ───────────── Links ─────────────
const num = String(CONFIG.whatsapp).replace(/\D/g, '');
const ig = String(CONFIG.instagram).replace(/^@/, '');
const igLink = `https://instagram.com/${ig}`;
const wa = (text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
$$('[data-wa="quick"]').forEach((a) => { a.href = wa('¡Hola SinCalma! Quiero reservar una sesión.'); });
$$('[data-wa="visit"]').forEach((a) => { a.href = wa('¡Hola SinCalma! Quiero coordinar una visita al estudio.'); });
$$('[data-ig-link]').forEach((a) => { a.href = igLink; });
$$('[data-ig-text]').forEach((el) => { el.textContent = '@' + ig; });

// ───────────── Booking builder ─────────────
const state = { svc: 0, when: 0, menu: false };
const msgEl = $('[data-message]'), sendEl = $('[data-wa-send]');
const renderMessage = () => {
  const when = WHENS[state.when].toLowerCase();
  const m = state.svc === 3
    ? `¡Hola SinCalma! Tengo una consulta sobre el estudio (${when}).`
    : `¡Hola SinCalma! Quiero reservar una sesión de ${SERVICES[state.svc].toLowerCase()} (${when}). ¿Qué disponibilidad tienen?`;
  if (msgEl) msgEl.textContent = m;
  if (sendEl) sendEl.href = wa(m);
};
$$('[data-chips]').forEach((group) => {
  const key = group.dataset.chips; const chips = $$('.chip', group);
  const pick = (i, focus) => {
    state[key] = i;
    chips.forEach((c, j) => { c.setAttribute('aria-checked', String(i === j)); c.tabIndex = i === j ? 0 : -1; });
    if (focus) chips[i].focus();
    renderMessage();
  };
  chips.forEach((c, i) => {
    c.tabIndex = i === 0 ? 0 : -1;
    c.addEventListener('click', () => {
      pick(i);
      c.animate([{ boxShadow: '0 0 0 0 rgba(81,255,0,.9)' }, { boxShadow: '0 0 0 22px rgba(81,255,0,0)' }], { duration: 700, easing: 'cubic-bezier(.16,.84,.24,1)' });
    });
    c.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return; e.preventDefault(); pick((i + d + chips.length) % chips.length, true);
    });
  });
});
renderMessage();

// Open / closed status from Buenos Aires time
const renderStatus = () => {
  const hr = +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: CONFIG.tz }).format(new Date()) % 24;
  const open = hr >= CONFIG.openHour && hr < CONFIG.closeHour;
  $$('[data-status-dot]').forEach((d) => { d.classList.toggle('on', open); d.classList.toggle('off', !open); });
  $$('[data-status-label]').forEach((el) => { el.textContent = open ? 'ABIERTO AHORA' : 'TE RESPONDEMOS MAÑANA'; });
  $$('[data-status-short]').forEach((el) => { el.textContent = open ? 'Abierto ahora' : 'Te respondemos mañana'; });
};
renderStatus(); setInterval(renderStatus, 60000);

// ───────────── Mobile menu ─────────────
const menu = $('[data-menu]'), menuBtn = $('[data-menu-btn]');
const setMenu = (open) => {
  if (!menu || state.menu === open) return;
  state.menu = open;
  menu.hidden = !open;
  document.body.classList.toggle('locked', open);
  menuBtn.textContent = open ? 'CERRAR' : 'MENÚ';
  menuBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    $$('[data-menu-link]', menu).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], { duration: reduced ? 1 : 700, delay: reduced ? 0 : 60 * i, easing: 'cubic-bezier(.16,.84,.24,1)', fill: 'both' }));
    $('a', menu)?.focus({ preventScroll: true });
  }
};
menuBtn?.addEventListener('click', () => { const open = !state.menu; setMenu(open); if (!open) menuBtn.focus(); });
$$('a[data-menu-link]', menu || document).forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.menu) { setMenu(false); menuBtn.focus(); } });
addEventListener('resize', () => { if (innerWidth >= 1180) setMenu(false); });

// Skip link / in-page anchors: move focus to the section for keyboard users
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', () => {
  const id = a.getAttribute('href').slice(1); const t = id && id !== 'top' && document.getElementById(id);
  if (t && t.hasAttribute('tabindex')) setTimeout(() => t.focus({ preventScroll: true }), 50);
}));

// ───────────── Decorative DOM built in JS ─────────────
// 3D S coin: 15 extrusion layers from deep blue to Dodger Blue
const coinRot = $('[data-coin-rot]');
if (coinRot) {
  const face = $('.coin-face', coinRot); const N = 15;
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1); const l = document.createElement('span');
    l.style.transform = `translateZ(${(-22.5 + i * 1.5).toFixed(1)}px)`;
    l.style.background = `rgb(${Math.round(20 + k * 67)},${Math.round(26 + k * 110)},${Math.round(150 + k * 98)})`;
    coinRot.insertBefore(l, face);
  }
}
// Instagram posts
const igStage = $('[data-ig-stage]');
if (igStage) {
  igStage.innerHTML = IG_POSTS.map(([x, y, src]) => `<a class="ig-post" data-ig-post data-x="${x}" data-y="${y}" href="${igLink}" target="_blank" rel="noopener" data-cursor="VER" tabindex="-1" aria-hidden="true"><img src="/assets/${src}" alt="" loading="lazy" decoding="async"></a>`).join('');
}

// ───────────── Sound (opt-in drone) ─────────────
const drone = fx.drone();
const soundBtn = $('[data-sound]');
soundBtn?.addEventListener('click', () => {
  const on = drone.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  $('[data-sound-label]', soundBtn).textContent = on ? 'ON' : 'OFF';
  $('[data-sound-dot]', soundBtn).classList.toggle('on', on);
});

// ───────────── Loader: the hero logo draws itself ─────────────
const loading = html.classList.contains('js-loading');
const heroSvg = $('[data-trace]');
const footSvg = $('[data-trace-end]');
if (!loading) {
  // No loader this time: bring the hero copy in quickly instead of waiting 3s.
  $$('.hero [data-now]').forEach((el, i) => { el.dataset.delay = String(250 + i * 220); });
}
function runLoader() {
  const L = $('[data-loader]'); const paths = heroSvg ? $$('path', heroSvg) : [];
  try { sessionStorage.setItem('sc-loader', '1'); } catch (e) { /* private mode */ }
  const D = 2300, E = 'cubic-bezier(.65,0,.35,1)';
  L.style.visibility = 'visible';
  setTimeout(() => html.classList.remove('js-loading'), D + 500);
  paths.forEach((p) => {
    const len = p.getTotalLength();
    Object.assign(p.style, { fillOpacity: '0', stroke: '#FFFFFF', strokeWidth: '0.55', strokeDasharray: String(len), strokeDashoffset: String(len) });
    p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: D, easing: E, fill: 'forwards' });
    p.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 650, delay: D - 150, easing: 'ease-out', fill: 'forwards' });
    p.animate([{ strokeOpacity: 1 }, { strokeOpacity: 0 }], { duration: 500, delay: D + 350, fill: 'forwards' });
    const spark = p.cloneNode(); const seg = len * 0.035;
    Object.assign(spark.style, { fill: 'none', fillOpacity: '0', stroke: '#51FF00', strokeWidth: '1.4', strokeLinecap: 'round', strokeDasharray: seg + ' ' + len, strokeDashoffset: String(len + seg) });
    p.parentNode.appendChild(spark);
    const a = spark.animate([{ strokeDashoffset: len + seg, opacity: 1 }, { strokeDashoffset: seg, opacity: 1, offset: 0.97 }, { strokeDashoffset: 0, opacity: 0 }], { duration: D, easing: E, fill: 'forwards' });
    a.onfinish = () => spark.remove();
  });
  const count = $('[data-count]', L); const s = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - s) / D); const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    count.textContent = String(Math.round(e * 100)).padStart(3, '0');
    if (t < 1) return requestAnimationFrame(tick);
    const a = L.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 350, fill: 'forwards' });
    a.onfinish = () => { L.style.visibility = 'hidden'; };
  };
  requestAnimationFrame(tick);
}
if (loading) {
  if (document.hidden) html.classList.remove('js-loading'); else runLoader();
}

// Green spark that travels the logo outline
function spark(svg, { seg = 0.03 + Math.random() * 0.05, width = 1.1 + Math.random() * 0.8, duration = 5200 + Math.random() * 2400, once = false } = {}) {
  if (!svg) return;
  $$('path', svg).forEach((pa) => {
    if (pa.dataset.spark) return;
    const len = pa.getTotalLength(), sg = len * seg; const sp = pa.cloneNode(); sp.dataset.spark = '1';
    Object.assign(sp.style, { fill: 'none', fillOpacity: '0', stroke: '#51FF00', strokeOpacity: '1', strokeWidth: String(width), strokeLinecap: 'round', strokeDasharray: sg + ' ' + len, strokeDashoffset: String(len + sg) });
    pa.parentNode.appendChild(sp);
    const kf = once
      ? [{ strokeDashoffset: len + sg, opacity: 1 }, { strokeDashoffset: sg, opacity: 1, offset: 0.96 }, { strokeDashoffset: 0, opacity: 0 }]
      : (Math.random() < 0.5
        ? [{ strokeDashoffset: len + sg, opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.9 }, { strokeDashoffset: sg, opacity: 0 }]
        : [{ strokeDashoffset: -len, opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.9 }, { strokeDashoffset: 0, opacity: 0 }]);
    const a = sp.animate(kf, { duration, easing: once ? 'cubic-bezier(.65,0,.35,1)' : 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
    a.onfinish = () => sp.remove();
  });
}

// ───────────── Effects & scroll scenes ─────────────
const root = document.body;
const eng = fx.createEngine(root, { reduced });
const grainC = $('[data-grain]'); if (grainC) fx.grain(grainC);
$$('[data-tc]').forEach((el) => fx.timecode(el));
$$('[data-clock]').forEach((el) => fx.clock(el, CONFIG.tz));
$$('[data-bars]').forEach((el) => fx.bars(el, { source: (i, n) => drone.level(i, n), audioOnly: true }));
fx.cursor(root); fx.scramble(root); fx.smooth(); fx.magnets(root); fx.cuts(root); fx.splitReveal(root);
const ringsC = $('[data-rings]'); if (ringsC) fx.rings(ringsC);
const htC = $('[data-halftone]'); if (htC) fx.halftone(htC, '/assets/photo-duo-glitch.jpg', { cell: 9, bg: '#3842E7' });

// Ambient sparks on hero / footer logos every 7–14s
const inView = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
if (!reduced) {
  const sched = () => setTimeout(() => { if (!document.hidden) { if (inView(heroSvg)) spark(heroSvg); if (inView(footSvg)) spark(footSvg); } sched(); }, 7000 + Math.random() * 7000);
  setTimeout(sched, 4200);
}

// Stable small-viewport height (avoids jumps when mobile URL bars show/hide)
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
document.body.appendChild(probe);
let svh = probe.offsetHeight, lastW = innerWidth;
addEventListener('resize', () => { if (!coarse || innerWidth !== lastW) { svh = probe.offsetHeight; lastW = innerWidth; } });

// Tuner
const tun = $('[data-tuner]');
const tLayers = tun ? $$('[data-station]', tun) : [];
const tDial = tun && $('[data-dial]', tun), tFreq = tun && $('[data-freq]', tun), tStatic = tun && $('[data-static]', tun);
if (tStatic) fx.grain(tStatic, { alpha: 70, fps: 20 });
const freqs = [88.1, 92.7, 97.3, 101.9, 106.5];
eng.onFrame((st) => {
  if (!tun || !st.visibleOf(tun)) return;
  const gap = Math.max(200, Math.min(420, st.vw * 0.3)); tun.style.setProperty('--gap', gap + 'px');
  const p = st.progressOf(tun); const raw = fx.clamp(p * 1.15 - 0.05) * 4;
  const near = Math.round(raw), off = Math.min(1, Math.abs(raw - near) * 2);
  const pc = near + (raw - near) * (0.35 + 0.65 * off);
  tDial.style.translate = (-pc * gap).toFixed(1) + 'px 0';
  const i0 = Math.floor(pc), fr = pc - i0; const fq = freqs[Math.min(4, i0)] + (freqs[Math.min(4, i0 + 1)] - freqs[Math.min(4, i0)]) * fr;
  tFreq.textContent = fq.toFixed(1);
  tStatic.style.opacity = (0.12 + off * 0.75).toFixed(3);
  tLayers.forEach((el, i) => {
    const d = Math.abs(pc - i); const o = fx.clamp(1 - d * 2.4);
    el.style.opacity = o.toFixed(3);
    el.style.filter = d > 0.02 ? 'blur(' + (d * 16).toFixed(1) + 'px)' : 'none';
    el.style.translate = (off > 0.1 && !reduced ? ((Math.random() - 0.5) * off * 26).toFixed(1) : 0) + 'px 0';
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  });
});

// 3D coin
const coinEl = $('[data-coin]'), coinRefl = $('[data-coin-refl]');
let coinBoost = 0, coinExtra = 0;
coinEl?.addEventListener('click', () => { coinBoost += 360; });
eng.onFrame((st) => {
  if (!coinRot || !st.visibleOf(coinEl)) return;
  const P = 7.5, fr = (st.t % P) / P, k = fx.clamp(fr / 0.38); const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  coinExtra += Math.sign(coinBoost - coinExtra) * Math.min(Math.abs(coinBoost - coinExtra), 1.1 + Math.abs(coinBoost - coinExtra) * 0.012);
  const ry = (reduced ? 0 : Math.floor(st.t / P) * 360 + e * 360) + coinExtra + (st.ptr.sx - 0.5) * 36 + st.vel * 0.6;
  const rx = (0.5 - st.ptr.sy) * 22;
  coinRot.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
  const nrm = ((ry % 360) + 360) % 360;
  coinRot.style.setProperty('--shine', (110 - (nrm / 360) * 140 + (st.ptr.sx - 0.5) * 40).toFixed(1) + '%');
  if (coinRefl) coinRefl.style.transform = 'rotateX(' + (-rx).toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
});

// Hero zoom, manifesto, gallery, Instagram tunnel, footer, floating CTA
const hero = $('[data-hero]'), man = $('[data-manifest]');
const words = man ? $$('.manifest-text span', man) : [];
const hs = $('[data-hscroll]'), track = hs && $('[data-track]', hs);
const igSec = $('[data-ig]'), igPosts = igSec ? $$('[data-ig-post]', igSec) : [];
const res = $('#reservar'), foot = $('[data-footer]');
const cta = $('[data-float-cta]');
let footTraced = false, ctaOn = false;
eng.onFrame((st) => {
  if (igSec && st.visibleOf(igSec)) {
    const p = st.progressOf(igSec), N = igPosts.length, sp = 480, total = N * sp;
    igPosts.forEach((el, i) => {
      const z = p * (total + 1300) - total + i * sp;
      const o = fx.clamp((z + total * 0.75) / 900) * (1 - fx.clamp((z - 420) / 320));
      el.style.transform = `translate3d(${el.dataset.x}vw, ${el.dataset.y}vh, ${z.toFixed(0)}px)`;
      el.style.opacity = o.toFixed(3); el.style.visibility = z > 840 ? 'hidden' : 'visible';
      el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      if (coarse) el.classList.toggle('sol', z > 60 && z < 520);
    });
  }
  if (hero && st.visibleOf(hero)) {
    const p = st.progressOf(hero);
    hero.style.setProperty('--z', (reduced ? 1 : 1 + fx.easeIn(p) * 58).toFixed(3));
    hero.style.setProperty('--lo', (1 - fx.clamp((p - 0.68) / 0.2)).toFixed(3));
    hero.style.setProperty('--fade', (1 - fx.clamp(p * 3.2)).toFixed(3));
    hero.style.setProperty('--lab', fx.clamp((p - 0.82) / 0.12).toFixed(3));
  }
  if (man && st.visibleOf(man) && !reduced) {
    const p = st.progressOf(man), N = words.length;
    words.forEach((w, i) => { w.style.opacity = (0.13 + 0.87 * fx.clamp(p * 1.35 * N - i)).toFixed(3); });
  }
  if (hs && track) {
    const dist = Math.max(0, track.scrollWidth - st.vw);
    const h = Math.round(dist + svh);
    if (Math.abs((hs._h || 0) - h) > 2) { hs._h = h; hs.style.height = h + 'px'; }
    if (st.visibleOf(hs)) track.style.translate = `${(-st.progressOf(hs) * dist).toFixed(1)}px 0`;
  }
  const heroDone = hero ? hero.getBoundingClientRect().bottom < st.vh * 0.6 : true;
  let resIn = false; if (res) { const r = res.getBoundingClientRect(); resIn = r.top < st.vh && r.bottom > 0; }
  let footIn = false;
  if (foot) {
    const fr = foot.getBoundingClientRect(); footIn = fr.top < st.vh * 0.9;
    if (st.visibleOf(foot)) {
      const p = st.progressOf(foot), k = fx.clamp(p / 0.62);
      foot.style.setProperty('--fz', (reduced ? 1 : 1 + Math.pow(1 - k, 3) * 42).toFixed(3));
      foot.style.setProperty('--fi', (reduced ? 1 : fx.clamp((p - 0.5) / 0.28)).toFixed(3));
      if (!footTraced && k >= 1 && !reduced) { footTraced = true; spark(footSvg, { seg: 0.05, width: 1.6, duration: 2400, once: true }); }
      if (k < 0.2) footTraced = false;
    }
  }
  const mid = st.vh * 0.5;
  const busy = [tun, igSec, hs].some((el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < mid && r.bottom > mid; });
  const show = heroDone && !resIn && !footIn && !busy && !state.menu;
  if (show !== ctaOn && cta) {
    ctaOn = show; root.style.setProperty('--cta', show ? '1' : '0');
    cta.tabIndex = show ? 0 : -1; cta.setAttribute('aria-hidden', String(!show));
  }
});
