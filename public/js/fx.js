// SinCalma Studio — motion engine.
// Small, dependency-free effects used by main.js: scroll reveals, pinned-scene progress,
// canvas textures (grain, halftone, membrane rings), the opt-in drone and a few text effects.

export const clamp = (v, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
export const ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;

const isOnScreen = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight && r.width > 0;
};

const REVEAL_EASING = 'cubic-bezier(.16,.84,.24,1)';

// Reveal keyframes for [data-in="…"]. Every variant ends on the element's natural style.
const KEYFRAMES = {
  up: [{ opacity: 0, transform: 'translateY(56px)' }, { opacity: 1, transform: 'none' }],
  // Generous margins: the display face (Schramberg) inks slightly outside its line box.
  mask: [
    { clipPath: 'inset(-30% -12% 130% -12%)', transform: 'translateY(40%)' },
    { clipPath: 'inset(-30% -12% -30% -12%)', transform: 'none' },
  ],
  fade: [{ opacity: 0 }, { opacity: 1 }],
  scale: [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 1, transform: 'none' }],
  wipe: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
  dots: [
    { filter: 'grayscale(1) contrast(5) blur(10px)', opacity: 0.25 },
    { filter: 'grayscale(0) contrast(1) blur(0px)', opacity: 1 },
  ],
};

// Variants that start fully clipped have zero visible area, so IntersectionObserver never
// reports them; those are triggered from their layout box on each frame instead.
const CLIPPED = new Set(['mask', 'wipe']);

/**
 * Frame loop shared by every scroll scene.
 * - Plays [data-in] reveals once they enter the viewport.
 * - Writes --p (0…1 scroll progress) on visible [data-pin] sections.
 * - Writes --mx/--my (smoothed pointer) and --scrolled on the root element.
 * - Moves [data-par] elements with a light parallax.
 * Scene code subscribes with onFrame(fn); fn receives the frame state.
 */
