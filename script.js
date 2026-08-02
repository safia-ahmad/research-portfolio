/* NAV: scroll state, mobile toggle, active-link highlight */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const progressFill = document.getElementById('progressFill');

window.addEventListener('scroll', () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 10);
  const doc = document.documentElement;
  const scrollTop = doc.scrollTop || document.body.scrollTop;
  const scrollHeight = (doc.scrollHeight - doc.clientHeight) || 1;
  progressFill.style.width = `${(scrollTop / scrollHeight) * 100}%`;
}, { passive: true });

navToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  navToggle.classList.toggle('is-open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    navToggle?.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  });
});

const sections = document.querySelectorAll('main > section[id]');
const navAnchors = document.querySelectorAll('.nav__links a[data-nav]');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navAnchors.forEach(a => a.classList.toggle('is-active', a.dataset.nav === id));
    }
  });
}, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
sections.forEach(s => sectionObserver.observe(s));

/* SCROLL REVEAL */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal, .timeline__item').forEach(el => revealObserver.observe(el));

/* TIMELINE SCROLL-FILL RAIL */
(function timelineFill() {
  const wrap = document.querySelector('.timeline-wrap');
  const fill = document.getElementById('timelineFill');
  if (!wrap || !fill) return;

  function update() {
    const rect = wrap.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const total = rect.height;
    let progress = (viewportH * 0.75 - rect.top) / total;
    progress = Math.max(0, Math.min(1, progress));
    fill.style.height = `${progress * 100}%`;
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* CURSOR GLOW (desktop only) */
(function cursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow || window.matchMedia('(hover: none)').matches) return;

  let targetX = window.innerWidth / 2, targetY = window.innerHeight / 2;
  let curX = targetX, curY = targetY;
  let active = false;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!active) { active = true; glow.classList.add('is-active'); }
  }, { passive: true });

  window.addEventListener('mouseleave', () => glow.classList.remove('is-active'));

  function raf() {
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;
    glow.style.transform = `translate(${curX}px, ${curY}px)`;
    requestAnimationFrame(raf);
  }
  raf();
})();

/* MAGNETIC BUTTONS */
(function magneticButtons() {
  if (window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
})();

/* HERO SIGNATURE VIZ: live gradient descent on a loss surface */
(function gradientDescentViz() {
  const canvas = document.getElementById('descentCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const lossEl = document.getElementById('lossValue');
  const stepEl = document.getElementById('stepValue');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const size = 360;
  canvas.width = size * DPR;
  canvas.height = size * DPR;
  ctx.scale(DPR, DPR);

  function loss(x, y) {
    const g1 = -Math.exp(-((x - 0.15) ** 2 + (y + 0.1) ** 2) / 0.35);
    const g2 = -0.5 * Math.exp(-((x + 0.5) ** 2 + (y - 0.4) ** 2) / 0.2);
    return g1 + g2 + 0.05 * (x * x + y * y);
  }
  function grad(x, y, h = 0.0005) {
    const dx = (loss(x + h, y) - loss(x - h, y)) / (2 * h);
    const dy = (loss(x, y + h) - loss(x, y - h)) / (2 * h);
    return [dx, dy];
  }

  const colors = getComputedStyle(document.documentElement);
  const cBlue = colors.getPropertyValue('--blue').trim() || '#5B7FFF';
  const cCyan = colors.getPropertyValue('--cyan').trim() || '#45D0C4';
  const cPurple = colors.getPropertyValue('--purple').trim() || '#9B7CF6';

  const RES = 60;
  const field = new Float32Array(RES * RES);
  let minL = Infinity, maxL = -Infinity;
  for (let j = 0; j < RES; j++) {
    for (let i = 0; i < RES; i++) {
      const x = (i / (RES - 1)) * 2.6 - 1.3;
      const y = (j / (RES - 1)) * 2.6 - 1.3;
      const v = loss(x, y);
      field[j * RES + i] = v;
      if (v < minL) minL = v;
      if (v > maxL) maxL = v;
    }
  }

  function toCanvas(x, y) {
    const px = ((x + 1.3) / 2.6) * size;
    const py = ((y + 1.3) / 2.6) * size;
    return [px, py];
  }

  function drawField() {
    ctx.clearRect(0, 0, size, size);
    const cell = size / RES;
    for (let j = 0; j < RES; j++) {
      for (let i = 0; i < RES; i++) {
        const v = field[j * RES + i];
        const t = (v - minL) / (maxL - minL);
        const alpha = 0.05 + (1 - t) * 0.16;
        ctx.fillStyle = `rgba(91,127,255,${alpha.toFixed(3)})`;
        ctx.fillRect(i * cell, j * cell, cell + 0.5, cell + 0.5);
      }
    }
  }

  let path = [];
  let point = [1.0, -1.0];
  let step = 0;
  const lr = 0.35;
  const maxSteps = 90;

  function resetRun() {
    const angle = Math.random() * Math.PI * 2;
    const r = 1.05 + Math.random() * 0.15;
    point = [Math.cos(angle) * r, Math.sin(angle) * r];
    path = [point.slice()];
    step = 0;
  }
  resetRun();

  function drawPath() {
    if (path.length > 1) {
      ctx.beginPath();
      const [sx, sy] = toCanvas(path[0][0], path[0][1]);
      ctx.moveTo(sx, sy);
      for (let k = 1; k < path.length; k++) {
        const [px, py] = toCanvas(path[k][0], path[k][1]);
        ctx.lineTo(px, py);
      }
      ctx.strokeStyle = cCyan;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(...toCanvas(0.15, -0.1), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = cPurple;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;

    const [cx, cy] = toCanvas(point[0], point[1]);
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = cBlue;
    ctx.shadowColor = cBlue;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function frame() {
    if (!reducedMotion) {
      const [gx, gy] = grad(point[0], point[1]);
      point = [point[0] - lr * gx * 0.08, point[1] - lr * gy * 0.08];
      path.push(point.slice());
      step++;
    }
    drawField();
    drawPath();
    const currentLoss = loss(point[0], point[1]);
    lossEl.textContent = `loss: ${currentLoss.toFixed(3)}`;
    stepEl.textContent = `step ${step}`;
    if (!reducedMotion && step < maxSteps) {
      requestAnimationFrame(frame);
    } else if (!reducedMotion) {
      setTimeout(() => { resetRun(); requestAnimationFrame(frame); }, 1400);
    }
  }
  frame();
})();
