/* ===== LOADER ===== */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 2200);
});

/* ===== NAVBAR ===== */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ===== HERO CANVAS — Himalayan Panorama ===== */
(function () {
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  let layers = [];   // mountain ridge layers
  let snowflakes = [];
  let mist = [];
  let stars = [];
  let mouseX = 0, mouseY = 0;
  let time = 0;

  /* ── seeded pseudo-random so ridges look the same on resize ── */
  function seededRand(seed) {
    let s = seed;
    return function () {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /* ── build a jagged Himalayan ridgeline ── */
  function buildRidge(seed, baseY, roughness, peakBias) {
    const rng = seededRand(seed);
    const pts = [];
    const steps = 120;
    let y = baseY;
    for (let i = 0; i <= steps; i++) {
      const x = (W / steps) * i;
      // midpoint displacement feel — bigger swings near centre for central peak
      const distFromCentre = Math.abs(i / steps - 0.5);
      const peakPull = peakBias * (1 - distFromCentre * 2.2) * H * 0.18;
      y += (rng() - 0.52) * roughness;
      y = Math.max(baseY - H * 0.45, Math.min(baseY + H * 0.05, y));
      pts.push({ x, y: y - Math.max(0, peakPull) });
    }
    return pts;
  }

  /* ── snow cap: fill above a threshold with white gradient ── */
  function drawSnowCap(pts, snowLine, parallax, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i++) {
      const px = pts[i].x + parallax;
      const py = pts[i].y;
      if (py < snowLine) {
        if (!started) { ctx.moveTo(px, snowLine); started = true; }
        ctx.lineTo(px, py);
      } else if (started) {
        ctx.lineTo(px, snowLine);
        ctx.closePath();
        const sg = ctx.createLinearGradient(0, snowLine - H * 0.15, 0, snowLine);
        sg.addColorStop(0, 'rgba(240,248,255,0.95)');
        sg.addColorStop(0.6, 'rgba(210,230,245,0.6)');
        sg.addColorStop(1, 'rgba(200,220,240,0)');
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.beginPath();
        started = false;
      }
    }
    if (started) {
      ctx.lineTo(pts[pts.length - 1].x + parallax, snowLine);
      ctx.closePath();
      const sg = ctx.createLinearGradient(0, snowLine - H * 0.15, 0, snowLine);
      sg.addColorStop(0, 'rgba(240,248,255,0.95)');
      sg.addColorStop(1, 'rgba(200,220,240,0)');
      ctx.fillStyle = sg;
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── draw one ridge layer ── */
  function drawRidge(pts, fillColor, parallax) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-10, H + 10);
    ctx.lineTo(pts[0].x + parallax, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], cur = pts[i];
      const mx = (prev.x + cur.x) / 2 + parallax;
      const my = (prev.y + cur.y) / 2;
      ctx.quadraticCurveTo(prev.x + parallax, prev.y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x + parallax, pts[pts.length - 1].y);
    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.restore();
  }

  /* ── mist band ── */
  function initMist() {
    mist = [];
    for (let i = 0; i < 6; i++) {
      mist.push({
        x: Math.random() * W * 1.5 - W * 0.25,
        y: H * (0.45 + Math.random() * 0.2),
        w: W * (0.4 + Math.random() * 0.5),
        h: H * (0.04 + Math.random() * 0.06),
        alpha: 0.04 + Math.random() * 0.08,
        vx: (Math.random() - 0.5) * 0.15,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  /* ── snowflakes ── */
  function initSnow() {
    snowflakes = [];
    for (let i = 0; i < 160; i++) {
      snowflakes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: Math.random() * 0.6 + 0.2,
        alpha: Math.random() * 0.5 + 0.15,
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  /* ── stars ── */
  function initStars() {
    stars = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.55,
        r: Math.random() * 1.2 + 0.2,
        alpha: Math.random() * 0.7 + 0.2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  function rebuild() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;

    // 5 ridge layers — back to front
    layers = [
      // Layer 0: farthest — ghost blue, very high, Kanchenjunga silhouette
      { pts: buildRidge(1, H * 0.38, H * 0.022, 1.6),  parallaxFactor: 2,  snowLine: H * 0.28, snowAlpha: 0.85 },
      // Layer 1: second range — deep indigo
      { pts: buildRidge(2, H * 0.46, H * 0.028, 1.1),  parallaxFactor: 5,  snowLine: H * 0.36, snowAlpha: 0.7  },
      // Layer 2: mid range — slate blue-grey
      { pts: buildRidge(3, H * 0.54, H * 0.032, 0.7),  parallaxFactor: 9,  snowLine: H * 0.44, snowAlpha: 0.5  },
      // Layer 3: near range — dark teal-grey
      { pts: buildRidge(4, H * 0.62, H * 0.036, 0.4),  parallaxFactor: 14, snowLine: H * 0.56, snowAlpha: 0.3  },
      // Layer 4: foreground ridge — almost black, no snow
      { pts: buildRidge(5, H * 0.72, H * 0.025, 0.0),  parallaxFactor: 20, snowLine: H * 2,    snowAlpha: 0    },
    ];

    initMist();
    initSnow();
    initStars();
  }

  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ── sky colour cycle: night → pre-dawn → golden sunrise → morning ── */
  function skyColors(t) {
    // slow 0→1 cycle over ~1800 frames (~30s), then loops
    const p = (t % 1800) / 1800;

    if (p < 0.3) {
      // night — deep navy
      const f = p / 0.3;
      return {
        top:    lerpColor('#04080f', '#0d1b2e', f),
        mid:    lerpColor('#0a1020', '#162340', f),
        horiz:  lerpColor('#0e1520', '#1e2d45', f),
        ground: lerpColor('#080604', '#0e0b07', f),
        starA: 1 - f * 0.3
      };
    } else if (p < 0.55) {
      // pre-dawn — purple-blue
      const f = (p - 0.3) / 0.25;
      return {
        top:    lerpColor('#0d1b2e', '#1a1535', f),
        mid:    lerpColor('#162340', '#2d1f4a', f),
        horiz:  lerpColor('#1e2d45', '#4a2d3a', f),
        ground: lerpColor('#0e0b07', '#120a0a', f),
        starA: 0.7 - f * 0.5
      };
    } else if (p < 0.72) {
      // golden hour — amber horizon
      const f = (p - 0.55) / 0.17;
      return {
        top:    lerpColor('#1a1535', '#0d1428', f),
        mid:    lerpColor('#2d1f4a', '#7a3520', f),
        horiz:  lerpColor('#4a2d3a', '#e8832a', f),
        ground: lerpColor('#120a0a', '#1a0e08', f),
        starA: 0.2 - f * 0.2
      };
    } else {
      // morning — warm blue sky
      const f = (p - 0.72) / 0.28;
      return {
        top:    lerpColor('#0d1428', '#1a3a5c', f),
        mid:    lerpColor('#7a3520', '#3a6a9a', f),
        horiz:  lerpColor('#e8832a', '#7ab8d8', f),
        ground: lerpColor('#1a0e08', '#0e0b07', f),
        starA: 0
      };
    }
  }

  function lerpColor(a, b, t) {
    const ah = a.replace('#',''), bh = b.replace('#','');
    const ar = parseInt(ah.slice(0,2),16), ag = parseInt(ah.slice(2,4),16), ab = parseInt(ah.slice(4,6),16);
    const br = parseInt(bh.slice(0,2),16), bg = parseInt(bh.slice(2,4),16), bb = parseInt(bh.slice(4,6),16);
    const r = Math.round(ar + (br-ar)*t);
    const g = Math.round(ag + (bg-ag)*t);
    const bl2 = Math.round(ab + (bb-ab)*t);
    return `rgb(${r},${g},${bl2})`;
  }

  /* ── ridge fill colours per layer, tinted by sky phase ── */
  const ridgeColors = [
    // farthest — icy blue-white silhouette
    t => { const p=(t%1800)/1800; return p>0.6&&p<0.8 ? 'rgba(120,80,60,0.9)' : 'rgba(60,80,110,0.85)'; },
    t => { const p=(t%1800)/1800; return p>0.6&&p<0.8 ? 'rgba(80,55,45,0.92)' : 'rgba(40,60,90,0.9)'; },
    t => { const p=(t%1800)/1800; return p>0.6&&p<0.8 ? 'rgba(50,35,28,0.95)' : 'rgba(28,42,62,0.95)'; },
    t => 'rgba(20,28,38,0.97)',
    t => 'rgba(12,10,8,1)',
  ];

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const sky = skyColors(time);

    // ── Sky gradient ──
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.85);
    skyGrad.addColorStop(0,    sky.top);
    skyGrad.addColorStop(0.45, sky.mid);
    skyGrad.addColorStop(0.78, sky.horiz);
    skyGrad.addColorStop(1,    sky.ground);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Sun / moon glow on horizon ──
    const p = (time % 1800) / 1800;
    if (p > 0.55 && p < 0.85) {
      const sunF = p < 0.72 ? (p - 0.55) / 0.17 : 1 - (p - 0.72) / 0.13;
      const sunY = H * (0.62 - sunF * 0.08);
      const sunGlow = ctx.createRadialGradient(W * 0.5, sunY, 0, W * 0.5, sunY, W * 0.35);
      sunGlow.addColorStop(0,   `rgba(255,200,80,${0.35 * sunF})`);
      sunGlow.addColorStop(0.3, `rgba(255,140,40,${0.2 * sunF})`);
      sunGlow.addColorStop(1,   'rgba(255,100,20,0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Stars ──
    if (sky.starA > 0.01) {
      stars.forEach(s => {
        s.twinkle += 0.025;
        const a = sky.starA * s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,230,255,${a})`;
        ctx.fill();
      });
    }

    // ── Mountain ridges back→front ──
    layers.forEach((layer, idx) => {
      const px = layer.parallaxFactor * mouseX * -1;
      drawRidge(layer.pts, ridgeColors[idx](time), px);
      if (layer.snowAlpha > 0) {
        drawSnowCap(layer.pts, layer.snowLine, px, layer.snowAlpha);
      }
    });

    // ── Mist bands ──
    mist.forEach(m => {
      m.x += m.vx;
      m.phase += 0.008;
      if (m.x > W * 1.3) m.x = -m.w * 0.5;
      if (m.x < -m.w) m.x = W * 1.1;
      const breathe = 0.7 + 0.3 * Math.sin(m.phase);
      const mg = ctx.createRadialGradient(
        m.x + m.w / 2, m.y, 0,
        m.x + m.w / 2, m.y, m.w / 2
      );
      mg.addColorStop(0,   `rgba(200,215,230,${m.alpha * breathe})`);
      mg.addColorStop(0.5, `rgba(180,200,220,${m.alpha * 0.5 * breathe})`);
      mg.addColorStop(1,   'rgba(180,200,220,0)');
      ctx.save();
      ctx.scale(1, m.h / (m.w / 2));
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(m.x + m.w / 2, m.y * (m.w / 2) / m.h, m.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ── Snowflakes ──
    snowflakes.forEach(s => {
      s.wobble += 0.02;
      s.x += s.vx + Math.sin(s.wobble) * 0.3 + mouseX * 0.2;
      s.y += s.vy;
      if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; }
      if (s.x > W + 5) s.x = -5;
      if (s.x < -5) s.x = W + 5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,235,255,${s.alpha})`;
      ctx.fill();
    });

    // ── Warm bakery glow at very bottom ──
    const warmGlow = ctx.createLinearGradient(0, H * 0.75, 0, H);
    warmGlow.addColorStop(0, 'rgba(180,100,30,0)');
    warmGlow.addColorStop(1, 'rgba(180,90,20,0.18)');
    ctx.fillStyle = warmGlow;
    ctx.fillRect(0, H * 0.75, W, H * 0.25);

    time++;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { rebuild(); });
  rebuild();
  draw();
})();

/* ===== SCROLL REVEAL ===== */
const revealEls = document.querySelectorAll(
  '#highlights .highlight-card, #about .about-content, #menu .menu-item, #testimonials, .ci-item'
);

revealEls.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

/* ===== COUNTER ANIMATION ===== */
const counters = document.querySelectorAll('.stat-num');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const target = +e.target.dataset.target;
      let current = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        e.target.textContent = Math.floor(current) + (target >= 100 ? '+' : '');
      }, 25);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

counters.forEach(c => counterObserver.observe(c));

/* ===== MENU DATA & TABS ===== */
const menuData = {
  bakery: [
    { name: 'Sourdough Loaf', price: '₹180', desc: 'Classic wood-fired sourdough with a crisp crust and chewy crumb.', tag: 'Bestseller' },
    { name: 'Butter Croissant', price: '₹120', desc: 'Flaky, golden, layered croissant made with pure butter.', tag: 'Morning Favourite' },
    { name: 'Plum Cake', price: '₹220', desc: 'Rich, dense fruit cake — a Glenary\'s signature since 1935.', tag: 'Signature' },
    { name: 'Chicken Patty', price: '₹150', desc: 'Minced chicken in a golden puff pastry shell. A Darjeeling classic.', tag: 'Must Try' },
    { name: 'Cinnamon Roll', price: '₹130', desc: 'Soft, pillowy rolls with cinnamon sugar and cream cheese glaze.', tag: '' },
    { name: 'Cheese Straws', price: '₹90', desc: 'Crispy baked cheese straws — perfect with your afternoon tea.', tag: '' },
  ],
  mains: [
    { name: 'Grilled Trout', price: '₹480', desc: 'Fresh Himalayan trout, grilled with herbs, lemon butter sauce.', tag: 'Chef\'s Pick' },
    { name: 'Chicken Continental', price: '₹420', desc: 'Pan-seared chicken breast with mushroom cream sauce and vegetables.', tag: '' },
    { name: 'Thukpa', price: '₹280', desc: 'Tibetan noodle soup with vegetables or chicken — warming and hearty.', tag: 'Local Favourite' },
    { name: 'Pasta Arrabiata', price: '₹320', desc: 'Penne in a spicy tomato sauce with fresh herbs and parmesan.', tag: '' },
    { name: 'Veg Momos', price: '₹180', desc: 'Steamed Tibetan dumplings with a fiery chilli dipping sauce.', tag: 'Bestseller' },
    { name: 'Lamb Stew', price: '₹520', desc: 'Slow-cooked Himalayan lamb with root vegetables and crusty bread.', tag: 'Seasonal' },
  ],
  drinks: [
    { name: 'First Flush Darjeeling', price: '₹180', desc: 'The finest spring harvest — light, floral, and utterly delicate.', tag: 'Signature' },
    { name: 'Second Flush Darjeeling', price: '₹160', desc: 'Muscatel notes, amber liquor — the classic Darjeeling experience.', tag: 'Bestseller' },
    { name: 'Masala Chai', price: '₹80', desc: 'Spiced milk tea brewed with ginger, cardamom, and cinnamon.', tag: '' },
    { name: 'Kanchenjunga Cocktail', price: '₹380', desc: 'House cocktail — gin, elderflower, cucumber, and tonic. Refreshing.', tag: 'Bar Special' },
    { name: 'Himalayan Mule', price: '₹350', desc: 'Vodka, ginger beer, lime, and a hint of local honey.', tag: '' },
    { name: 'Fresh Lime Soda', price: '₹90', desc: 'Freshly squeezed lime with soda — sweet, salted, or mixed.', tag: '' },
  ],
  desserts: [
    { name: 'Chocolate Fondant', price: '₹280', desc: 'Warm chocolate cake with a molten centre, served with vanilla ice cream.', tag: 'Must Try' },
    { name: 'Darjeeling Tea Panna Cotta', price: '₹240', desc: 'Silky panna cotta infused with first flush Darjeeling tea.', tag: 'Signature' },
    { name: 'Apple Crumble', price: '₹220', desc: 'Himalayan apples baked under a buttery oat crumble, with custard.', tag: '' },
    { name: 'Glenary\'s Cheesecake', price: '₹260', desc: 'New York-style baked cheesecake with a berry compote.', tag: 'Bestseller' },
    { name: 'Crème Brûlée', price: '₹250', desc: 'Classic vanilla custard with a perfectly caramelised sugar crust.', tag: '' },
    { name: 'Momo Ice Cream', price: '₹180', desc: 'Playful dessert — fried dough dumplings with local honey ice cream.', tag: 'Unique' },
  ]
};

function renderMenu(tab) {
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = '';
  menuData[tab].forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'menu-item reveal';
    el.style.animationDelay = `${i * 0.07}s`;
    el.innerHTML = `
      <div class="menu-item-header">
        <span class="menu-item-name">${item.name}</span>
        <span class="menu-item-price">${item.price}</span>
      </div>
      <p class="menu-item-desc">${item.desc}</p>
      ${item.tag ? `<span class="menu-item-tag">${item.tag}</span>` : ''}
    `;
    grid.appendChild(el);
    setTimeout(() => el.classList.add('visible'), 50 + i * 70);
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMenu(btn.dataset.tab);
  });
});

renderMenu('bakery');

/* ===== GALLERY IMAGES — load + fallback ===== */
window.imgFallback = function (img) {
  const fb = img.getAttribute('data-fallback');
  if (fb && img.src !== fb) {
    img.src = fb;
  } else {
    // all sources failed — show emoji placeholder
    const wrap = img.closest('.gallery-img-wrap');
    if (wrap) {
      wrap.classList.add('img-error');
      const labels = ['🥐','🏔️','☕','🛤️','🚂','🌄'];
      const idx = parseInt(img.closest('.gallery-item').style.getPropertyValue('--i')) || 0;
      wrap.setAttribute('data-label', labels[idx] || '🏔️');
      img.style.display = 'none';
    }
  }
};

// Fade images in once loaded
document.querySelectorAll('.gallery-img-wrap img').forEach(img => {
  const wrap = img.closest('.gallery-img-wrap');
  const onLoad = () => {
    img.classList.add('loaded');
    wrap.classList.add('img-ready');
  };
  if (img.complete && img.naturalWidth > 0) {
    onLoad();
  } else {
    img.addEventListener('load', onLoad);
  }
});

/* ===== GALLERY DRAG SCROLL ===== */
const track = document.getElementById('galleryTrack');
let isDown = false, startX, scrollLeft;

track.addEventListener('mousedown', e => {
  isDown = true;
  track.classList.add('grabbing');
  startX = e.pageX - track.offsetLeft;
  scrollLeft = track.scrollLeft;
});
track.addEventListener('mouseleave', () => { isDown = false; track.classList.remove('grabbing'); });
track.addEventListener('mouseup', () => { isDown = false; track.classList.remove('grabbing'); });
track.addEventListener('mousemove', e => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - track.offsetLeft;
  track.scrollLeft = scrollLeft - (x - startX) * 1.5;
});

/* ===== TESTIMONIAL CAROUSEL ===== */
const testimonials = document.querySelectorAll('.testimonial');
const dotsContainer = document.getElementById('carouselDots');
let currentSlide = 0;

testimonials.forEach((_, i) => {
  const dot = document.createElement('button');
  dot.className = 'dot' + (i === 0 ? ' active' : '');
  dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
  dot.addEventListener('click', () => goToSlide(i));
  dotsContainer.appendChild(dot);
});

function goToSlide(n) {
  testimonials[currentSlide].classList.remove('active');
  dotsContainer.children[currentSlide].classList.remove('active');
  currentSlide = (n + testimonials.length) % testimonials.length;
  testimonials[currentSlide].classList.add('active');
  dotsContainer.children[currentSlide].classList.add('active');
}

setInterval(() => goToSlide(currentSlide + 1), 5000);

/* ===== 3D TILT on highlight cards ===== */
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-8px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

/* ===== SMOOTH PARALLAX on scroll ===== */
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
    heroContent.style.opacity = 1 - scrollY / 600;
  }
});