export function createEngine(root, { reduced = false } = {}) {
  const hooks = [];
  const skipReveals = reduced || document.hidden;
  let lastY = scrollY;
  let velocity = 0;
  const t0 = performance.now();

  const pointer = { nx: 0.5, ny: 0.5, sx: 0.5, sy: 0.5, active: false };
  addEventListener(
    'pointermove',
    (e) => {
      pointer.nx = e.clientX / innerWidth;
      pointer.ny = e.clientY / innerHeight;
      pointer.active = true;
    },
    { passive: true },
  );

  // ── Reveals ──
  const reveals = new Map();
  const pendingClipped = new Set();
  let frameSeen = false;
  let throttled = false;

  // Safety net: a reveal that never advances (throttled tab) is finished outright.
  const play = (anim) => {
    anim.play();
    setTimeout(() => {
      if (anim.playState === 'running' && (anim.currentTime || 0) < 60) anim.finish();
    }, 1600);
  };

  // Background tabs may never run rAF: show everything instead of leaving it hidden.
  setTimeout(() => {
    if (frameSeen) return;
    throttled = true;
    reveals.forEach((a) => a.finish());
  }, 500);

  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const anim = reveals.get(entry.target);
        if (anim && anim.playState !== 'finished') play(anim);
        io.unobserve(entry.target);
      }),
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );

  if (!skipReveals) {
    root.querySelectorAll('[data-in]').forEach((el) => {
      const anim = el.animate(KEYFRAMES[el.dataset.in] || KEYFRAMES.up, {
        duration: +(el.dataset.dur || 1200),
        delay: +(el.dataset.delay || 0),
        easing: REVEAL_EASING,
        fill: 'both',
      });
      anim.pause();
      anim.currentTime = 0;
      // Drop the effect once done so no clip-path or filter is left behind cropping the content.
      anim.onfinish = () => anim.cancel();
      reveals.set(el, anim);

      if (throttled) anim.finish();
      else if (el.dataset.now !== undefined) play(anim);
      else if (CLIPPED.has(el.dataset.in)) pendingClipped.add(el);
      else io.observe(el);
    });
  }

  const checkClipped = () => {
    if (!pendingClipped.size) return;
    pendingClipped.forEach((el) => {
      const r = el.getBoundingClientRect();
      const visibleH = Math.min(r.bottom, innerHeight * 0.94) - Math.max(r.top, 0);
      const inView = r.width > 0 && r.right > 0 && r.left < innerWidth;
      if (inView && visibleH / Math.min(Math.max(1, r.height), innerHeight) > 0.12) {
        pendingClipped.delete(el);
        const anim = reveals.get(el);
        if (anim && anim.playState !== 'finished') play(anim);
      }
    });
  };

  // ── Scroll progress ──
  // Pinned sections: 0 when the top reaches the viewport top, 1 when the bottom reaches its bottom.
  // data-pin="enter" (and sections shorter than the viewport): progress across the whole pass.
  const progressOf = (el) => {
    const r = el.getBoundingClientRect();
    const span = r.height - innerHeight;
    const pass = clamp((innerHeight - r.top) / (innerHeight + r.height));
    if (el.dataset.pin === 'enter') return pass;
    return span > 1 ? clamp(-r.top / span) : pass;
  };
  const visibleOf = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > -200 && r.top < innerHeight + 200;
  };

  const pins = [...root.querySelectorAll('[data-pin]')];
  const parallax = [...root.querySelectorAll('[data-par]')];
  const docStyle = document.documentElement.style;

  const frame = (now) => {
    frameSeen = true;
    checkClipped();

    const y = scrollY;
    velocity += (y - lastY - velocity) * 0.12;
    lastY = y;

    const t = (now - t0) / 1000;
    if (!pointer.active) {
      // Idle drift so the glow is alive before the first pointer move (and on touch).
      pointer.nx = 0.5 + Math.sin(t * 0.35) * 0.22;
      pointer.ny = 0.45 + Math.cos(t * 0.27) * 0.16;
    }
    pointer.sx += (pointer.nx - pointer.sx) * 0.08;
    pointer.sy += (pointer.ny - pointer.sy) * 0.08;

    docStyle.setProperty('--mx', (pointer.sx * 100).toFixed(2) + '%');
    docStyle.setProperty('--my', (pointer.sy * 100).toFixed(2) + '%');
    docStyle.setProperty('--scrolled', clamp(y / 160).toFixed(3));

    pins.forEach((el) => {
      if (visibleOf(el)) el.style.setProperty('--p', progressOf(el).toFixed(4));
    });
    parallax.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > innerHeight + 300) return;
      const offset = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.translate = `0 ${(offset * +el.dataset.par * -100).toFixed(1)}px`;
    });

    const state = { y, t, vel: velocity, vw: innerWidth, vh: innerHeight, ptr: pointer, progressOf, visibleOf, reduced };
    for (const hook of hooks) hook(state);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  return { onFrame: (fn) => hooks.push(fn), progressOf };
}

/** Animated film grain on a small canvas (scaled up with CSS). */
export function grain(canvas, { alpha = 26, fps = 14 } = {}) {
  const size = 220;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  let last = 0;

  const loop = (now) => {
    if (now - last > 1000 / fps && isOnScreen(canvas)) {
      last = now;
      const d = image.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = alpha;
      }
      ctx.putImageData(image, 0, 0);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/** Running SMPTE-style timecode (HH:MM:SS:FF at 25 fps). */
export function timecode(el) {
  const start = performance.now();
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const t = (performance.now() - start) / 1000;
    el.textContent = `${pad((t / 3600) | 0)}:${pad(((t / 60) | 0) % 60)}:${pad((t | 0) % 60)}:${pad(((t * 25) | 0) % 25)}`;
    requestAnimationFrame(tick);
  };
  tick();
}

/** Live clock in the given time zone. */
export function clock(el, timeZone) {
  const format = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  });
  const tick = () => {
    el.textContent = format.format(new Date());
  };
  tick();
  setInterval(tick, 1000);
}

/**
 * Audio bars. Each child is a bar; `source(i, n)` returns its level (0…1) or -1 when silent.
 * While silent the bars ease down and rest flat.
 */
