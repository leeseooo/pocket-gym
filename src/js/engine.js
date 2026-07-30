// ═══════════════ 엔진: 저해상도 버퍼 · 유틸 · 오디오 · HUD ═══════════════
// 클래식 스크립트로 로드되어 이후 파일들과 최상위 스코프를 공유한다.

// ── 렌더 버퍼 (96x96 논리 해상도를 4배로 확대해 도트 유지) ──
const W = 96, H = 96, SCALE = 4;
const view = document.getElementById("game");
view.width = W * SCALE; view.height = H * SCALE;
const vctx = view.getContext("2d"); vctx.imageSmoothingEnabled = false;
const buf = document.createElement("canvas"); buf.width = W; buf.height = H;
const ctx = buf.getContext("2d");

const OUTLINE = "#1c1c22";

// ── 그리기 유틸 ──
function px(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x | 0, y | 0, w, h); }
function thickLine(x0, y0, x1, y1, thick, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    px(x0 + (x1 - x0) * t - thick / 2, y0 + (y1 - y0) * t - thick / 2, thick, thick, color);
  }
}
function fillEllipse(cx, cy, rx, ry, color, alpha) {
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const w = rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)));
    ctx.fillRect((cx - w) | 0, (cy + dy) | 0, (2 * w) | 0, 1);
  }
  ctx.globalAlpha = 1;
}

// ── 수학 유틸 ──
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn  = t => t * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// [r,g,b] 배열에 밝기 f를 곱한 css 색
function rgb(a, f) { return `rgb(${clamp(a[0]*f,0,255)|0},${clamp(a[1]*f,0,255)|0},${clamp(a[2]*f,0,255)|0})`; }

// ── 3x5 도트 폰트 ──
const FONT = {
  " ":["...","...","...","...","..."], "!":[".#.",".#.",".#.","...",".#."],
  "%":["#.#","..#",".#.","#..","#.#"],
  P:["###","#.#","###","#..","#.."], E:["###","#..","###","#..","###"],
  R:["###","#.#","###","##.","#.#"], F:["###","#..","###","#..","#.."],
  C:["###","#..","#..","#..","###"], T:["###",".#.",".#.",".#.",".#."],
  G:[".##","#..","#.#","#.#",".##"], O:["###","#.#","#.#","#.#","###"],
  D:["##.","#.#","#.#","#.#","##."], A:["###","#.#","###","#.#","#.#"],
  L:["#..","#..","#..","#..","###"], Y:["#.#","#.#",".#.",".#.",".#."],
  N:["#.#","##.","#.#","#.#","#.#"], B:["##.","#.#","##.","#.#","##."],
  U:["#.#","#.#","#.#","#.#","###"], K:["#.#","##.","#..","##.","#.#"],
  W:["#.#","#.#","#.#","###","#.#"], H:["#.#","#.#","###","#.#","#.#"],
  M:["#.#","###","###","#.#","#.#"], S:[".##","#..",".#.","..#","##."],
  I:["###",".#.",".#.",".#.","###"], X:["#.#","#.#",".#.","#.#","#.#"],
  V:["#.#","#.#","#.#","#.#",".#."], ".":["...","...","...","...",".#."],
  "0":["###","#.#","#.#","#.#","###"], "1":[".#.","##.",".#.",".#.","###"],
  "2":["###","..#","###","#..","###"], "3":["###","..#","###","..#","###"],
  "4":["#.#","#.#","###","..#","..#"], "5":["###","#..","###","..#","###"],
  "6":["###","#..","###","#.#","###"], "7":["###","..#","..#",".#.",".#."],
  "8":["###","#.#","###","#.#","###"], "9":["###","#.#","###","..#","###"],
};
function drawText(text, cx, top, scale, color) {
  const cw = 3 * scale, gap = scale;
  const total = text.length * cw + (text.length - 1) * gap;
  let x = Math.round(cx - total / 2);
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] || FONT[" "];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
      if (g[r][c] === "#") px(x + c * scale, top + r * scale, scale, scale, color);
    x += cw + gap;
  }
}

// ── 오디오 (WebAudio 톤/노이즈) ──
let audio;
function actx() { return audio = audio || new (window.AudioContext || window.webkitAudioContext)(); }
function tone(f1, f2, dur, vol, type = "sine") {
  try {
    const a = actx(), n = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, n);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), n + dur);
    g.gain.setValueAtTime(0.0001, n);
    g.gain.exponentialRampToValueAtTime(vol, n + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, n + dur);
    o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + 0.02);
  } catch (e) {}
}
function noise(dur, vol, hp) {
  try {
    const a = actx(), n = a.currentTime;
    const nb = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const ns = a.createBufferSource(); ns.buffer = nb;
    const g = a.createGain(); g.gain.setValueAtTime(vol, n);
    g.gain.exponentialRampToValueAtTime(0.0001, n + dur);
    const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 800;
    ns.connect(f).connect(g).connect(a.destination); ns.start(n); ns.stop(n + dur);
  } catch (e) {}
}

// ── HUD (상단 바 좌측 두 스탯 + 하단 힌트) ──
const stat1El = document.getElementById("stat1");
const stat2El = document.getElementById("stat2");
function setStat1(html, { pop = false, title = false } = {}) {
  stat1El.innerHTML = html; stat1El.classList.toggle("title", title);
  if (pop) { stat1El.classList.remove("pop"); void stat1El.offsetWidth; stat1El.classList.add("pop"); }
}
function setStat2(t) { stat2El.textContent = t; }
function setHint(t) { document.getElementById("hint").textContent = t || ""; }

// ── 공용 색 팔레트 (도트로 안 그리는 소품·UI용) ──
const C = {
  glove: "#e23b3b", gloveD: "#a11f1f", boot: "#e8e8ec", bootD: "#9a9aa2",
  bag: "#e23b3b", bagD: "#a11f1f", bagL: "#f57070", chain: "#6a6a76",
  fx: "#fff3b0", fxHot: "#ffffff", hair: "#2b2b33",
  platform: "#3a3a46", platformD: "#2a2a33",
  good: "#8ce04a", perfect: "#ffd23f", bad: "#e2513b", track: "#33333d",
};
