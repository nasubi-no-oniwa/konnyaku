// こんにゃくの動きの計算（画面なし）。同じ入力なら必ず同じ結果になる
// 単位はメートル、y が上。ゲーム本体（index.html）と確かめ用のプログラムの両方で使う

export const DT = 1 / 120;          // 1回の計算で進める時間
export const SUB = 4;               // その中をさらに細かく分ける
export const GRAV = -12;
export const NX = 9, NY = 3;        // こんにゃくの点の数（横×縦）
export const KW = 1.0, KH = 0.32;   // こんにゃくの大きさ
export const PR = 0.065;            // 点の当たりの半径
export const PAN = { x: 1.4, y: 1.2, len: 1.9, a: -.6 }; // はじく板の真ん中と傾き（右下がり。押し出す向きは右上56°）
export const STILL_NEED = 2.0;      // 何秒止まったらクリアか
export const GAUGE_T = 2.4;         // ためる力が 0→1→0 と1往復する秒数
const FRIC = 0.55, DAMP = 0.99985, STATIC_V = .004, SLIDE_F = .12, SPIN_KEEP = .93, DEF_KEEP = .82, BOUNCE = .6, STICK = .3;

// ----- 形（部品） -----
// circle: {k:'c', x, y, r}  / box: {k:'b', x, y, w, h, a} / poly: {k:'p', pts:[[x,y],...]}（凸・反時計回り）/ cap: {k:'s', x1,y1,x2,y2,r}
function boxPts(x, y, w, h, a = 0) {
  const c = Math.cos(a), s = Math.sin(a), hw = w / 2, hh = h / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
}
export function partPts(p) { return p.k === 'b' ? boxPts(p.x, p.y, p.w, p.h, p.a || 0) : p.pts; }

// 物の位置（時間 t のとき）
export function poseAt(o, t) {
  const m = o.mv || {};
  let x = o.x, y = o.y, a = o.a || 0;
  if (m.ax) x += m.ax * Math.sin((m.w || 1) * t + (m.ph || 0));
  if (m.ay) y += m.ay * Math.sin((m.wy || m.w || 1) * t + (m.phy ?? m.ph ?? 0));
  if (m.rw) a += m.rw * t;
  if (m.ra) a += m.ra * Math.sin((m.rww || 1) * t + (m.rph || 0));
  return { x, y, a };
}
const toWorld = (P, lx, ly) => { const c = Math.cos(P.a), s = Math.sin(P.a); return [P.x + lx * c - ly * s, P.y + lx * s + ly * c]; };
const toLocal = (P, wx, wy) => { const c = Math.cos(P.a), s = Math.sin(P.a), dx = wx - P.x, dy = wy - P.y; return [dx * c + dy * s, -dx * s + dy * c]; };

// 点(lx,ly)が部品にめりこんでいたら、押し出す向き(nx,ny)と深さ d を返す（物の中の座標で）
function hitPart(p, lx, ly, r) {
  if (p.k === 'c') {
    const dx = lx - p.x, dy = ly - p.y, L = Math.hypot(dx, dy), d = p.r + r - L;
    if (d <= 0) return null; return L > 1e-6 ? [dx / L, dy / L, d] : [0, 1, d];
  }
  if (p.k === 's') {
    const ex = p.x2 - p.x1, ey = p.y2 - p.y1, L2 = ex * ex + ey * ey;
    let u = L2 > 0 ? ((lx - p.x1) * ex + (ly - p.y1) * ey) / L2 : 0; u = Math.max(0, Math.min(1, u));
    const cx = p.x1 + ex * u, cy = p.y1 + ey * u, dx = lx - cx, dy = ly - cy, L = Math.hypot(dx, dy), d = p.r + r - L;
    if (d <= 0) return null; return L > 1e-6 ? [dx / L, dy / L, d] : [0, 1, d];
  }
  // 凸の多角形：いちばん浅い辺から押し出す（角は丸く扱う）
  const pts = p._pts || (p._pts = partPts(p)); const n = pts.length;
  let best = -1e9, bn = null;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey) || 1;
    const nx = ey / L, ny = -ex / L; // 反時計回りなので外向き
    const s = (lx - a[0]) * nx + (ly - a[1]) * ny;
    if (s > r) return null;
    if (s > best) { best = s; bn = [nx, ny]; }
  }
  return [bn[0], bn[1], r - best];
}