export function bars(container, { min = 0.08, source }) {
  const kids = [...container.children];
  const current = kids.map(() => min);

  const loop = () => {
    kids.forEach((bar, i) => {
      const level = source(i, kids.length);
      const target = level >= 0 ? min + Math.pow(level, 1.3) * (1 - min) : min;
      const next = current[i] + (target - current[i]) * (level >= 0 ? 0.6 : 0.12);
      if (Math.abs(next - current[i]) < 0.0005 && Math.abs(target - current[i]) < 0.001) return;
      current[i] = next;
      bar.style.transform = `scaleY(${next.toFixed(3)})`;
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/**
 * Interactive halftone: draws an image as a dot screen in brand colours.
 * Dots swell around the pointer (or an idle drift) and a soft scan line passes over them.
 */
export function halftone(canvas, src, options = {}) {
  const o = { bg: '#3842E7', ink: '#FFFFFF', mid: '#AECBFF', accent: '#51FF00', cell: 11, focusY: 0.5, ...options };
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const pointer = { x: -999, y: -999, sx: -999, sy: -999 };
  let cells = [];
  let W = 0;
  let H = 0;
  let cell = o.cell;

  // Downsample the image to one pixel per cell and keep its luminance.
  const sample = () => {
    if (!img.naturalWidth) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.6);
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cell = W < 700 ? Math.max(7, o.cell - 3) : o.cell;
    const cols = Math.ceil(W / cell) + 1;
    const rows = Math.ceil(H / cell) + 1;
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const octx = off.getContext('2d', { willReadFrequently: true });

    // object-fit: cover
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = W / H;
    let sw, sh, sx, sy;
    if (imgRatio > boxRatio) {
      sh = img.naturalHeight;
      sw = sh * boxRatio;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      sw = img.naturalWidth;
      sh = sw / boxRatio;
      sx = 0;
      sy = (img.naturalHeight - sh) * o.focusY;
    }
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
    const d = octx.getImageData(0, 0, cols, rows).data;

    cells = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = (j * cols + i) * 4;
        const [R, G, B] = [d[k], d[k + 1], d[k + 2]];
        cells.push({
          x: i * cell,
          y: j * cell,
          lum: (0.3 * R + 0.59 * G + 0.11 * B) / 255,
          green: G > 150 && G - B > 70 && G - R > 40,
        });
      }
    }
  };

  const draw = (now) => {
    const t = now / 1000;
    if (pointer.x < -900) {
      pointer.sx += (W * (0.5 + Math.sin(t * 0.4) * 0.25) - pointer.sx) * 0.03;
      pointer.sy += (H * (0.45 + Math.cos(t * 0.3) * 0.18) - pointer.sy) * 0.03;
    } else {
      pointer.sx += (pointer.x - pointer.sx) * 0.14;
      pointer.sy += (pointer.y - pointer.sy) * 0.14;
    }

    ctx.fillStyle = o.bg;
    ctx.fillRect(0, 0, W, H);

    const lens2 = Math.pow(Math.min(W, H) * 0.22, 2);
    const scanY = (((t * 0.12) % 1.3) - 0.15) * H;
    const half = cell / 2;
    const paths = { ink: new Path2D(), mid: new Path2D(), accent: new Path2D() };

    for (const c of cells) {
      const dx = c.x - pointer.sx;
      const dy = c.y - pointer.sy;
      const near = Math.exp(-(dx * dx + dy * dy) / lens2);
      const scan = Math.exp(-Math.pow((c.y - scanY) / (cell * 3), 2)) * 0.5;
      let r = half * Math.pow(c.lum, 1.15) * (0.92 + near * 0.9 + scan);
      if (r < 0.5) continue;
      r = Math.min(r, half * 1.6);
      const px = c.x + half - dx * near * 0.12;
      const py = c.y + half - dy * near * 0.12;
      const path = c.green ? paths.accent : c.lum > 0.62 ? paths.ink : paths.mid;
      path.moveTo(px + r, py);
      path.arc(px, py, r, 0, Math.PI * 2);
    }

    ctx.fillStyle = o.mid;
    ctx.fill(paths.mid);
    ctx.fillStyle = o.ink;
    ctx.fill(paths.ink);
    ctx.fillStyle = o.accent;
    ctx.fill(paths.accent);
  };

  img.onload = () => {
    sample();
    draw(performance.now());
  };
  img.src = src;

  addEventListener(
    'pointermove',
    (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    },
    { passive: true },
  );
  canvas.addEventListener('pointerleave', () => {
    pointer.x = pointer.y = -999;
  });
  new ResizeObserver(() => {
    sample();
    draw(performance.now());
  }).observe(canvas);

  const loop = (now) => {
    if (isOnScreen(canvas)) draw(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/**
 * Synthesised studio drone (no audio files): four detuned oscillators through a moving
 * low-pass filter. toggle() fades it in/out; level(i, n) feeds the audio bars.
 */
export function drone() {
  let ctx = null;
  let master;
  let analyser;
  let data;
  let on = false;
  let lastRead = -1;

  const build = () => {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.55;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -36;
    data = new Uint8Array(analyser.frequencyBinCount);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 900;
    lowpass.Q.value = 6;

    // Slow filter sweep
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 500;
    lfo.connect(lfoGain).connect(lowpass.frequency);
    lfo.start();

    [55, 82.41, 110.3, 164.8].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 ? 'sawtooth' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 7;
      const gain = ctx.createGain();
      gain.gain.value = 0.16 / (i + 1);
      osc.connect(gain).connect(lowpass);
      osc.start();
    });

    // 2 Hz amplitude pulse
    const pulse = ctx.createOscillator();
    const pulseDepth = ctx.createGain();
    const amp = ctx.createGain();
    pulse.frequency.value = 2;
    pulseDepth.gain.value = 0.25;
    amp.gain.value = 0.75;
    pulse.connect(pulseDepth).connect(amp.gain);
    pulse.start();

    lowpass.connect(amp).connect(master).connect(analyser).connect(ctx.destination);
  };

  return {
    toggle() {
      if (!ctx) build();
      on = !on;
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(on ? 0.35 : 0, ctx.currentTime + (on ? 1.6 : 0.6));
      return on;
    },
    // One band per bar, log-spaced over the drone's real range (≈45 Hz – 1.8 kHz).
    level(i = 0, n = 12) {
      if (!analyser || !on) return -1;
      if (ctx.currentTime !== lastRead) {
        lastRead = ctx.currentTime;
        analyser.getByteFrequencyData(data);
      }
      const hzPerBin = ctx.sampleRate / analyser.fftSize;
      const f0 = 45 * Math.pow(40, i / n);
      const f1 = 45 * Math.pow(40, (i + 1) / n);
      const a = Math.floor(f0 / hzPerBin);
      const b = Math.max(a + 1, Math.ceil(f1 / hzPerBin));
      let peak = 0;
      for (let k = a; k < b && k < data.length; k++) peak = Math.max(peak, data[k]);
      return Math.min(1, (peak / 255) * (0.82 + i * 0.045));
    },
  };
}

/** Decode/scramble effect on [data-scramble] (plain-text elements) when they scroll in. */
export function scramble(root) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const run = (el) => {
    const final = el.textContent;
    const duration = 900;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = [...final]
        .map((c, i) => (c === ' ' || i / final.length < t ? c : chars[(Math.random() * chars.length) | 0]))
        .join('');
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      }),
    { threshold: 0.4 },
  );
  root.querySelectorAll('[data-scramble]').forEach((el) => io.observe(el));
}

