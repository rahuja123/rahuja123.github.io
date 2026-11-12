// Two small illustrations drawn on <canvas>, no dependencies.
//   #vla  — front camera + language instruction → planned trajectory (illustrative, not model output)
//   #lens — one street seen through a pinhole lens, morphing to fisheye (r = f·tanθ → r = f·θ)
//   #flow — scene flow on a simulated top-down LiDAR sweep
// A canvas with data-static draws a single frame; data-h sets its height in px.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let col;
  const readColors = () => (col = { ink: css('--ink'), dim: css('--faint'), acc: css('--accent'), bg: css('--bg') });
  readColors();
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const scenes = [];

  function mount(id, scene) {
    const c = document.getElementById(id);
    if (!c) return;
    const ctx = c.getContext('2d');
    const s = { scene, ctx, t: 0, visible: true, still: reduce || 'static' in c.dataset };
    c.style.height = (c.dataset.h || 210) + 'px';      // fixed height: canvas size never feeds back into layout
    s.size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      s.W = c.clientWidth; s.H = c.clientHeight;
      c.width = s.W * dpr; c.height = s.H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.build(s.W, s.H);
    };
    s.render = () => {
      ctx.globalAlpha = 1; ctx.clearRect(0, 0, s.W, s.H);
      scene.draw(ctx, s.W, s.H, s.still ? scene.stillT : s.t);
    };
    s.size(); s.render();
    new ResizeObserver(() => { s.size(); s.render(); }).observe(c);
    new IntersectionObserver(([e]) => (s.visible = e.isIntersecting)).observe(c);
    scenes.push(s);
  }

  // ---------------------------------------------------------------- VLA
  const vla = (() => {
    const T = 5.4;                                    // seconds per scenario
    let hz, vx, f, hf, road;
    const P = (X, Z) => [vx + (X * f) / Z, hz + hf / Z];   // ground plane → image
    const line = (x0, z0, x1, z1, n) =>
      Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]);
    const bez = (a, b, c, d, n) => Array.from({ length: n + 1 }, (_, i) => {
      const u = i / n, v = 1 - u;
      return [0, 1].map(k => v * v * v * a[k] + 3 * v * v * u * b[k] + 3 * v * u * u * c[k] + u * u * u * d[k]);
    });
    const S = [
      { say: 'keep lane', act: 'steer +0.00 · accel +0.20', path: line(0, 3, 0, 60, 40) },
      { say: 'turn left at the intersection', act: 'steer −0.41 · accel −0.15',
        path: [...line(0, 3, 0, 7.2, 10), ...bez([0, 7.2], [0, 9.3], [-1.6, 9.3], [-4, 9.3], 14).slice(1),
               ...line(-4, 9.3, -30, 9.3, 14).slice(1)] },
      { say: 'stop for the pedestrian', act: 'steer +0.00 · brake 0.80', path: line(0, 3, 0, 4.7, 8), ped: true },
    ];
    const gap = z => z > 7 && z < 10;                 // the cross street

    function build(W, H) {
      hz = H * 0.3; vx = W / 2;
      hf = 3 * (H - hz);                              // Z = 3 m lands on the bottom edge
      f = W * 0.5;                                    // ego lane edge sits 30% of the width from centre at the bottom
      road = [];
      for (let y = H; y > hz + 3; y -= 4) {           // sample evenly in image space, not in depth
        const z = hf / (y - hz);
        if (gap(z)) continue;
        road.push(P(-5.4, z), P(1.8, z));
        if (Math.floor(z * 1.3) % 2) road.push(P(-1.8, z));   // dashed centre line
      }
      for (let x = 0; x < W; x += 9) road.push([x, hz]);       // horizon
      for (let X = -60; X <= 60; X += 0.6) if (X < -5.4 || X > 1.8) road.push(P(X, 7), P(X, 10));
      road = road.filter(([x, y]) => x > -2 && x < W + 2 && y < H + 2);
    }

    function person(ctx, H) {
      const Z = 6, X = 0.15, h = (1.75 * (hf / 3)) / Z, w = (0.6 * f) / Z;
      const [x, foot] = P(X, Z), top = foot - h;
      ctx.strokeStyle = col.ink; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(x, top + h * 0.1, h * 0.09, 0, 2 * Math.PI);
      ctx.moveTo(x, top + h * 0.2); ctx.lineTo(x, top + h * 0.58);                  // body
      ctx.moveTo(x - w * 0.45, top + h * 0.32); ctx.lineTo(x + w * 0.45, top + h * 0.4); // arms
      ctx.moveTo(x, top + h * 0.58); ctx.lineTo(x - w * 0.3, foot);
      ctx.moveTo(x, top + h * 0.58); ctx.lineTo(x + w * 0.3, foot);                // legs
      ctx.stroke();
      // detection box + tag
      const bx = x - w * 0.75, by = top - 4, bw = w * 1.5, bh = h + 6, l = 6;
      ctx.strokeStyle = col.acc; ctx.globalAlpha = 1; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const [cx, cy, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
        ctx.moveTo(cx + dx * l, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * l);
      }
      ctx.stroke();
      ctx.font = '500 10px ' + MONO; ctx.textBaseline = 'bottom';
      const tag = 'person', tw = ctx.measureText(tag).width + 8;
      ctx.fillStyle = col.acc; ctx.fillRect(bx, by - 14, tw, 14);
      ctx.fillStyle = col.bg; ctx.fillText(tag, bx + 4, by - 2);
    }

    function draw(ctx, W, H, t) {
      const s = S[Math.floor(t / T) % S.length], u = t % T;
      const fade = u > T - 0.6 ? (T - u) / 0.6 : 1;

      ctx.fillStyle = col.dim; ctx.globalAlpha = 0.6;
      for (const [x, y] of road) ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
      if (s.ped) person(ctx, H);

      // planned trajectory
      const p = Math.max(0, Math.min(1, (u - 1.2) / 1.1));
      if (p > 0) {
        const pts = s.path.map(([X, Z]) => P(X, Z)), n = Math.round(p * (pts.length - 1));
        ctx.strokeStyle = col.acc; ctx.lineWidth = 2; ctx.globalAlpha = 0.3 * fade;
        ctx.beginPath(); pts.slice(0, n + 1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.fillStyle = col.acc; ctx.globalAlpha = fade;
        for (const [x, y] of pts.slice(0, n + 1)) ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
        if (s.ped && p === 1) {                       // stop line
          const [a, y] = P(-1.2, 4.75), [b] = P(1.2, 4.75);
          ctx.fillRect(a, y - 1.5, b - a, 3);
        }
      }

      // language in, action out
      ctx.font = '12px ' + MONO; ctx.textBaseline = 'top'; ctx.globalAlpha = fade;
      const typed = Math.min(1, u / 1.1), shown = s.say.slice(0, Math.round(typed * s.say.length));
      const cursor = typed < 1 || Math.floor(u * 2) % 2 ? '▍' : '';
      ctx.fillStyle = col.dim; ctx.fillText('>', 0, 0);
      ctx.fillStyle = col.ink; ctx.fillText(shown + cursor, 16, 0);
      ctx.fillStyle = col.dim; ctx.textAlign = 'right'; ctx.fillText('cam_front', W, 0); ctx.textAlign = 'left';
      if (u > 2.4) {
        ctx.globalAlpha = fade * Math.min(1, (u - 2.4) / 0.3);
        const w = ctx.measureText(s.act).width;
        ctx.fillStyle = col.bg; ctx.fillRect(0, H - 18, w + 8, 18);
        ctx.fillStyle = col.acc; ctx.textBaseline = 'bottom'; ctx.fillText(s.act, 0, H - 2);
      }
    }
    return { build, draw, stillT: T + 3.5 };          // still frame: the left turn, fully planned
  })();

  // ---------------------------------------------------------------- Pinhole ↔ fisheye
  const lens = (() => {
    const CYCLE = 8;                                  // hold pinhole, morph, hold fisheye, morph back
    let cx, cy, f, ground, walls, objects;
    // camera frame: X right, Y down, Z forward; camera 1.6 m above the ground
    const seg = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a.map((v, k) => v + ((b[k] - v) * i) / n));
    const depthLine = (X, Y, z0, z1, n) =>            // even spacing on screen: sample uniformly in 1/Z
      Array.from({ length: n + 1 }, (_, i) => [X, Y, 1 / (1 / z0 + ((1 / z1 - 1 / z0) * i) / n)]);
    const box = (x0, x1, y0, y1, z0, z1, n) => {
      const c = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
      const e = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      return e.flatMap(([a, b]) => seg(c[a], c[b], n));
    };

    function build(W, H) {
      cx = W / 2; cy = H / 2; f = W / 2 / 1.4;        // fisheye: 80° off-axis reaches the side edges
      ground = [];
      for (let X = -10; X <= 10; X += 1.25) ground.push(...depthLine(X, 1.6, 1.2, 60, 70));
      for (const Z of [2, 3, 4.5, 6.5, 9, 13, 19, 28]) ground.push(...seg([-12, 1.6, Z], [12, 1.6, Z], 80));
      walls = [];
      for (const X of [-7, 7]) {
        for (const Y of [-3, -0.7, 1.6]) walls.push(...depthLine(X, Y, 2.5, 60, 70));
        for (const Z of [2.5, 4, 6, 9, 14, 22]) walls.push(...seg([X, -3, Z], [X, 1.6, Z], 24));
      }
      objects = [
        { tag: 'car',    pts: box(-1, 1, 0.2, 1.6, 8, 12.5, 10) },
        { tag: 'person', pts: box(-3.3, -2.8, -0.15, 1.6, 4.6, 5, 8) },
      ];
    }

    const morph = t => {                              // 0 = pinhole, 1 = fisheye
      const u = t % CYCLE, ease = x => x * x * (3 - 2 * x);
      if (u < 1.5) return 0;
      if (u < 4) return ease((u - 1.5) / 2.5);
      if (u < 5.5) return 1;
      return 1 - ease((u - 5.5) / 2.5);
    };

    function project([X, Y, Z], m) {
      const rho = Math.hypot(X, Y), th = Math.atan2(rho, Z);
      if (th > 1.5 && m < 0.5) return null;
      const r = (1 - m) * f * Math.tan(Math.min(th, 1.5)) + m * f * th;
      return rho ? [cx + (r * X) / rho, cy + (r * Y) / rho] : [cx, cy];
    }

    function dots(ctx, pts, m, size, W, H) {
      const out = [];
      for (const p of pts) {
        const q = project(p, m);
        if (q && q[0] > -2 && q[0] < W + 2 && q[1] > -2 && q[1] < H + 2) { ctx.fillRect(q[0] - size / 2, q[1] - size / 2, size, size); out.push(q); }
      }
      return out;
    }

    function draw(ctx, W, H, t) {
      const m = morph(t);
      ctx.fillStyle = col.dim;
      ctx.globalAlpha = 0.45; dots(ctx, ground, m, 1.4, W, H);
      ctx.globalAlpha = 0.75; dots(ctx, walls, m, 1.4, W, H);

      for (const o of objects) {
        ctx.fillStyle = col.ink; ctx.globalAlpha = 0.85;
        const q = dots(ctx, o.pts, m, 1.6, W, H);
        if (!q.length) continue;
        const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
        const bx = Math.min(...xs) - 4, by = Math.min(...ys) - 4, bw = Math.max(...xs) - bx + 4, bh = Math.max(...ys) - by + 4, l = 6;
        ctx.strokeStyle = col.acc; ctx.globalAlpha = 1; ctx.lineWidth = 1.4; ctx.beginPath();
        for (const [px, py, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
          ctx.moveTo(px + dx * l, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * l);
        }
        ctx.stroke();
        ctx.font = '500 10px ' + MONO; ctx.textBaseline = 'bottom';
        const tw = ctx.measureText(o.tag).width + 8;
        ctx.fillStyle = col.acc; ctx.fillRect(bx, by - 14, tw, 14);
        ctx.fillStyle = col.bg; ctx.fillText(o.tag, bx + 4, by - 2);
      }

      // which lens, and the projection it uses
      ctx.font = '12px ' + MONO; ctx.textBaseline = 'top'; ctx.globalAlpha = 1;
      const fish = m > 0.5, label = fish ? 'fisheye   r = f·θ' : 'pinhole   r = f·tanθ';
      ctx.fillStyle = col.bg; ctx.fillRect(0, 0, ctx.measureText('> ' + label).width + 8, 17);
      ctx.fillStyle = col.dim; ctx.fillText('>', 0, 0);
      ctx.fillStyle = col.ink; ctx.fillText(label, 16, 0);
    }
    return { build, draw, stillT: 4.75 };             // still frame: fully fisheye
  })();

  // ---------------------------------------------------------------- Scene flow
  const flow = (() => {
    let ex, ey, ground, statics, cars;
    const ang = (x, y) => Math.atan2(y - ey, x - ex);
    const sweep = (a, s) => { let d = (s - a) % (2 * Math.PI); if (d < 0) d += 2 * Math.PI; return Math.exp(-d * 1.6); };

    function build(W, H) {
      ex = W * 0.5; ey = H * 0.5;
      ground = [];                                    // ground returns: concentric rings around the ego vehicle
      for (let r = 22; r < Math.hypot(W, H) / 2; r += 13) {
        const n = Math.floor((2 * Math.PI * r) / 6.5);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 2 * Math.PI, x = ex + Math.cos(a) * r, y = ey + Math.sin(a) * r;
          if (x > 0 && x < W && y > 0 && y < H) ground.push({ x, y, a: ang(x, y) });
        }
      }
      statics = [];                                   // curbs and a few buildings
      for (let x = 0; x < W; x += 4) statics.push({ x, y: ey - 58 }, { x, y: ey + 58 });
      const box = (x0, y0, w, h) => {
        for (let x = x0; x <= x0 + w; x += 4) statics.push({ x, y: y0 }, { x, y: y0 + h });
        for (let y = y0; y <= y0 + h; y += 4) statics.push({ x: x0, y }, { x: x0 + w, y });
      };
      box(W * 0.08, ey - 96, 54, 22); box(W * 0.62, ey - 100, 70, 26);
      box(W * 0.30, ey + 76, 64, 20); box(W * 0.82, ey + 72, 40, 24);
      statics.forEach(p => (p.a = ang(p.x, p.y)));
      cars = [
        { x: W * 0.15, y: ey - 30, v: 38 }, { x: W * 0.70, y: ey - 30, v: 38 },
        { x: W * 0.40, y: ey + 30, v: -52 }, { x: W * 0.95, y: ey + 30, v: -46 },
      ];
    }

    function step(dt, W) {
      for (const car of cars) {
        car.x += car.v * dt;
        if (car.v > 0 && car.x > W + 30) car.x = -30;
        if (car.v < 0 && car.x < -30) car.x = W + 30;
      }
    }

    function draw(ctx, W, H, t) {
      const s = t * 1.3;
      ctx.fillStyle = col.dim;
      for (const p of ground) { ctx.globalAlpha = 0.18 + 0.55 * sweep(p.a, s); ctx.fillRect(p.x, p.y, 1.2, 1.2); }
      ctx.fillStyle = col.ink;
      for (const p of statics) { ctx.globalAlpha = 0.28 + 0.6 * sweep(p.a, s); ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6); }

      ctx.strokeStyle = col.acc; ctx.fillStyle = col.acc; ctx.lineWidth = 1;
      for (const car of cars) {                       // moving points get flow vectors ∝ velocity
        const k = car.v * 0.32;
        for (let dx = -12; dx <= 12; dx += 4) for (const dy of [-6, 6]) {
          const x = car.x + dx, y = car.y + dy;
          ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(x - k, y); ctx.lineTo(x, y); ctx.stroke();
          ctx.globalAlpha = 1; ctx.fillRect(x - 1, y - 1, 2, 2);
        }
        for (const dy of [-2, 2]) for (const dx of [-12, 12]) ctx.fillRect(car.x + dx - 1, car.y + dy - 1, 2, 2);
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = col.ink; ctx.lineWidth = 1.2;   // ego vehicle
      ctx.strokeRect(ex - 11, ey - 5, 22, 10);
      ctx.beginPath(); ctx.moveTo(ex + 11, ey); ctx.lineTo(ex + 16, ey); ctx.stroke();
    }
    return { build, step, draw, stillT: 0.5 };
  })();

  mount('vla', vla);
  mount('lens', lens);
  mount('flow', flow);

  let last = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000 || 0, 0.05); last = now;
    for (const s of scenes) if (s.visible && !s.still) { s.t += dt; s.scene.step?.(dt, s.W, s.H); s.render(); }
    requestAnimationFrame(frame);
  }
  if (scenes.some(s => !s.still)) requestAnimationFrame(frame);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); scenes.forEach(s => s.render()); });
})();
