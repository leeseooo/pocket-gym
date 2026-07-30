// ═══════════════ 게임 4: Dash (연타 달리기 · 개구리 vs 치타) ═══════════════
// ← → 방향키를 번갈아 겁나게 연타 → 속도. 험악한 치타 AI를 이기면 1등.
// 같은 키만 연타하면 소용없음(교대해야 부스트). 키보드 전용.
function makeDash() {
  const DIST = 100;                 // 결승까지 거리
  const PIMP = 2.7, PDECAY = 3.0, PVMAX = 12;   // 플레이어: 교대타 임펄스 / 감쇠 / 상한
  const CBASE = 7.4;                // 치타 기본 속도 (꽤 빠름 → ~8타/초 이상 쳐야 승리)
  const X0 = 12, X1 = 79;           // 트랙 좌/우 화면 x (출발~결승)
  const LANE_C = 44, LANE_P = 61;   // 치타(위 레인) / 개구리(아래 레인) 발 y

  const s = {
    phase: "ready", t: 0, time: 0, cd: 3.2,
    p: 0, c: 0, pv: 0, cv: 0, lastKey: null,
    pPhase: 0, cPhase: 0, leftDown: false, rightDown: false,
    hits: [], parts: [], result: null, flashKey: 0,
  };

  function reset() {
    s.phase = "ready"; s.t = 0; s.cd = 3.2;
    s.p = 0; s.c = 0; s.pv = 0; s.cv = 0; s.lastKey = null;
    s.pPhase = 0; s.cPhase = 0; s.hits = []; s.parts = []; s.result = null;
    setStat1("READY", { title: true }); setStat2(""); setHint("mash ← → alternately!");
  }
  function hud() {
    const lead = s.p >= s.c ? "🐸 1ST" : "🐆 1ST";
    setStat1(lead); setStat2(`${clamp(s.p / DIST * 100, 0, 100) | 0}m`);
  }

  function spawnHit(dir, weak) {
    const kx = dir === "ArrowLeft" ? 35 : 61;   // 눌린 키캡 위쪽
    s.hits.push({ x: kx, y: 68, t: 0, life: weak ? 160 : 280, r: weak ? 4 : 8 });
    // 주자 발밑 먼지
    const rx = X0 + (s.p / DIST) * (X1 - X0);
    for (let i = 0; i < (weak ? 1 : 2); i++)
      s.parts.push({ x: rx - 3, y: LANE_P, vx: -0.6 - Math.random(), vy: -0.4 - Math.random() * 0.6, g: 0.04, t: 0, life: 320, col: "#c9b48a" });
  }
  function spawnConfetti() {
    const cols = ["#ffd23f", "#e2513b", "#43b047", "#049cd8", "#ff8ad0", "#ffffff"];
    for (let i = 0; i < 34; i++)
      s.parts.push({ x: 48 + (Math.random() * 2 - 1) * 30, y: -2 - Math.random() * 20, vx: (Math.random() * 2 - 1) * 1.2, vy: 0.6 + Math.random() * 1.4, g: 0.02, t: 0, life: 2200, col: cols[i % 6], sq: 2 });
  }
  function spawnRain() {
    for (let i = 0; i < 3; i++)
      s.parts.push({ x: Math.random() * 96, y: -2, vx: -0.3, vy: 2.2 + Math.random(), g: 0, t: 0, life: 1400, col: "#5a6072", sq: 1, rain: 1 });
  }

  // ── 입력 ──
  function onKeyDown(e) {
    const k = e.key;
    if (k !== "ArrowLeft" && k !== "ArrowRight") return;
    if (e.preventDefault) e.preventDefault();
    if (k === "ArrowLeft") s.leftDown = true; else s.rightDown = true;
    if (e.repeat) return;                                  // 홀드 자동반복 무시(진짜 연타만)
    if (s.phase === "win" || s.phase === "lose") { reset(); return; }
    if (s.phase !== "race") return;
    if (k !== s.lastKey) {                                 // 교대 성공 → 부스트
      s.pv = Math.min(PVMAX, s.pv + PIMP);
      s.lastKey = k; s.flashKey = k === "ArrowLeft" ? -1 : 1;
      spawnHit(k, false);
      tone(220 + s.pv * 18, 120, 0.03, 0.12, "square");
    } else {                                               // 같은 키 반복 → 헛방
      spawnHit(k, true);
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowLeft") s.leftDown = false;
    if (e.key === "ArrowRight") s.rightDown = false;
  }

  // ── 러너 그리기 (측면, 오른쪽으로 달림) ──
  function drawRunner(x, feetY, phase, kind) {
    const l1 = Math.sin(phase), l2 = Math.sin(phase + Math.PI), sw = 3.4;
    const hipY = feetY - 8, shoY = feetY - 15, headX = x + 3, headY = feetY - 19;
    const col = kind === "frog"
      ? { body: "#7ac846", dark: "#4f8a2e", limb: "#6bb03c" }
      : { body: "#f2b632", dark: "#b8801a", limb: "#d99a20" };

    if (kind === "cheetah") {                              // 긴 꼬리(뒤로 흐름)
      const tx = x - 6, ty = hipY;
      for (let i = 0; i < 8; i++) {
        const tX = tx - i * 1.6, tY = ty + Math.sin(phase * 0.7 + i * 0.5) * 2 - i * 0.3;
        px(tX, tY, 2, 2, i > 5 ? "#141418" : col.body);
      }
    }
    // 뒷다리/뒷팔 (어두운색, 먼저)
    thickLine(x - 1, hipY, x - 1 + l2 * sw, feetY, 3, col.dark);
    thickLine(headX, shoY, headX + (-l2) * sw, shoY + 7, 2, col.dark);
    // 몸통
    thickLine(x, hipY, headX, shoY, 5, col.body);
    if (kind === "cheetah") { px(x - 1, hipY - 4, 2, 2, "#141418"); px(x + 2, hipY - 6, 2, 2, "#141418"); px(x, shoY + 1, 2, 2, "#141418"); } // 표범 무늬
    else { px(x - 2, hipY - 3, 4, 5, col.dark); }          // 개구리 배 음영
    // 앞다리/앞팔
    thickLine(x + 1, hipY, x + 1 + l1 * sw, feetY, 3, col.limb);
    thickLine(headX, shoY, headX + (-l1) * sw, shoY + 7, 2, col.limb);
    // 머리
    if (kind === "frog") {
      px(headX - 2, headY, 7, 7, col.body);
      px(headX - 1, headY - 2, 3, 3, "#fafafa"); px(headX + 2, headY - 2, 3, 3, "#fafafa"); // 눈알
      px(headX, headY - 1, 2, 2, "#1a1a1e"); px(headX + 3, headY - 1, 2, 2, "#1a1a1e");     // 눈동자
      px(headX - 1, headY - 2, 3, 1, col.dark); px(headX + 2, headY - 2, 3, 1, col.dark);   // 눈꺼풀(피곤)
    } else {
      px(headX - 2, headY, 6, 6, col.body);                // 머리
      px(headX + 3, headY + 2, 4, 3, col.body);            // 뾰족 주둥이
      px(headX - 2, headY - 3, 2, 3, col.dark); px(headX + 1, headY - 3, 2, 3, col.dark);   // 귀
      px(headX + 1, headY + 1, 2, 1, "#e23b3b");           // 사나운 눈(빨강)
      px(headX + 5, headY + 4, 2, 1, "#fff");              // 이빨
      px(headX, headY + 1, 3, 1, "#141418");               // 눈 위 험상
    }
  }

  function drawTrack() {
    px(6, 32, 84, 15, "#3a2e2e"); px(6, 49, 84, 15, "#3a2e2e");       // 두 레인
    px(6, 32, 84, 1, "#4a3a3a"); px(6, 63, 84, 1, "#241c1c");
    for (let x = 8; x < 88; x += 8) px(x, 47, 4, 1, "#6a5a5a");        // 레인 구분 점선
    px(X0, 32, 1, 32, "#ffffff");                                     // 출발선
    for (let y = 32; y < 64; y += 4) { px(X1, y, 3, 2, "#eee"); px(X1, y + 2, 3, 2, "#222"); } // 결승 체크
  }
  function drawKey(x, y, dir, down, flash) {
    const w = 18, h = 15, dy = down ? 2 : 0;
    px(x + 2, y + 4, w, h, "#101014");                     // 그림자
    px(x, y + dy, w, h, "#141418");                        // 검은 border
    px(x + 1, y + 1 + dy, w - 2, h - 2, flash ? "#fff06a" : "#ffd21f"); // 노란 키캡
    px(x + 1, y + h - 3 + dy, w - 2, 2, "#d9a800");        // 하단 베벨
    px(x + 1, y + 1 + dy, w - 2, 1, "#fff29a");            // 상단 하이라이트
    // 두꺼운 빨간 화살표(검은 테두리)
    const cy = y + h / 2 + dy, ax = dir < 0 ? x + 5 : x + w - 5, len = 7, hh = 4;
    for (const [c, off] of [["#141418", 1], ["#e2201a", 0]]) {
      for (let d = 0; d <= len; d++) {
        const hw = (d / len) * (hh + off);
        const px0 = dir < 0 ? ax + d : ax - d;
        px(px0 - (dir < 0 ? 0 : 0), cy - hw - off, 1, hw * 2 + 1 + off * 2, c);
      }
      px(dir < 0 ? ax + len : ax - len - 5 - off, cy - 1 - off, 6 + off, 3 + off * 2, c); // 자루
    }
  }
  function draw3DText(text, cx, top, scale, main, shadow, depth) {
    for (let i = depth; i >= 1; i--) drawText(text, cx + i, top + i, scale, shadow);
    drawText(text, cx, top, scale, main);
  }
  function drawParts() {
    for (const p of s.parts) {
      const z = p.sq || 1;
      if (p.rain) px(p.x, p.y, 1, 4, p.col);
      else px(p.x, p.y, z, z + (p.sq ? 0 : 1), p.col);
    }
  }
  function drawHits() {
    for (const hh of s.hits) {
      const k = hh.t / hh.life; if (k >= 1) continue;
      const r = hh.r * (0.5 + k * 0.9);
      const col = k < 0.5 ? "#ffffff" : "#ffd21f";
      for (let a = 0; a < 10; a++) {                        // 💥 뾰족뾰족 폭발
        const ang = (a / 10) * Math.PI * 2, len = r * (a % 2 ? 0.5 : 1);
        px(hh.x + Math.cos(ang) * len, hh.y + Math.sin(ang) * len, 2, 2, a % 2 ? "#e2201a" : col);
      }
    }
  }

  return {
    shake: 0,
    enter() { reset(); },
    onDown() {}, onMove() {}, onUp() {},
    onKeyDown, onKeyUp,
    update(dt) {
      s.time += dt; s.t += dt; const dts = dt / 1000;
      for (const p of s.parts) { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.t += dt; }
      s.parts = s.parts.filter(p => p.t < p.life && p.y < 100);
      for (const hh of s.hits) hh.t += dt;
      s.hits = s.hits.filter(hh => hh.t < hh.life);

      if (s.phase === "ready") {
        s.cd -= dts;
        if (s.cd <= 0) { s.phase = "race"; s.t = 0; setHint("GO GO GO!"); hud(); }
      } else if (s.phase === "race") {
        // 플레이어
        s.pv *= Math.exp(-PDECAY * dts); s.p += s.pv * dts;
        // 치타 AI: 기본 빠름 + 서지 + 약한 러버밴딩(앞서면 더 분발, 뒤지면 살짝 봐줌)
        const rubber = clamp((s.p - s.c) * 0.03, -0.3, 0.9);
        s.cv = CBASE + Math.sin(s.time / 700) * 0.8 + rubber + (Math.random() - 0.5) * 0.3;
        s.c += s.cv * dts;
        // 애니 페이즈(속도에 비례해 다리 회전)
        s.pPhase += (0.5 + s.pv) * dts * 6;
        s.cPhase += (0.5 + s.cv) * dts * 6;
        if (s.time % 120 < dt) hud();
        if (s.p >= DIST) { s.phase = "win"; s.t = 0; s.result = "win"; spawnConfetti(); setStat1("WIN!", { title: true }); setHint("← → to run again"); tone(520, 780, 0.12, 0.35, "square"); setTimeout(() => tone(780, 1040, 0.16, 0.32, "square"), 140); }
        else if (s.c >= DIST) { s.phase = "lose"; s.t = 0; s.result = "lose"; setStat1("LOSE...", { title: true }); setHint("← → to try again"); tone(300, 80, 0.4, 0.4, "sawtooth"); noise(0.2, 0.3, 400); }
      } else if (s.phase === "win") {
        if (s.t % 120 < dt) spawnConfetti();
      } else if (s.phase === "lose") {
        spawnRain();
      }
    },
    render() {
      if (s.phase === "win") {
        px(0, 0, W, H, "#ffcf1a");                           // 노란 배경
        drawParts();
        drawRunner(48, 60, s.time / 90, "frog");             // 만세 개구리(팔 흔들)
        draw3DText("WIN!", 48, 30, 4, "#e2201a", "#7a0f0a", 3);
        return;
      }
      if (s.phase === "lose") {
        px(0, 0, W, H, "#4a4a52");                           // 회색 배경
        drawParts();
        draw3DText("LOSE.", 48, 32, 3, "#141418", "#2c2c33", 3);
        return;
      }
      drawTrack();
      // 주자 (레인별 x = 진행도)
      const px_ = X0 + (s.c / DIST) * (X1 - X0);
      const pf_ = X0 + (s.p / DIST) * (X1 - X0);
      drawRunner(px_, LANE_C, s.cPhase, "cheetah");
      drawRunner(pf_, LANE_P, s.pPhase, "frog");
      drawParts(); drawHits();
      // 하단 키캡
      drawKey(26, 74, -1, s.leftDown, s.flashKey === -1 && s.leftDown);
      drawKey(52, 74, 1, s.rightDown, s.flashKey === 1 && s.rightDown);
      // 카운트다운
      if (s.phase === "ready") {
        const n = Math.ceil(s.cd);
        const txt = n > 0 ? String(n) : "GO";
        draw3DText(txt, 48, 40, 3, "#ffd21f", "#7a5a00", 2);
      }
    },
  };
}
