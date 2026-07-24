// ═══════════════ 공용 3D 블롭 개구리 렌더러 ═══════════════
// Unbroken · Shaky Rings 두 게임이 공유. 카메라·구체(블롭)·얼굴을 담당.

// 피곤한 청개구리 팔레트
const FROG = {
  // 3D 블롭용 [r,g,b]
  ub:  { body: [122,200,72], limb: [110,185,64], eye: [250,250,250], pupil: [22,22,26], lid: [96,168,60], dark: [78,138,50], mouth: [50,92,38] },
  // Combo Bag(2D 도트)용 css 색
  box: { body: "#7ac846", bodyD: "#4f8a2e", trunk: "#e2b53b", trunkD: "#a8801f" },
};

// 고정 카메라 생성 (yaw=수직축 회전, pitch=상하). project(mx,my,mz)→{sx,sy,depth}
function makeCam(yaw, pitch, sc, cx, ground) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cam = (mx, my, mz) => {
    const x = mx * cy + mz * sy, z = -mx * sy + mz * cy, y = my;
    const y2 = y * cp - z * sp, z2 = y * sp + z * cp;
    return { sx: cx + x * sc, sy: ground - y2 * sc, depth: z2 };
  };
  cam.sc = sc; cam.cx = cx; cam.ground = ground;
  return cam;
}

// 채운 원(구체 한 조각)
function disc(sx, sy, r, color) {
  sx = Math.round(sx); sy = Math.round(sy);
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.sqrt(Math.max(0, r * r - dy * dy));
    px(sx - w, sy + dy, (2 * w + 1) | 0, 1, color);
  }
}
// 뼈대(a→b)를 촘촘한 구체들로 채워 매끈한 튜브를 만든다. 결과는 L에 push.
function bone(a, b, r, col, L, sp) {
  sp = sp || 1.7;
  const dx = b[0]-a[0], dy = b[1]-a[1], dz = (b[2]||0)-(a[2]||0);
  const len = Math.hypot(dx, dy, dz), n = Math.max(1, Math.round(len / sp));
  for (let i = 0; i <= n; i++) { const t = i / n; L.push({ x:a[0]+dx*t, y:a[1]+dy*t, z:(a[2]||0)+dz*t, r, col }); }
}
function blob(x, y, z, r, col, L) { L.push({ x, y, z, r, col }); }

// 블롭 리스트를 카메라로 투영→깊이정렬→2패스(외곽선/채움)로 그린다.
// 얕은 2톤: 앞면은 정상, 뒷면만 살짝 어둡게.
function renderBlobs(L, cam) {
  for (const b of L) { const p = cam(b.x, b.y, b.z); b.sx = p.sx; b.sy = p.sy; b.depth = p.depth; b.sr = b.r * cam.sc; }
  L.sort((a, b) => a.depth - b.depth);
  for (const b of L) disc(b.sx, b.sy, b.sr + 0.9, OUTLINE);
  for (const b of L) disc(b.sx, b.sy, b.sr, rgb(b.col, b.depth > 0 ? 1.0 : 0.86));
}

// 개구리 얼굴 블롭을 L에 추가. mood: "tired" | "happy" | "sad"
function frogFace(head, mood, L) {
  const P = FROG.ub, h = head;
  for (const sd of [-1, 1]) {
    const ez = sd * 3;
    blob(h[0]+1, h[1]+4, ez, 3, P.eye, L);                              // 눈알
    if (mood === "happy") {
      blob(h[0]+3, h[1]+4.6, ez, 1.5, P.pupil, L);                     // 초롱초롱
    } else {
      blob(h[0]+3, h[1]+3, ez, 1.3, P.pupil, L);                       // 처진 눈동자
      blob(h[0]+1.4, h[1]+5.4, ez, 2.6, P.lid, L);                     // 반쯤 감은 눈꺼풀
      blob(h[0]+2, h[1]+1.6, ez, 1.3, P.dark, L);                      // 눈밑 다크서클
      if (mood === "sad") blob(h[0]+2.6, h[1]+0.6, ez, 1, [96,150,232], L);  // 눈물
    }
  }
  if (mood === "happy") {                                              // 벌린 웃는 입
    blob(h[0]+3.4, h[1]+1, 0, 1.4, P.mouth, L);
    blob(h[0]+3.4, h[1]-0.4, 1.5, 1, P.mouth, L);
    blob(h[0]+3.4, h[1]-0.4, -1.5, 1, P.mouth, L);
  } else {
    blob(h[0]+3.4, h[1]+0.2, 0, 1.2, P.mouth, L);                      // 힘없는 입
  }
}

// 관절 포즈 보간 (keys: 보간할 관절 이름 배열)
function lerpPose(a, b, t, keys) {
  const o = {};
  for (const j of keys) o[j] = [lerp(a[j][0], b[j][0], t), lerp(a[j][1], b[j][1], t)];
  return o;
}
