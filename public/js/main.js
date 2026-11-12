// SinCalma Studio — landing page behaviour.
import * as fx from './fx.js?v=2026-11-11b'; // bump with the ?v= in index.html on each release

// ───────────── Client data ─────────────
const CONFIG = {
  whatsapp: '5491100000000', // TODO(client): real number, international format without "+"
  instagram: 'sincalmastudio',
  openHour: 10, // replies window, Buenos Aires time
  closeHour: 22,
  tz: 'America/Argentina/Buenos_Aires',
};

const SERVICES = ['Grabación', 'Producción', 'Mezcla y master', 'Otra consulta'];
const WHENS = ['Esta semana', 'Este mes', 'Sin fecha aún'];

// Instagram tunnel: [x vw, y vh, image]. Moodboard images until the real feed is wired in.
const IG_POSTS = [
  [-30, -20, 'poster-sincalma.jpg'],
  [28, -24, 'photo-blue-nails.jpg'],
  [-26, 22, 'photo-halftone.jpg'],
  [32, 18, 'photo-bw-nails.jpg'],
  [-6, -30, 'texture-membrane.jpg'],
  [8, 30, 'photo-eye-star.jpg'],
  [-36, 2, 'photo-duo-glitch.jpg'],
  [38, -4, 'poster-sincalma.jpg'],
  [-18, -8, 'photo-blue-nails.jpg'],
  [22, 8, 'photo-halftone.jpg'],
  [-28, 30, 'photo-bw-nails.jpg'],
  [16, -34, 'texture-membrane.jpg'],
  [0, 24, 'photo-eye-star.jpg'],
  [-38, -30, 'photo-duo-glitch.jpg'],
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const mobile = matchMedia('(max-width: 767px)');

// ───────────── Links ─────────────
const waNumber = CONFIG.whatsapp.replace(/\D/g, '');
const igHandle = CONFIG.instagram.replace(/^@/, '');
const igUrl = `https://instagram.com/${igHandle}`;
const waUrl = (text) => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

$$('[data-wa="quick"]').forEach((a) => (a.href = waUrl('¡Hola SinCalma! Quiero reservar una sesión.')));
$$('[data-wa="visit"]').forEach((a) => (a.href = waUrl('¡Hola SinCalma! Quiero coordinar una visita al estudio.')));
$$('[data-ig-link]').forEach((a) => (a.href = igUrl));
$$('[data-ig-text]').forEach((el) => (el.textContent = '@' + igHandle));

// ───────────── Booking message builder ─────────────
const booking = { svc: 0, when: 0 };
const messageEl = $('[data-message]');
const sendEl = $('[data-wa-send]');

const renderMessage = () => {
  const when = WHENS[booking.when].toLowerCase();
  const text =
    booking.svc === SERVICES.length - 1
      ? `¡Hola SinCalma! Tengo una consulta sobre el estudio (${when}).`
      : `¡Hola SinCalma! Quiero reservar una sesión de ${SERVICES[booking.svc].toLowerCase()} (${when}). ¿Qué disponibilidad tienen?`;
  messageEl.textContent = text;
  sendEl.href = waUrl(text);
};

// Chip groups behave as radio groups (roving tabindex, arrow keys).
$$('[data-chips]').forEach((group) => {
  const key = group.dataset.chips;
  const chips = $$('.chip', group);
  const select = (index, focus = false) => {
    booking[key] = index;
    chips.forEach((chip, i) => {
      chip.setAttribute('aria-checked', String(i === index));
      chip.tabIndex = i === index ? 0 : -1;
    });
    if (focus) chips[index].focus();
    renderMessage();
  };
  chips.forEach((chip, i) => {
    chip.tabIndex = i === 0 ? 0 : -1;
    chip.addEventListener('click', () => {
      select(i);
      chip.animate(
        [{ boxShadow: '0 0 0 0 rgba(81,255,0,.9)' }, { boxShadow: '0 0 0 22px rgba(81,255,0,0)' }],
        { duration: 700, easing: 'cubic-bezier(.16,.84,.24,1)' },
      );
    });
    chip.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      select((i + step + chips.length) % chips.length, true);
    });
  });
});
renderMessage();

