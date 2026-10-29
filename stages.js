// 30面。こんにゃくを乗せる先（tgt: true）と、じゃま物（tgt: false）
// 座標はメートル。フライパンの軸は (2.2, 1.0)。こんにゃくは右へ 3〜9m ほど飛ぶ

const ccw = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a < 0 ? pts.slice().reverse() : pts; };
const P = pts => ({ k: 'p', pts: ccw(pts) });
const C = (x, y, r) => ({ k: 'c', x, y, r });
const B = (x, y, w, h, a = 0) => ({ k: 'b', x, y, w, h, a });
const S = (x1, y1, x2, y2, r) => ({ k: 's', x1, y1, x2, y2, r });
function dome(r, n = 10) { const pts = []; for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; pts.push([r * Math.cos(t), r * Math.sin(t)]); } return P(pts); }
function arc(R, a0, a1, n, r) { const out = []; for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n; out.push(S(R * Math.cos(t0), R * Math.sin(t0), R * Math.cos(t1), R * Math.sin(t1), r)); } return out; }
function star(R, r) {
  const outer = [], inner = [];
  for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + i * 2 * Math.PI / 5; outer.push([R * Math.cos(a), R * Math.sin(a)]); const b = a + Math.PI / 5; inner.push([r * Math.cos(b), r * Math.sin(b)]); }
  const parts = [P(inner)];
  for (let i = 0; i < 5; i++) parts.push(P([outer[i], inner[(i + 4) % 5], inner[i]]));
  return parts;
}

