(() => {
  const d = document;
  const root = d.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, el = d) => el.querySelector(s);
  const $$ = (s, el = d) => Array.from(el.querySelectorAll(s));

  // Header: transparent over the hero, solid once the hero has scrolled away.
  const hdr = $('[data-hdr]');
  const hero = $('.hero');
  if (hdr && hero) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const limit = hero.offsetHeight - hdr.offsetHeight - 8;
      hdr.classList.toggle('is-overlay', window.scrollY < limit);
      hdr.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
    const sub = hdr.querySelector('.brand small');
    if (sub) {
      const fit = () => {
        hdr.classList.remove('sub-cut');
        if (sub.scrollWidth > sub.clientWidth + 1) hdr.classList.add('sub-cut');
      };
      window.addEventListener('resize', fit);
      if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit);
      fit();
    }
  }

  // Mobile menu.
  const btn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  if (btn && menu) {
    const behind = [$('#main'), $('.ftr')].filter(Boolean);
    const setOpen = (open, focusBack) => {
      menu.hidden = !open;
      behind.forEach((el) => { el.inert = open; });
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? btn.dataset.labelClose : btn.dataset.labelOpen);
      hdr.classList.toggle('menu-open', open);
      d.body.classList.toggle('menu-open', open);
      if (open) { const first = $('a', menu); if (first) first.focus(); }
      else if (focusBack) btn.focus();
    };
    btn.addEventListener('click', () => setOpen(menu.hidden, false));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false, false); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setOpen(false, true); });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) setOpen(false, false); });
  }

  // Highlight the nav link of the section that crosses the upper part of the viewport; none over the hero.
  const spied = $$('[data-spy]');
  if (spied.length) {
    const links = $$('[data-nav]');
    let current;
    let raf = 0;
    const spy = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let id = null;
      for (const sec of spied) {
        const r = sec.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) { id = sec.dataset.spy; break; }
      }
      if (id === current) return;
      current = id;
      links.forEach((a) => {
        const on = a.dataset.nav === id;
        a.classList.toggle('is-current', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(spy); }, { passive: true });
    window.addEventListener('resize', spy);
    spy();
  }

  // Reveal on scroll.
  const revealed = $$('.rv');
  if (revealed.length) {
    if (reduce.matches || !('IntersectionObserver' in window)) {
      revealed.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealed.forEach((el) => io.observe(el));
    }
  }

  // Count up the numbers once.
  const counters = $$('[data-count]');
  if (counters.length && !reduce.matches && 'IntersectionObserver' in window) {
    const run = (el) => {
      const target = Number(el.dataset.count);
      const t0 = performance.now();
      const dur = 1100;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        el.dataset.show = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
        else { el.classList.remove('counting'); delete el.dataset.show; }
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => { el.dataset.show = '0'; el.classList.add('counting'); io.observe(el); });
  }

  // Figure strip: drifts sideways, can be dragged, pauses on hover, focus or the button.
  const reel = $('[data-reel]');
  if (reel) {
    const track = $('[data-reel-track]', reel);
    const first = track.firstElementChild;
    const clone = first.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    $$('a', clone).forEach((a) => a.setAttribute('tabindex', '-1'));
    $$('img', clone).forEach((img) => img.setAttribute('alt', ''));
    track.appendChild(clone);

    const toggle = $('[data-reel-toggle]');
    const ctrl = $('[data-reel-ctrl]');
    let tween = null;
    let offset = 0;
    let span = 0;
    let last = 0;
    let hover = false;
    let focus = false;
    let userPaused = false;
    let inView = true;
    let drag = null;
    let moved = false;
    const speed = 0.032;

    const measure = () => { span = first.getBoundingClientRect().width; };
    const apply = () => {
      if (span > 0) offset = ((offset % span) + span) % span;
      track.style.transform = `translate3d(${-offset}px,0,0)`;
    };
    const frame = (now) => {
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (tween) {
        const k = Math.min(1, (now - tween.t0) / tween.dur);
        offset = tween.from + (tween.to - tween.from) * (1 - Math.pow(1 - k, 3));
        apply();
        if (k >= 1) tween = null;
      } else if (!hover && !focus && !userPaused && !drag && inView && !d.hidden) {
        offset += dt * speed;
        apply();
      }
      requestAnimationFrame(frame);
    };

    measure();
    window.addEventListener('resize', () => { measure(); apply(); });
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); apply(); }).observe(first);

    reel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
    reel.addEventListener('pointerleave', () => { hover = false; });
    reel.addEventListener('focusin', (e) => {
      focus = true;
      const card = e.target.closest('.fig');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const rr = reel.getBoundingClientRect();
      if (r.left < rr.left + 24 || r.right > rr.right - 24) { offset += r.left - rr.left - 48; apply(); }
    });
    reel.addEventListener('focusout', () => { focus = false; });

    reel.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, start: offset, id: e.pointerId, locked: false };
      moved = false;
    });
    reel.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.locked) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.locked = true;
        moved = true;
        reel.classList.add('is-drag');
        try { reel.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
      }
      offset = drag.start - dx;
      apply();
    });
    const end = () => { drag = null; reel.classList.remove('is-drag'); };
    reel.addEventListener('pointerup', end);
    reel.addEventListener('pointercancel', end);
    reel.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
    reel.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); offset += e.deltaX; apply(); }
    }, { passive: false });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { inView = en[0].isIntersecting; }).observe(reel);
    }

    if (ctrl) ctrl.hidden = false;
    const nudge = (dir) => {
      const fig = $('.fig', first);
      const gap = parseFloat(getComputedStyle(first).columnGap || getComputedStyle(first).gap) || 24;
      const step = fig ? fig.getBoundingClientRect().width + gap : 360;
      const from = tween ? tween.to : offset;
      if (reduce.matches) { offset = from + dir * step; apply(); return; }
      tween = { from: offset, to: from + dir * step, t0: performance.now(), dur: 520 };
    };
    const prevBtn = $('[data-reel-prev]');
    const nextBtn = $('[data-reel-next]');
    if (prevBtn) prevBtn.addEventListener('click', () => nudge(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => nudge(1));
    if (toggle) {
      toggle.hidden = false;
      const setPaused = (p) => {
        userPaused = p;
        toggle.setAttribute('aria-pressed', String(p));
        toggle.setAttribute('aria-label', p ? toggle.dataset.labelPlay : toggle.dataset.labelPause);
      };
      toggle.addEventListener('click', () => setPaused(!userPaused));
      setPaused(reduce.matches);
      reduce.addEventListener('change', (e) => setPaused(e.matches));
    }
    requestAnimationFrame(frame);
  }

  // Paper list: topic filter, selected-only switch and a short default view.
  const list = $('[data-pubs]');
  if (list) {
    const items = $$('.pub', list);
    const tools = $('[data-pub-tools]');
    const chips = $$('[data-topic]');
    const sel = $('[data-sel-toggle]');
    const more = $('[data-pub-more]');
    const empty = $('[data-pub-empty]');
    const LIMIT = 10;
    let topic = 'all';
    let selectedOnly = false;
    let expanded = false;

    const render = () => {
      let matches = 0;
      let shown = 0;
      let lastYear = null;
      items.forEach((li) => {
        const ok = (topic === 'all' || li.dataset.topics.split(' ').includes(topic)) &&
          (!selectedOnly || li.hasAttribute('data-selected'));
        if (ok) matches += 1;
        const visible = ok && (expanded || matches <= LIMIT);
        li.hidden = !visible;
        if (visible) {
          shown += 1;
          li.classList.toggle('is-first', li.dataset.year !== lastYear);
          lastYear = li.dataset.year;
        }
      });
      empty.hidden = matches > 0;
      more.hidden = matches <= LIMIT;
      more.setAttribute('aria-expanded', String(expanded));
      more.textContent = expanded ? more.dataset.labelLess : `${more.dataset.labelMore} (${matches})`;
      return shown;
    };

    tools.hidden = false;
    chips.forEach((c) => c.addEventListener('click', () => {
      topic = c.dataset.topic;
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      render();
    }));
    sel.addEventListener('click', () => {
      selectedOnly = !selectedOnly;
      sel.setAttribute('aria-pressed', String(selectedOnly));
      render();
    });
    more.addEventListener('click', () => {
      expanded = !expanded;
      render();
      if (!expanded) {
        const top = list.getBoundingClientRect().top;
        if (top < 0) list.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
    render();
  }

  // Hero background: a road network split into four GPU partitions, with vehicles moving on it.
  const canvas = $('[data-net]');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const hues = ['rgba(95,188,176,', 'rgba(239,127,96,', 'rgba(230,200,143,', 'rgba(134,185,216,'];
    let W = 0;
    let H = 0;
    let dpr = 1;
    let nodes = [];
    let edges = [];
    let adj = [];
    let cars = [];
    let pulses = [];
    let layer = null;
    let running = false;
    let visible = true;
    let lastT = 0;

    const rng = (seed) => () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const rand = rng(20261003);
      const cell = W < 700 ? 30 : 38;
      const cols = Math.ceil(W / cell) + 2;
      const rows = Math.ceil(H / cell) + 2;
      const cx = W < 860 ? W * 0.5 : W * 0.72;
      const cy = W < 860 ? H * 0.72 : H * 0.5;
      const R = Math.max(W, H) * (W < 860 ? 0.62 : 0.5);
      const seeds = [0, 1, 2, 3].map((k) => {
        const a = k * Math.PI / 2 + 0.6;
        return [cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42];
      });
      const grid = [];
      nodes = [];
      for (let r = 0; r < rows; r += 1) {
        grid.push([]);
        for (let c = 0; c < cols; c += 1) {
          const x = (c - 1) * cell + (rand() - 0.5) * cell * 0.55;
          const y = (r - 1) * cell + (rand() - 0.5) * cell * 0.55;
          const dist = Math.hypot((x - cx) / 1.25, y - cy) / R;
          if (dist > 1 || rand() < 0.07 + dist * 0.25) { grid[r].push(-1); continue; }
          let part = 0;
          let best = Infinity;
          seeds.forEach((s, i) => {
            const dd = (x - s[0]) ** 2 + (y - s[1]) ** 2;
            if (dd < best) { best = dd; part = i; }
          });
          grid[r].push(nodes.length);
          nodes.push({ x, y, part, fade: Math.max(0, 1 - dist) });
        }
      }
      edges = [];
      adj = nodes.map(() => []);
      const link = (a, b) => {
        if (a < 0 || b < 0) return;
        adj[a].push(b); adj[b].push(a);
        edges.push([a, b]);
      };
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const a = grid[r][c];
          if (a < 0) continue;
          if (c + 1 < cols && rand() < 0.86) link(a, grid[r][c + 1]);
          if (r + 1 < rows && rand() < 0.86) link(a, grid[r + 1][c]);
          if (r + 1 < rows && c + 1 < cols && rand() < 0.1) link(a, grid[r + 1][c + 1]);
        }
      }

      layer = d.createElement('canvas');
      layer.width = canvas.width;
      layer.height = canvas.height;
      const lc = layer.getContext('2d');
      lc.scale(dpr, dpr);
      lc.lineWidth = 1;
      edges.forEach(([a, b]) => {
        const A = nodes[a];
        const B = nodes[b];
        const f = Math.min(A.fade, B.fade);
        if (A.part === B.part) {
          lc.strokeStyle = `${hues[A.part]}${(0.1 + f * 0.24).toFixed(3)})`;
          lc.setLineDash([]);
        } else {
          lc.strokeStyle = `rgba(244,239,229,${(0.08 + f * 0.2).toFixed(3)})`;
          lc.setLineDash([2, 3]);
        }
        lc.beginPath(); lc.moveTo(A.x, A.y); lc.lineTo(B.x, B.y); lc.stroke();
      });
      lc.setLineDash([]);
      nodes.forEach((n) => {
        lc.fillStyle = `${hues[n.part]}${(0.18 + n.fade * 0.5).toFixed(3)})`;
        lc.beginPath(); lc.arc(n.x, n.y, 1.3 + n.fade * 0.9, 0, Math.PI * 2); lc.fill();
      });

      const usable = nodes.map((n, i) => i).filter((i) => adj[i].length > 0);
      const count = Math.min(usable.length, W < 700 ? 34 : 64);
      cars = [];
      for (let k = 0; k < count; k += 1) {
        const from = usable[Math.floor(rand() * usable.length)];
        const to = adj[from][Math.floor(rand() * adj[from].length)];
        cars.push({ from, to, t: rand(), v: 0.55 + rand() * 0.7, prev: -1, rand: rng(k * 7919 + 13) });
      }
      pulses = [];
    };

    const drawCars = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(layer, 0, 0, W, H);
      cars.forEach((c) => {
        const A = nodes[c.from];
        const B = nodes[c.to];
        const x = A.x + (B.x - A.x) * c.t;
        const y = A.y + (B.y - A.y) * c.t;
        const tx = A.x + (B.x - A.x) * Math.max(0, c.t - 0.45);
        const ty = A.y + (B.y - A.y) * Math.max(0, c.t - 0.45);
        const part = c.t < 0.5 ? A.part : B.part;
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, `${hues[part]}0)`);
        g.addColorStop(1, `${hues[part]}0.85)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = `${hues[part]}0.95)`;
        ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
      });
      pulses.forEach((p) => {
        const k = p.age / 900;
        ctx.strokeStyle = `rgba(244,239,229,${(0.5 * (1 - k)).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 + k * 12, 0, Math.PI * 2); ctx.stroke();
      });
    };

    const step = (dt) => {
      cars.forEach((c) => {
        const A = nodes[c.from];
        const B = nodes[c.to];
        const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        c.t += (c.v * 0.045 * dt) / len;
        if (c.t >= 1) {
          if (A.part !== B.part) pulses.push({ x: B.x, y: B.y, age: 0 });
          const options = adj[c.to].filter((n) => n !== c.from);
          const nextTo = options.length ? options[Math.floor(c.rand() * options.length)] : c.from;
          c.from = c.to; c.to = nextTo; c.t -= 1;
          if (c.t > 1) c.t = 0;
        }
      });
      pulses.forEach((p) => { p.age += dt; });
      pulses = pulses.filter((p) => p.age < 900);
    };

    const loop = (now) => {
      if (!running) return;
      const dt = lastT ? Math.min(48, now - lastT) : 16;
      lastT = now;
      step(dt);
      drawCars();
      requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduce.matches || !visible || d.hidden) return;
      running = true; lastT = 0;
      requestAnimationFrame(loop);
    };
    const stop = () => { running = false; };

    build();
    drawCars();
    start();

    let lastW = W;
    window.addEventListener('resize', () => {
      const w = Math.round(canvas.getBoundingClientRect().width);
      if (Math.abs(w - lastW) < 2 && Math.abs(Math.round(canvas.getBoundingClientRect().height) - H) < 40) return;
      lastW = w; build(); drawCars();
    });
    d.addEventListener('visibilitychange', () => { if (d.hidden) stop(); else start(); });
    reduce.addEventListener('change', (e) => { if (e.matches) { stop(); drawCars(); } else start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => {
        visible = en[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(canvas);
    }
  }

  // Suggest the other language once, if the browser prefers it.
  const hint = $('[data-lang-hint]');
  if (hint) {
    const key = 'xj-lang-hint';
    let seen = null;
    try { seen = localStorage.getItem(key); } catch (_) { /* storage blocked */ }
    const target = hint.dataset.langHint;
    const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''])
      .map((l) => String(l).toLowerCase());
    const first = prefs[0] || '';
    const wantsZh = first.startsWith('zh');
    const wantsEn = first.startsWith('en');
    if (!seen && ((target === 'zh' && wantsZh) || (target === 'en' && wantsEn))) {
      const remember = () => { try { localStorage.setItem(key, '1'); } catch (_) { /* storage blocked */ } };
      let shown = false;
      const show = () => {
        if (shown) return;
        shown = true;
        hint.hidden = false;
        window.removeEventListener('scroll', onScroll);
      };
      const onScroll = () => { if (window.scrollY > 240) show(); };
      window.addEventListener('scroll', onScroll, { passive: true });
      setTimeout(show, 6000);
      $('[data-lang-hint-close]', hint).addEventListener('click', () => { hint.hidden = true; remember(); });
      $('a', hint).addEventListener('click', remember);
    }
    $$('[data-lang-switch]').forEach((a) => a.addEventListener('click', () => {
      try { localStorage.setItem(key, '1'); } catch (_) { /* storage blocked */ }
    }));
  }
})();