// Open / closed, from Buenos Aires time
const renderStatus = () => {
  const hour = +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: CONFIG.tz }).format(new Date()) % 24;
  const open = hour >= CONFIG.openHour && hour < CONFIG.closeHour;
  $$('[data-status-dot]').forEach((dot) => {
    dot.classList.toggle('on', open);
    dot.classList.toggle('off', !open);
  });
  $$('[data-status-label]').forEach((el) => (el.textContent = open ? 'ABIERTO AHORA' : 'TE RESPONDEMOS MAÑANA'));
  $$('[data-status-short]').forEach((el) => (el.textContent = open ? 'Abierto ahora' : 'Te respondemos mañana'));
};
renderStatus();
setInterval(renderStatus, 60_000);

// ───────────── Mobile menu ─────────────
const menu = $('[data-menu]');
const menuBtn = $('[data-menu-btn]');
let menuOpen = false;

const setMenu = (open) => {
  if (menuOpen === open) return;
  menuOpen = open;
  menu.hidden = !open;
  document.body.classList.toggle('locked', open);
  menuBtn.textContent = open ? 'CERRAR' : 'MENÚ';
  menuBtn.setAttribute('aria-expanded', String(open));
  if (!open) return;
  $$('[data-menu-link]', menu).forEach((el, i) =>
    el.animate([{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], {
      duration: reduced ? 1 : 700,
      delay: reduced ? 0 : 60 * i,
      easing: 'cubic-bezier(.16,.84,.24,1)',
      fill: 'both',
    }),
  );
  $('a', menu).focus({ preventScroll: true });
};

menuBtn.addEventListener('click', () => {
  setMenu(!menuOpen);
  if (!menuOpen) menuBtn.focus();
});
$$('a[data-menu-link]', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !menuOpen) return;
  setMenu(false);
  menuBtn.focus();
});
addEventListener('resize', () => {
  if (innerWidth >= 1180) setMenu(false);
});

// In-page anchors: move focus to the target section for keyboard and screen-reader users.
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', () => {
    const id = a.getAttribute('href').slice(1);
    const target = id && id !== 'top' && document.getElementById(id);
    if (target?.hasAttribute('tabindex')) setTimeout(() => target.focus({ preventScroll: true }), 50);
  }),
);

// ───────────── "Leer más" (Sobre SinCalma) ─────────────
$$('[data-more]').forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  const label = $('.more-label', btn);
  panel.setAttribute('aria-hidden', 'true');
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    label.textContent = open ? 'Leer menos' : 'Leer más';
  });
});

// ───────────── Decorative DOM ─────────────
// 3D "S" coin: 15 stacked layers give it depth (Royal Blue body, Dodger Blue near the face).
const coinRot = $('[data-coin-rot]');
const COIN_LAYERS = 15;
const coinFace = $('.coin-face', coinRot);
for (let i = 0; i < COIN_LAYERS; i++) {
  const layer = document.createElement('span');
  layer.style.transform = `translateZ(${(-22.5 + i * 1.5).toFixed(1)}px)`;
  layer.style.background = i < COIN_LAYERS - 4 ? 'var(--royal)' : 'var(--dodger)';
  coinRot.insertBefore(layer, coinFace);
}

$('[data-ig-stage]').innerHTML = IG_POSTS.map(
  ([x, y, src]) =>
    `<a class="ig-post" data-ig-post data-x="${x}" data-y="${y}" href="${igUrl}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">` +
    `<img src="/assets/${src}" alt="" loading="lazy" decoding="async"></a>`,
).join('');

// ───────────── Sound (opt-in drone) ─────────────
const drone = fx.drone();
const soundBtn = $('[data-sound]');
soundBtn.addEventListener('click', () => {
  const on = drone.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  $('[data-sound-label]', soundBtn).textContent = on ? 'ON' : 'OFF';
  $('[data-sound-dot]', soundBtn).classList.toggle('on', on);
});