/** Inertia scroll for mouse wheels (desktop only); in-page anchors glide too. */
export function smoothScroll() {
  if (matchMedia('(pointer: coarse)').matches) return;
  document.documentElement.style.scrollBehavior = 'auto';
  let target = scrollY;
  let current = scrollY;
  let active = false;
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

  addEventListener(
    'wheel',
    (e) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (document.body.classList.contains('locked') || e.ctrlKey || e.defaultPrevented || horizontal) return;
      e.preventDefault();
      if (!active) target = current = scrollY;
      active = true;
      target = clamp(target + e.deltaY * (e.deltaMode === 1 ? 40 : 1), 0, maxScroll());
    },
    { passive: false },
  );

  addEventListener('click', (e) => {
    const link = e.target.closest?.('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const el = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !el) return;
    e.preventDefault();
    current = scrollY;
    target = el ? Math.min(maxScroll(), el.getBoundingClientRect().top + scrollY) : 0;
    active = true;
  });

  // Keyboard or a drag on the scrollbar takes over.
  const release = () => {
    active = false;
  };
  addEventListener('keydown', release);
  addEventListener('pointerdown', release);

  const loop = () => {
    if (active) {
      current += (target - current) * 0.085;
      if (Math.abs(target - current) < 0.6) {
        current = target;
        active = false;
      }
      scrollTo(0, current);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/** Buttons marked [data-magnet] lean towards a nearby pointer (fine pointers only). */
export function magnets(root) {
  if (matchMedia('(pointer: coarse)').matches) return;
  const els = [...root.querySelectorAll('[data-magnet]')];
  addEventListener(
    'pointermove',
    (e) => {
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const reach = Math.max(r.width, r.height) * 0.9 + 40;
        el.style.transition = 'translate .5s cubic-bezier(.2,.8,.2,1)';
        el.style.translate = Math.hypot(dx, dy) < reach ? `${(dx * 0.28).toFixed(1)}px ${(dy * 0.35).toFixed(1)}px` : '0 0';
      });
    },
    { passive: true },
  );
}

/** Per-letter rise for [data-split] headings (static text only). */
export function splitReveal(root) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        entry.target.querySelectorAll('.split-i').forEach((letter, i) => {
          const anim = letter.animate([{ transform: 'translateY(115%) rotate(6deg)' }, { transform: 'none' }], {
            duration: 1000,
            delay: i * 32,
            easing: REVEAL_EASING,
            fill: 'both',
          });
          // Once landed, unmask the letter so no glyph stays cropped.
          anim.onfinish = () => {
            letter.parentElement.classList.add('landed');
            anim.cancel();
          };
        });
      }),
    { threshold: 0.3 },
  );

  root.querySelectorAll('[data-split]').forEach((el) => {
    [...el.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach((ch) => {
        if (/\s/.test(ch)) {
          frag.append(' ');
          return;
        }
        const outer = document.createElement('span');
        const inner = document.createElement('span');
        outer.className = 'split-o';
        inner.className = 'split-i';
        inner.textContent = ch;
        outer.append(inner);
        frag.append(outer);
      });
      node.replaceWith(frag);
    });
    io.observe(el);
  });
}