// ----- こんにゃく -----
export function makeKonnyaku(cx, cy, ang = 0) {
  const P = [], C = [];
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const u = (i / (NX - 1) - .5) * KW, v = (j / (NY - 1) - .5) * KH;
    const x = cx + u * c - v * s, y = cy + u * s + v * c; P.push({ x, y, px: x, py: y, ct: 0 });
  }
  const id = (i, j) => j * NX + i;
  const link = (a, b, k) => C.push([a, b, Math.hypot(P[a].x - P[b].x, P[a].y - P[b].y), k]);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    if (i + 1 < NX) link(id(i, j), id(i + 1, j), 1);
    if (j + 1 < NY) link(id(i, j), id(i, j + 1), 1);
    if (i + 1 < NX && j + 1 < NY) { link(id(i, j), id(i + 1, j + 1), .75); link(id(i + 1, j), id(i, j + 1), .75); }
    if (i + 2 < NX) link(id(i, j), id(i + 2, j), .5);   // 曲がりにくさ（ぷるぷる）
    if (j + 2 < NY) link(id(i, j), id(i, j + 2), .5);
    if (i + 2 < NX && j + 1 < NY) { link(id(i, j), id(i + 2, j + 1), .35); link(id(i + 2, j), id(i, j + 1), .35); }
  }
  return { P, C };
}

// ----- はじく板（右下がりに傾いた板が、板の向きにまっすぐ飛び出す） -----
// s：板が押し出された量（0 がふつう、負で引いてためる、正で飛び出す）
export const PAN_PARTS = [
  { k: 'b', x: 0, y: -.05, w: PAN.len, h: .1 },                   // 底
  { k: 'b', x: PAN.len / 2 + .02, y: .13, w: .1, h: .36 },        // 右のふち（こんにゃくはここで止まる）
  { k: 'b', x: -PAN.len / 2 - .02, y: .05, w: .08, h: .2 },       // 左のふち
];
export const PAN_N = [Math.sin(-PAN.a), Math.cos(-PAN.a)];
export function panPose(s) { return { x: PAN.x + PAN_N[0] * s, y: PAN.y + PAN_N[1] * s, a: PAN.a }; }
const PAN_REST = 0, PAN_WIND = -.16, PAN_TOP = .32;
export const PAN_V0 = 4.6, PAN_V1 = 6.0; // はじく速さ：PAN_V0 + PAN_V1 × 力

// ----- 面 -----
export function newGame(stage, seed = 1) {
  const g = {
    st: stage, t: 0, k: null, state: 'drop', dropT: 0, still: 0, fails: 0, clear: false,
    pan: { ang: PAN_REST, prev: PAN_REST, mode: 'rest', w: 0, power: 0, holdT: 0 },
    objs: stage.objs.map(o => ({ ...o, parts: o.parts.map(p => ({ ...p })) })),
    wind: stage.wind || [], contacts: 0, onPan: 0, offT: 0,
  };
  for (const o of g.objs) { o.pose = poseAt(o, 0); o.prevPose = o.pose; }
  spawn(g);
  return g;
}
function spawn(g) { g.k = makeKonnyaku(PAN.x - .2, PAN.y + 2.6, PAN.a + .1); g.state = 'drop'; g.still = 0; g.offT = 0; }