// ───────────── Loader: the hero logo draws itself (once per session) ─────────────
const heroSvg = $('[data-trace]');
const footSvg = $('[data-trace-end]');
const TRACE_EASING = 'cubic-bezier(.65,0,.35,1)';

function runLoader() {
  const loader = $('[data-loader]');
  const counter = $('[data-count]', loader);
  const D = 2300;
  try {
    sessionStorage.setItem('sc-loader', '1');
  } catch {
    /* storage unavailable (private mode): the loader just shows again next time */
  }
  // Keep the loader visible through its fade-out, after .js-loading is gone.
  loader.style.visibility = 'visible';
  setTimeout(() => html.classList.remove('js-loading'), D + 500);

  $$('path', heroSvg).forEach((path) => {
    const len = path.getTotalLength();
    Object.assign(path.style, {
      fillOpacity: '0',
      stroke: '#FFFFFF',
      strokeWidth: '0.55',
      strokeDasharray: String(len),
      strokeDashoffset: String(len),
    });
    path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: D, easing: TRACE_EASING, fill: 'forwards' });
    path.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 650, delay: D - 150, easing: 'ease-out', fill: 'forwards' });
    path.animate([{ strokeOpacity: 1 }, { strokeOpacity: 0 }], { duration: 500, delay: D + 350, fill: 'forwards' });
  });
  spark(heroSvg, { seg: 0.035, width: 1.4, duration: D, once: true });

  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / D);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    counter.textContent = String(Math.round(e * 100)).padStart(3, '0');
    if (t < 1) return requestAnimationFrame(tick);
    loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 350, fill: 'forwards' }).onfinish = () => {
      loader.style.visibility = 'hidden';
    };
  };
  requestAnimationFrame(tick);
}

if (html.classList.contains('js-loading')) {
  if (document.hidden) html.classList.remove('js-loading');
  else runLoader();
} else {
  // No loader this time: bring the hero copy in right away instead of after the 3 s intro.
  $$('.hero [data-now]').forEach((el, i) => (el.dataset.delay = String(250 + i * 220)));
}

// A green spark that travels the logo outline. `once` = a single full lap (intro / footer).
function spark(svg, { seg = 0.03 + Math.random() * 0.05, width = 1.1 + Math.random() * 0.8, duration = 5200 + Math.random() * 2400, once = false } = {}) {
  $$('path:not([data-spark])', svg).forEach((path) => {
    const len = path.getTotalLength();
    const dash = len * seg;
    const sp = path.cloneNode();
    sp.dataset.spark = '';
    Object.assign(sp.style, {
      fill: 'none',
      fillOpacity: '0',
      stroke: '#51FF00',
      strokeOpacity: '1',
      strokeWidth: String(width),
      strokeLinecap: 'round',
      strokeDasharray: `${dash} ${len}`,
      strokeDashoffset: String(len + dash),
    });
    path.parentNode.appendChild(sp);

    let keyframes;
    if (once) {
      keyframes = [
        { strokeDashoffset: len + dash, opacity: 1 },
        { strokeDashoffset: dash, opacity: 1, offset: 0.96 },
        { strokeDashoffset: 0, opacity: 0 },
      ];
    } else {
      // Random direction, fading in and out
      const [from, to] = Math.random() < 0.5 ? [len + dash, dash] : [-len, 0];
      keyframes = [
        { strokeDashoffset: from, opacity: 0 },
        { opacity: 1, offset: 0.08 },
        { opacity: 1, offset: 0.9 },
        { strokeDashoffset: to, opacity: 0 },
      ];
    }
    sp.animate(keyframes, { duration, easing: once ? TRACE_EASING : 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).onfinish = () =>
      sp.remove();
  });
}

const isInView = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight && r.width > 0;
};