/** Living membrane: drifting rings with dots where they intersect; the pointer pulls them. */
export function rings(canvas, { color = '#FFFFFF', count = 13 } = {}) {
  const ctx = canvas.getContext('2d');
  const pointer = { x: -9999, y: -9999 };
  let W = 0;
  let H = 0;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.6);
    W = r.width;
    H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const circles = Array.from({ length: count }, () => ({
    bx: Math.random(),
    by: Math.random(),
    r: 0.05 + Math.random() * 0.11,
    phase: Math.random() * 9,
    speed: 0.15 + Math.random() * 0.25,
  }));

  addEventListener(
    'pointermove',
    (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    },
    { passive: true },
  );

  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!isOnScreen(canvas)) return;
    const t = now / 1000;
    const M = Math.min(W, H);
    ctx.clearRect(0, 0, W, H);

    circles.forEach((c) => {
      const x = (c.bx + Math.sin(t * c.speed + c.phase) * 0.06) * W;
      const y = (c.by + Math.cos(t * c.speed * 0.8 + c.phase) * 0.06) * H;
      const dx = pointer.x - x;
      const dy = pointer.y - y;
      const pull = Math.exp(-Math.hypot(dx, dy) / (M * 0.35)) * 0.25;
      c.x = x + dx * pull;
      c.y = y + dy * pull;
      c.radius = c.r * M * (1 + Math.sin(t * 0.9 + c.phase) * 0.08);
    });

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    circles.forEach((c) => {
      ctx.moveTo(c.x + c.radius, c.y);
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    });
    ctx.stroke();

    // Intersection points of every overlapping pair
    ctx.beginPath();
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i];
        const b = circles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d === 0 || d > a.radius + b.radius || d < Math.abs(a.radius - b.radius)) continue;
        const l = (a.radius ** 2 - b.radius ** 2 + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, a.radius ** 2 - l * l));
        const mx = a.x + (dx * l) / d;
        const my = a.y + (dy * l) / d;
        for (const [px, py] of [
          [mx + (h * dy) / d, my - (h * dx) / d],
          [mx - (h * dy) / d, my + (h * dx) / d],
        ]) {
          ctx.moveTo(px + 5, py);
          ctx.arc(px, py, 5, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();
  };
  requestAnimationFrame(loop);
}