export const STAGES = [
  { name: ['まな板', 'Cutting board', '砧板', '도마'], objs: [{ tgt: 1, vis: 'wood', col: 0xd9b07a, x: 5.6, y: 1.1, parts: [B(0, 0, 2.2, .22)] }] },
  { name: ['階段', 'Stairs', '樓梯', '계단'], objs: [{ tgt: 1, vis: 'stone', col: 0xa9a49a, x: 5.2, y: .2, parts: [B(.3, .3, 2.6, .6), B(.75, .9, 1.7, .6), B(1.2, 1.5, .8, .6)] }] },
  { name: ['星', 'Star', '星星', '별'], objs: [{ tgt: 1, vis: 'star', col: 0xffd23f, x: 6.0, y: 2.1, a: .1, parts: star(1.0, .42) }] },
  { name: ['鳥居', 'Shrine gate', '鳥居', '도리이'], objs: [
    { tgt: 1, vis: 'torii', col: 0xd23a26, x: 6.3, y: 3.0, parts: [B(0, 0, 2.8, .22), B(0, -.55, 2.0, .14)] },
    { tgt: 0, vis: 'torii', col: 0xd23a26, x: 6.3, y: 3.0, parts: [B(-.8, -1.5, .2, 3.0), B(.8, -1.5, .2, 3.0)] }] },
  { name: ['三日月', 'Crescent moon', '彎月', '초승달'], objs: [{ tgt: 1, vis: 'moon', col: 0xffe27a, x: 6.2, y: 2.9, a: .35, parts: arc(.9, Math.PI * 1.05, Math.PI * 1.95, 7, .16) }] },
  { name: ['バナナ', 'Banana', '香蕉', '바나나'], objs: [{ tgt: 1, vis: 'banana', col: 0xf5d33a, x: 6.0, y: 2.6, parts: arc(1.1, Math.PI * 1.15, Math.PI * 1.85, 6, .13) }] },
  { name: ['シーソー', 'Seesaw', '蹺蹺板', '시소'], objs: [
    { tgt: 1, vis: 'wood', col: 0xd9b07a, x: 6.0, y: 1.4, mv: { ra: .4, rww: .9 }, parts: [B(0, 0, 2.6, .16)] },
    { tgt: 0, vis: 'stone', col: 0x888888, x: 6.0, y: 1.4, parts: [P([[-.3, -1.2], [.3, -1.2], [0, -.08]])] }] },
  { name: ['動く台', 'Moving stand', '移動台', '움직이는 받침'], objs: [{ tgt: 1, vis: 'wood', col: 0x8fc0e8, x: 6.0, y: 1.7, mv: { ax: 1.3, w: 1.0 }, parts: [B(0, 0, 1.3, .2)] }] },
  { name: ['シーソー皿', 'Wobbly plate', '搖擺盤子', '흔들 접시'], objs: [
    { tgt: 1, vis: 'plate', col: 0xf2efe6, x: 6.0, y: 2.0, mv: { ra: .32, rww: 1.1 }, parts: [B(0, 0, 1.8, .12)] },
    { tgt: 0, vis: 'metal', col: 0x777777, x: 6.0, y: 2.0, parts: [S(0, -.08, 0, -2.0, .06)] }] },
  { name: ['ゆれる鉄棒', 'Swinging bar', '搖晃單槓', '흔들리는 철봉'], objs: [{ tgt: 1, vis: 'metal', col: 0xb8bcc2, x: 6.0, y: 2.2, mv: { ax: .45, ay: .3, w: 1.2, wy: 2.4 }, parts: [S(-.7, 0, .7, 0, .07)] }] },
  { name: ['なすび', 'Eggplant', '茄子', '가지'], objs: [{ tgt: 1, vis: 'nasu', col: 0x5b2a86, x: 6.0, y: 1.3, a: -.5, parts: [C(0, 0, .58), C(0, .55, .46), C(0, .95, .32), S(0, 1.15, 0, 1.45, .08)] }] },
  { name: ['大玉', 'Big ball', '大球', '큰 공'], objs: [{ tgt: 1, vis: 'ball', col: 0x2f6fd0, x: 6.2, y: 1.0, parts: [C(0, 0, 1.0)] }] },
  { name: ['ドーナツ', 'Donut', '甜甜圈', '도넛'], objs: [{ tgt: 1, vis: 'donut', col: 0xe8a2c8, x: 6.0, y: 1.8, parts: arc(.62, 0, Math.PI * 2, 12, .24) }] },
  { name: ['逆さコーン', 'Upside-down cone', '倒立錐', '거꾸로 콘'], objs: [
    { tgt: 1, vis: 'cone', col: 0xf07a1e, x: 6.0, y: 2.6, parts: [P([[-.65, 0], [0, -1.1], [.65, 0]])] },
    { tgt: 0, vis: 'metal', col: 0x777777, x: 6.0, y: 2.6, parts: [S(0, -1.1, 0, -2.6, .06)] }] },
  { name: ['鉄棒', 'Iron bar', '單槓', '철봉'], objs: [
    { tgt: 1, vis: 'metal', col: 0xb8bcc2, x: 5.8, y: 2.1, parts: [S(-.7, 0, .7, 0, .06)] },
    { tgt: 0, vis: 'metal', col: 0x8a8f96, x: 5.8, y: 2.1, parts: [S(-.75, 0, -.75, -2.3, .05), S(.75, 0, .75, -2.3, .05)] }] },
  { name: ['傘', 'Umbrella', '雨傘', '우산'], objs: [
    { tgt: 1, vis: 'dome', col: 0x7a4fc2, x: 6.0, y: 2.3, parts: [dome(1.0)] },
    { tgt: 0, vis: 'metal', col: 0x3a3a3a, x: 6.0, y: 2.3, parts: [S(0, 0, 0, -1.9, .05)] }] },
  { name: ['向かい風', 'Headwind', '逆風', '맞바람'], wind: [{ x0: 3, x1: 10, y0: .5, y1: 9, fx: -5, fy: 0 }], objs: [{ tgt: 1, vis: 'balloon', col: 0x2f6fd0, x: 5.6, y: 2.2, parts: [C(0, 0, .6)] }] },
  { name: ['雲', 'Cloud', '雲', '구름'], objs: [{ tgt: 1, vis: 'cloud', col: 0xf4f6fb, x: 6.2, y: 3.0, mv: { ax: .5, w: .7 }, parts: [C(-.7, 0, .42), C(0, .2, .55), C(.7, 0, .42), B(0, -.18, 1.4, .4)] }] },
  { name: ['三角コーン', 'Traffic cone', '三角錐', '라바콘'], objs: [{ tgt: 1, vis: 'cone', col: 0xf07a1e, x: 5.4, y: .2, parts: [P([[-.6, 0], [.6, 0], [0, 1.6]])] }] },
  { name: ['追い風', 'Tailwind', '順風', '순풍'], wind: [{ x0: 2.6, x1: 7.5, y0: 1.8, y1: 9, fx: 6, fy: 0 }], objs: [{ tgt: 1, vis: 'wood', col: 0x8fc0e8, x: 9.6, y: 1.6, parts: [B(0, 0, 1.2, .2)] }] },
  { name: ['回る十字', 'Spinning cross', '旋轉十字', '도는 십자'], objs: [{ tgt: 1, vis: 'metal', col: 0x4a90d9, x: 6.0, y: 2.2, mv: { rw: .45 }, parts: [B(0, 0, 2.4, .16), B(0, 0, .16, 2.4)] }] },
  { name: ['見えない壁', 'Invisible wall', '看不見的牆', '보이지 않는 벽'], objs: [
    { tgt: 1, vis: 'wood', col: 0xd9b07a, x: 8.0, y: 1.0, parts: [B(0, 0, 1.6, .22)] },
    { tgt: 0, vis: 'ghost', col: 0xffffff, x: 6.0, y: 1.9, parts: [B(0, 0, .3, 1.8)] }] },
  { name: ['風船ふたつ', 'Two balloons', '兩個氣球', '풍선 두 개'], objs: [
    { tgt: 1, vis: 'balloon', col: 0xe8352b, x: 5.4, y: 2.5, mv: { ay: .25, w: 1.3 }, parts: [C(0, 0, .42)] },
    { tgt: 1, vis: 'balloon', col: 0x2fb36b, x: 6.6, y: 2.5, mv: { ay: .25, w: 1.3, ph: Math.PI }, parts: [C(0, 0, .42)] }] },
  { name: ['風船', 'Balloon', '氣球', '풍선'], objs: [{ tgt: 1, vis: 'balloon', col: 0xe8352b, x: 5.0, y: 2.3, parts: [C(0, 0, .6)] }] },
  { name: ['細い柱', 'Thin pillar', '細柱', '가는 기둥'], objs: [{ tgt: 1, vis: 'stone', col: 0xc9c2b4, x: 6.0, y: 1.4, parts: [B(0, 0, .6, 2.8)] }] },
  { name: ['ゆれる風船', 'Bobbing balloon', '搖晃的氣球', '흔들리는 풍선'], objs: [{ tgt: 1, vis: 'balloon', col: 0xe8352b, x: 5.6, y: 2.4, mv: { ay: .55, w: 1.5 }, parts: [C(0, 0, .55)] }] },
  { name: ['小さい風船', 'Tiny balloon', '小氣球', '작은 풍선'], objs: [{ tgt: 1, vis: 'balloon', col: 0x2fb36b, x: 6.0, y: 2.4, parts: [C(0, 0, .44)] }] },
  { name: ['棒人間の頭', "Stick man's head", '火柴人的頭', '막대인간 머리'], objs: [
    { tgt: 1, vis: 'body', col: 0xd3d1cb, x: 6.0, y: 2.65, parts: [C(0, 0, .32)] },
    { tgt: 0, vis: 'body', col: 0xd3d1cb, x: 6.0, y: 2.65, parts: [S(0, -.38, 0, -1.4, .14), S(0, -1.4, -.35, -2.6, .1), S(0, -1.4, .35, -2.6, .1), S(0, -.6, -.55, -1.2, .08), S(0, -.6, .55, -1.2, .08)] }] },
  { name: ['上昇気流', 'Updraft', '上升氣流', '상승 기류'], wind: [{ x0: 6.6, x1: 8.4, y0: 0, y1: 9, fx: 0, fy: 9 }], objs: [{ tgt: 1, vis: 'ball', col: 0xe8352b, x: 7.5, y: 2.6, parts: [C(0, 0, .42)] }] },
  { name: ['なすび王', 'Eggplant King', '茄子王', '가지 왕'], objs: [
    { tgt: 1, vis: 'nasu', col: 0x5b2a86, x: 7.0, y: 1.0, a: -.25, mv: { ax: .9, w: 1.0, ra: .32, rww: 1.7 }, parts: [C(0, 0, .85), C(.1, .8, .66), C(.18, 1.4, .44), S(.2, 1.7, .3, 2.15, .1)] }] },
];

// 面ごとのはね返りの強さ（2026-10-29 跳ねる版）。全面がクリアできるように総当たりで決めた
const REST = [.6, .6, .42, .6, .6, .6, .6, .6, .5, .6, .28, .42, .6, .6, .6, .6, .42, .6, .6, .2, .6, .6, .6, .6, .3, .6, .3, .35, .3, .42];
STAGES.forEach((s, i) => { s.rest = REST[i]; });