// Ambient sparks on the hero / footer logos every 7–14 s while they are on screen.
if (!reduced) {
  const schedule = () =>
    setTimeout(() => {
      if (!document.hidden) {
        if (isInView(heroSvg)) spark(heroSvg);
        if (isInView(footSvg)) spark(footSvg);
      }
      schedule();
    }, 7000 + Math.random() * 7000);
  setTimeout(schedule, 4200);
}

// ───────────── Effects ─────────────
const eng = fx.createEngine(document.body, { reduced });
$$('[data-grain]').forEach((canvas) => fx.grain(canvas));
$$('[data-tc]').forEach((el) => fx.timecode(el));
$$('[data-clock]').forEach((el) => fx.clock(el, CONFIG.tz));
$$('[data-bars]').forEach((el) => fx.bars(el, { source: (i, n) => drone.level(i, n) }));
$$('[data-rings]').forEach((canvas) => fx.rings(canvas));
fx.scramble(document.body);
fx.splitReveal(document.body);
fx.smoothScroll();
fx.magnets(document.body);

// Halftone band: desktop and tablet only (hidden on phones, see CSS).
const halftoneCanvas = $('[data-halftone]');
let halftoneOn = false;
const initHalftone = () => {
  if (halftoneOn || mobile.matches) return;
  halftoneOn = true;
  fx.halftone(halftoneCanvas, '/assets/photo-duo-glitch.jpg', { cell: 9 });
};
initHalftone();
mobile.addEventListener('change', initHalftone);

// Stable small-viewport height (avoids jumps when mobile URL bars show/hide).
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
document.body.appendChild(probe);
let svh = probe.offsetHeight;
let lastWidth = innerWidth;
addEventListener('resize', () => {
  if (coarse && innerWidth === lastWidth) return;
  svh = probe.offsetHeight;
  lastWidth = innerWidth;
});

// Manifesto: on tablets/phones the pin is only as tall as its content; CSS centres it with --mh.
const manifest = $('[data-manifest]');
const manifestSticky = $('.sticky', manifest);
new ResizeObserver(() => manifest.style.setProperty('--mh', manifestSticky.offsetHeight + 'px')).observe(manifestSticky);

// ───────────── 3D coin ─────────────
const coin = $('[data-coin]');
const coinRefl = $('[data-coin-refl]');
let coinBoost = 0;
let coinExtra = 0;
coin.addEventListener('click', () => (coinBoost += 360));