// 入力：hold（押しているか）
export function stepGame(g, hold) {
  if (g.clear) return;
  const pan = g.pan;
  // ためる力は 0→1→0 を行き来する（1.6秒で1往復）
  if (hold && (pan.mode === 'rest' || pan.mode === 'wind')) { pan.mode = 'wind'; pan.holdT += DT; const ph = (pan.holdT / GAUGE_T) % 1; pan.power = ph < .5 ? ph * 2 : 2 - ph * 2; }
  if (!hold && pan.mode === 'wind') { pan.mode = 'up'; pan.w = PAN_V0 + PAN_V1 * pan.power; pan.lastPower = pan.power; pan.holdT = 0; }
  pan.prev = pan.ang;
  if (pan.mode === 'wind') pan.ang += (PAN_WIND - pan.ang) * Math.min(1, DT * 12);
  else if (pan.mode === 'up') { pan.ang += pan.w * DT; if (pan.ang >= PAN_TOP) { pan.ang = PAN_TOP; pan.mode = 'down'; } }
  else if (pan.mode === 'down') { pan.ang -= 1.2 * DT; if (pan.ang <= PAN_REST) { pan.ang = PAN_REST; pan.mode = 'rest'; pan.power = 0; } }
  for (const o of g.objs) { o.prevPose = o.pose; o.pose = poseAt(o, g.t + DT); }
  const panP0 = panPose(pan.prev), panP1 = panPose(pan.ang);
  const h = DT / SUB, h2 = h * h, P = g.k.P, C = g.k.C;
  let contacts = 0, onPan = 0;
  for (let sub = 0; sub < SUB; sub++) {
    const f = (sub + 1) / SUB, lerpP = (A, B) => ({ x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, a: A.a + (B.a - A.a) * f });
    const f0 = sub / SUB, lerp0 = (A, B) => ({ x: A.x + (B.x - A.x) * f0, y: A.y + (B.y - A.y) * f0, a: A.a + (B.a - A.a) * f0 });
    for (const p of P) {
      let vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP; p.px = p.x; p.py = p.y;
      let ax = 0, ay = GRAV;
      for (const w of g.wind) if (p.x > w.x0 && p.x < w.x1 && p.y > w.y0 && p.y < w.y1) { ax += w.fx; ay += w.fy; }
      p.x += vx + ax * h2; p.y += vy + ay * h2; p.ct = 0; p.chit = 0;
    }
    for (let it = 0; it < 3; it++) {
      for (const [a, b, L, k] of C) {
        const A = P[a], B = P[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-6, e = (d - L) / d * .5 * k;
        A.x += dx * e; A.y += dy * e; B.x -= dx * e; B.y -= dy * e;
      }
      const last = it === 2;
      // フライパン
      const PP1 = lerpP(panP0, panP1), PP0 = lerp0(panP0, panP1);
      for (const p of P) for (const part of PAN_PARTS) if (collide(p, part, PP0, PP1, last)) { p.ct |= 2; }
      // 物
      for (const o of g.objs) {
        const Q1 = lerpP(o.prevPose, o.pose), Q0 = lerp0(o.prevPose, o.pose);
        for (const p of P) for (const part of o.parts) if (collide(p, part, Q0, Q1, last)) p.ct |= o.tgt ? 1 : 4;
      }
    }
    // はね返りをおさえる：当たった面の向きにこんにゃく全体が離れていく速さを、BOUNCE まで減らす
    let cn = 0, nX = 0, nY = 0, sX = 0, sY = 0;
    for (const p of P) if (p.chit) { cn++; nX += p.cnx; nY += p.cny; sX += p.csx; sY += p.csy; }
    if (cn) {
      const L = Math.hypot(nX, nY) || 1; nX /= L; nY /= L; sX /= cn; sY /= cn;
      let mvx = 0, mvy = 0; for (const p of P) { mvx += p.x - p.px; mvy += p.y - p.py; } mvx /= P.length; mvy /= P.length;
      const vn = (mvx - sX) * nX + (mvy - sY) * nY, lim = BOUNCE * h;
      if (vn > lim) { const e = vn - lim; for (const p of P) { p.px += e * nX; p.py += e * nY; } }
      // べちゃっと貼りつく：面にそってすべる速さも、こんにゃく全体で減らす（触れている点が多いほど強く）
      const tvx = (mvx - sX) - vn * nX, tvy = (mvy - sY) - vn * nY, k = Math.min(1, STICK * Math.min(1, cn / 3));
      for (const p of P) { p.px += tvx * k; p.py += tvy * k; }
    }
  }
  let any = 0;
  let cyS = 0;
  for (const p of P) { if (p.ct & 1) { contacts++; cyS += p.y; } if (p.ct & 2) onPan++; if (p.ct) any++; }
  g.contactY = contacts ? cyS / contacts : 0;
  // 揺れ（形の変化）は少しずつおさめ、空中では回転もおさえる（ぺたんと着地できるように）
  {
    let mx = 0, my = 0, dx = 0, dy = 0; const n = P.length;
    for (const p of P) { mx += p.x; my += p.y; dx += p.x - p.px; dy += p.y - p.py; }
    mx /= n; my /= n; dx /= n; dy /= n;
    let Lm = 0, I = 0;
    for (const p of P) { const rx = p.x - mx, ry = p.y - my; Lm += rx * (p.y - p.py - dy) - ry * (p.x - p.px - dx); I += rx * rx + ry * ry; }
    const w0 = Lm / (I || 1), w = any ? w0 : w0 * SPIN_KEEP;
    for (const p of P) {
      const rx = p.x - mx, ry = p.y - my, gx = dx - ry * w, gy = dy + rx * w;   // かたまりとしての動き
      const vx = p.x - p.px, vy = p.y - p.py;
      const nx = gx + (vx - (dx - ry * w0)) * DEF_KEEP, ny = gy + (vy - (dy + rx * w0)) * DEF_KEEP;
      p.px = p.x - nx; p.py = p.y - ny;
    }
  }
  g.contacts = contacts; g.onPan = onPan;
  g.t += DT;
  // 状態
  let cx = 0, cy = 0, vmax = 0;
  for (const p of P) { cx += p.x; cy += p.y; vmax = Math.max(vmax, Math.hypot(p.x - p.px, p.y - p.py) / h); }
  cx /= P.length; cy /= P.length; g.cx = cx; g.cy = cy; g.vmax = vmax;
  const sb = g.st.bounds || [-6, -3, 32, 40];
  if (cy < sb[1] || cx < sb[0] || cx > sb[2] || cy > sb[3]) { g.fails++; g.lastFail = g.t; spawn(g); return 'fail'; }
  // 何にも触れずに長く止まっている（どこかにはさまった）ときも失敗
  if (onPan === 0 && contacts === 0 && vmax < .2) { g.offT += DT; if (g.offT > 2.5) { g.fails++; g.lastFail = g.t; spawn(g); return 'fail'; } } else g.offT = 0;
  // 動く物の上では、その物から見た速さで「止まっている」かを見る
  let vrel = vmax;
  if (contacts >= 2) for (const o of g.objs) {
    if (!o.tgt || !o.mv) continue;
    const A = o.prevPose, B = o.pose, w = (B.a - A.a) / DT, ox = (B.x - A.x) / DT, oy = (B.y - A.y) / DT;
    let m = 0;
    for (const p of P) { const rx = p.x - B.x, ry = p.y - B.y; m = Math.max(m, Math.hypot((p.x - p.px) / h - (ox - ry * w), (p.y - p.py) / h - (oy + rx * w))); }
    vrel = Math.min(vrel, m);
  }
  g.vrel = vrel;
  if (contacts >= 2 && onPan === 0 && vrel < .45 && cy > g.contactY + .03) { g.still += DT; if (g.still >= STILL_NEED) { g.clear = true; return 'clear'; } }
  else g.still = Math.max(0, g.still - DT * 3);
  return null;
}

// 点 p と部品 part（ポーズ Q0→Q1 に動いている）がめりこんでいたら押し出す。last のときは速さも直す（はね返らない・摩擦）
function collide(p, part, Q0, Q1, last) {
  const [lx, ly] = toLocal(Q1, p.x, p.y);
  const hit = hitPart(part, lx, ly, PR); if (!hit) return false;
  const [nlx, nly, d] = hit, c = Math.cos(Q1.a), s = Math.sin(Q1.a);
  const nx = nlx * c - nly * s, ny = nlx * s + nly * c;
  p.x += nx * d; p.y += ny * d;
  if (last) {
    // 物の表面がこの間に動いた分（同じ点を前のポーズで見た位置との差）
    const [lx2, ly2] = toLocal(Q1, p.x, p.y), [wx0, wy0] = toWorld(Q0, lx2, ly2);
    const sx = p.x - wx0, sy = p.y - wy0;
    const vx = p.x - p.px - sx, vy = p.y - p.py - sy;           // 表面に対する速さ（1回分の移動量）
    let vn = vx * nx + vy * ny; const tx = vx - vn * nx, ty = vy - vn * ny, tl = Math.hypot(tx, ty);
    vn = Math.min(0, vn) * 0;                                      // 表面から離れる向きの速さは消す（はね返らない）
    const keep = tl < STATIC_V ? 0 : Math.max(0, 1 - SLIDE_F);    // ゆっくりなら止まる、速ければ少しずつ減る
    const nvx = sx + tx * keep + vn * nx, nvy = sy + ty * keep + vn * ny;
    p.px = p.x - nvx; p.py = p.y - nvy;
    p.cnx = nx; p.cny = ny; p.csx = sx; p.csy = sy; p.chit = 1;
  }
  return true;
}