eng.onFrame((st) => {
  if (!st.visibleOf(coin)) return;
  // A full turn every 7.5 s, eased, plus click boosts and a lean towards the pointer.
  const period = 7.5;
  const k = fx.clamp((st.t % period) / period / 0.38);
  const turn = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const gap = coinBoost - coinExtra;
  coinExtra += Math.sign(gap) * Math.min(Math.abs(gap), 1.1 + Math.abs(gap) * 0.012);

  const ry = (reduced ? 0 : Math.floor(st.t / period) * 360 + turn * 360) + coinExtra + (st.ptr.sx - 0.5) * 36 + st.vel * 0.6;
  const rx = (0.5 - st.ptr.sy) * 22;
  coinRot.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  const angle = ((ry % 360) + 360) % 360;
  coinRot.style.setProperty('--shine', (110 - (angle / 360) * 140 + (st.ptr.sx - 0.5) * 40).toFixed(1) + '%');
  coinRefl.style.transform = `rotateX(${(-rx).toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
});

// ───────────── Scroll scenes ─────────────
const hero = $('[data-hero]');
const heroLogo = $('.hero-logo', hero);
const words = $$('.manifest-text .mw > span', manifest);
const gallery = $('[data-hscroll]');
const track = $('[data-track]', gallery);
const igSection = $('[data-ig]');
const igPosts = $$('[data-ig-post]', igSection);
const bookingSection = $('#reservar');
const footer = $('[data-footer]');
const floatCta = $('[data-float-cta]');
let footTraced = false;
let ctaShown = false;

// Hero: the logo zooms through the screen, then fades out.
eng.onFrame((st) => {
  if (!st.visibleOf(hero)) return;
  const p = st.progressOf(hero);
  const logoOpacity = 1 - fx.clamp((p - 0.68) / 0.2);
  hero.style.setProperty('--z', (reduced ? 1 : 1 + fx.easeIn(p) * 58).toFixed(3));
  hero.style.setProperty('--lo', logoOpacity.toFixed(3));
  heroLogo.classList.toggle('gone', logoOpacity <= 0.001); // stop painting the 59× logo once invisible
  hero.style.setProperty('--fade', (1 - fx.clamp(p * 3.2)).toFixed(3));
  hero.style.setProperty('--lab', fx.clamp((p - 0.82) / 0.12).toFixed(3));
});

// Manifesto: words light up one by one.
eng.onFrame((st) => {
  if (reduced || !st.visibleOf(manifest)) return;
  const p = st.progressOf(manifest);
  words.forEach((w, i) => (w.style.opacity = (0.13 + 0.87 * fx.clamp(p * 1.35 * words.length - i)).toFixed(3)));
});

// Gallery: vertical scroll drives the horizontal track; section height follows the track width.
eng.onFrame((st) => {
  const distance = Math.max(0, track.scrollWidth - st.vw);
  const height = Math.round(distance + svh);
  if (Math.abs((gallery._h || 0) - height) > 2) {
    gallery._h = height;
    gallery.style.height = height + 'px';
  }
  if (st.visibleOf(gallery)) track.style.translate = `${(-st.progressOf(gallery) * distance).toFixed(1)}px 0`;
});

// Instagram: posts fly towards the viewer through a 3D tunnel.
eng.onFrame((st) => {
  if (!st.visibleOf(igSection)) return;
  const p = st.progressOf(igSection);
  const spacing = 480;
  const total = igPosts.length * spacing;
  igPosts.forEach((el, i) => {
    const z = p * (total + 1300) - total + i * spacing;
    const opacity = fx.clamp((z + total * 0.75) / 900) * (1 - fx.clamp((z - 420) / 320));
    el.style.transform = `translate3d(${el.dataset.x}vw, ${el.dataset.y}vh, ${z.toFixed(0)}px)`;
    el.style.opacity = opacity.toFixed(3);
    el.style.visibility = z > 840 ? 'hidden' : 'visible';
    el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
    if (coarse) el.classList.toggle('sol', z > 60 && z < 520); // no hover on touch: solarise mid-flight
  });
});

// Footer: the logo lands from a huge zoom, then the rest fades in and a spark runs once.
eng.onFrame((st) => {
  if (!st.visibleOf(footer)) return;
  const p = st.progressOf(footer);
  const k = fx.clamp(p / 0.62);
  footer.style.setProperty('--fz', (reduced ? 1 : 1 + Math.pow(1 - k, 3) * 42).toFixed(3));
  footer.style.setProperty('--fi', (reduced ? 1 : fx.clamp((p - 0.5) / 0.28)).toFixed(3));
  if (!footTraced && k >= 1 && !reduced) {
    footTraced = true;
    spark(footSvg, { seg: 0.05, width: 1.6, duration: 2400, once: true });
  }
  if (k < 0.2) footTraced = false;
});

// Floating "Reservar" button: hidden over the hero, booking, footer and the pinned scenes.
eng.onFrame((st) => {
  const middle = st.vh / 2;
  const crossesMiddle = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < middle && r.bottom > middle;
  };
  const overlaps = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < st.vh && r.bottom > 0;
  };
  const heroDone = hero.getBoundingClientRect().bottom < st.vh * 0.6;
  const footerIn = footer.getBoundingClientRect().top < st.vh * 0.9;
  const show = heroDone && !overlaps(bookingSection) && !footerIn && ![igSection, gallery].some(crossesMiddle) && !menuOpen;
  if (show === ctaShown) return;
  ctaShown = show;
  floatCta.tabIndex = show ? 0 : -1;
  floatCta.setAttribute('aria-hidden', String(!show));
});
