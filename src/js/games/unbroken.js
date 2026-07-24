// ═══════════════ 게임 2: Unbroken (행파워 스내치) ═══════════════
// 클릭&홀드 = 바닥→행, 타이밍 릴리즈 = 스내치. 실패 시 바벨 튕기며 벌러덩.
function makeUnbroken() {
  // 옆에서 살짝 내려다보는 고정 시점
  const cam = makeCam(0.42, -0.30, 0.92, 48, 58);
  const HIPZ = 5, SHOZ = 6, GRIPZ = 6, BARZ = 15;
  const FLOOR_BAR = [2, -26];   // 바닥에 떨어진 바벨 위치(모델)

  // 관절 포즈 (x=앞뒤+앞, y=위, 골반=원점)
  const POSE = {
    setup: { pelvis:[-2,0],  chest:[3,9],  head:[5,20], sho:[3,11], hand:[6,-22], knee:[7,-13], ankle:[0,-28] },
    hang:  { pelvis:[0,0],   chest:[1,11], head:[2,22], sho:[1,13], hand:[3,-6],  knee:[3,-14], ankle:[0,-28] },
    ext:   { pelvis:[0,2],   chest:[0,13], head:[0,24], sho:[0,15], hand:[1,2],   knee:[0,-13], ankle:[0,-30] },
    catch: { pelvis:[-1,-4], chest:[0,7],  head:[1,18], sho:[0,9],  hand:[1,30],  knee:[8,-14], ankle:[0,-28] },
    stand: { pelvis:[0,0],   chest:[0,12], head:[0,24], sho:[0,14], hand:[0,34],  knee:[0,-14], ankle:[0,-28] },
    fall:  { pelvis:[-4,-20],chest:[-11,-17],head:[-18,-13],sho:[-11,-16],hand:[-15,-19],knee:[6,-17],ankle:[14,-14] },  // B급 벌러덩
  };
  const JOINTS = ["pelvis","chest","head","sho","hand","knee","ankle"];
  const cur = {}; for (const j of JOINTS) cur[j] = [0, 0];

  const s = {
    phase: "ready", t: 0, reps: 0, best: 0, perfects: 0, attempts: 0,
    hangDur: 900, cursor: 0, flash: null, time: 0,
    barHeld: true, bar: [6, -22], barPhys: null,
  };
  let target = POSE.setup, lerpSpeed = 0.18;
  const GOOD_LO = 0.34, PERF_LO = 0.5, PERF_HI = 0.68, GOOD_HI = 0.82;

  function hud() {
    setStat1(`<span class="n">${s.reps}</span> UNBROKEN`, { pop: true });
    const rate = s.attempts ? Math.round(s.perfects / s.attempts * 100) : 0;
    setStat2(`◎${rate}% ·${s.best}`);
  }
  function setPose(name, sp) { target = POSE[name]; if (sp != null) lerpSpeed = sp; }
  function flash(text, color) { s.flash = { text, color, t: 0 }; }
  function toPhase(p) { s.phase = p; s.t = 0; }

  function fail(reason) {
    s.attempts++; if (s.reps > s.best) s.best = s.reps; s.reps = 0;
    flash(reason, C.bad);
    tone(200, 60, 0.3, 0.5, "sawtooth"); noise(0.18, 0.45, 400);
    const hp = cam(cur.hand[0], cur.hand[1], 0);   // 손 위치에서 랜덤 속도/스핀으로 발사
    s.barPhys = { x: hp.sx, y: hp.sy, vx: (Math.random()*2-1)*6.5, vy: -3 - Math.random()*4, ang: 0, va: (Math.random()*2-1)*0.8 };
    s.barHeld = false;
    toPhase("drop"); setPose("fall", 0.32);
    hud();
  }
  function success(quality) {
    s.attempts++; s.perfects += quality === "perfect" ? 1 : 0; s.reps++;
    if (s.reps > s.best) s.best = s.reps;
    flash(quality === "perfect" ? "PERFECT!" : "GOOD", quality === "perfect" ? C.perfect : C.good);
    tone(quality === "perfect" ? 520 : 420, 900, 0.12, 0.4, "square"); noise(0.06, 0.25, 1400);
    s.hangDur = Math.max(480, 900 - s.reps * 22);
    toPhase("pop"); setPose("ext", 0.5); hud();
  }
  function judgeRelease() {
    const c = s.cursor;
    if (c < GOOD_LO) return fail("EARLY");
    if (c > GOOD_HI) return fail("LATE");
    if (c >= PERF_LO && c <= PERF_HI) return success("perfect");
    return success("good");
  }

  function buildBlobs() {
    const cfg = FROG.ub, p = cur, L = [];
    const body = cfg.body, limb = cfg.limb;
    bone([p.pelvis[0],p.pelvis[1],0], [p.chest[0],p.chest[1],0], 4, body, L);   // 중앙축
    bone([p.chest[0],p.chest[1],0], [p.head[0],p.head[1],0], 2.6, limb, L);
    blob(p.head[0], p.head[1], 0, 5, limb, L);
    for (const sd of [-1, 1]) {                                                 // 팔다리
      const hip=[p.pelvis[0],p.pelvis[1],sd*HIPZ], knee=[p.knee[0],p.knee[1],sd*HIPZ], ank=[p.ankle[0],p.ankle[1],sd*HIPZ];
      const sho=[p.sho[0],p.sho[1],sd*SHOZ], hand=[p.hand[0],p.hand[1],sd*GRIPZ];
      bone(hip, knee, 3.4, body, L);
      bone(knee, ank, 2.8, limb, L);
      blob(ank[0]+1.5, ank[1]-1, ank[2], 2.6, [70,74,90], L);   // 발
      bone([p.chest[0],p.chest[1],0], sho, 2.8, body, L);
      bone(sho, hand, 2.2, limb, L);
    }
    frogFace(p.head, "tired", L);
    if (!s.barPhys) {   // 바벨 (튕기는 중엔 2D로 따로)
      const bx = s.bar[0], by = s.bar[1];
      bone([bx,by,-BARZ], [bx,by,BARZ], 1.3, [205,208,218], L, 2.2);
      for (const sd of [-1,1]) { blob(bx, by, sd*BARZ, 6.5, [226,70,70], L); blob(bx, by, sd*(BARZ-1.6), 6.5, [226,70,70], L); }
    }
    return L;
  }

  function drawLifter() {
    const fs = cam(0, -27, 0);
    fillEllipse(fs.sx, 84, 15, 3, "#000", 0.22);   // 접지 그림자
    renderBlobs(buildBlobs(), cam);
  }
  function drawPlatform() {
    px(14, 84, 68, 4, C.platform); px(14, 88, 68, 3, C.platformD); px(14, 84, 68, 1, "#4a4a56");
  }
  function drawBounceBar() {
    const bp = s.barPhys; if (!bp) return;
    ctx.save();
    ctx.translate(Math.round(bp.x), Math.round(bp.y));
    ctx.rotate(bp.ang);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-12, -2, 24, 4); ctx.fillRect(-13, -6, 6, 12); ctx.fillRect(7, -6, 6, 12);
    ctx.fillStyle = "#cdd0da"; ctx.fillRect(-11, -1, 22, 2);      // 봉
    ctx.fillStyle = "#e24646"; ctx.fillRect(-12, -5, 4, 10); ctx.fillRect(8, -5, 4, 10);  // 원판
    ctx.fillStyle = "#a11f1f"; ctx.fillRect(-12, -5, 1, 10); ctx.fillRect(11, -5, 1, 10);
    ctx.restore();
  }
  function drawMeter() {
    if (s.phase !== "pull" && s.phase !== "hang") return;
    const x0 = 24, x1 = 72, y = 92, w = x1 - x0;
    px(x0, y, w, 1, C.track);
    const tx = x0 + w * ((PERF_LO + PERF_HI) / 2);
    px(tx - 3, y - 1, 6, 1, C.perfect);
    if (s.phase === "hang") { const cxp = x0 + w * clamp(s.cursor, 0, 1); px(cxp - 1, y - 3, 2, 5, "#fff"); }
  }
  function drawFlash() {
    if (!s.flash) return;
    const p = s.flash.t / 650; if (p >= 1) { s.flash = null; return; }
    ctx.globalAlpha = 1 - p * p;
    drawText(s.flash.text, 48, 11 - p * 5, 2, s.flash.color);
    ctx.globalAlpha = 1;
  }
  function hint() {
    switch (s.phase) {
      case "ready": return "click & HOLD to lift";
      case "pull":  return "hold...";
      case "hang":  return "release on the mark!";
      case "drop": case "fallen": return "oof...";
      case "getup": return "getting up...";
      case "pickup": return "picking it up...";
      default: return "";
    }
  }

  return {
    shake: 0,
    enter() {
      s.phase = "ready"; s.t = 0; s.reps = 0; s.best = 0; s.perfects = 0; s.attempts = 0;
      s.hangDur = 900; s.cursor = 0; s.flash = null;
      s.barHeld = true; s.barPhys = null;
      for (const j of JOINTS) { cur[j][0] = POSE.setup[j][0]; cur[j][1] = POSE.setup[j][1]; }
      s.bar = [POSE.setup.hand[0], POSE.setup.hand[1]];
      target = POSE.setup; lerpSpeed = 0.18;
      setHint(hint()); hud();
    },
    onDown() {
      if (s.phase === "ready") { toPhase("pull"); setPose("hang", 0.16); tone(150, 90, 0.1, 0.25); noise(0.05, 0.15, 600); }
    },
    onMove() {},
    onUp() {
      if (s.phase === "pull") return fail("EARLY");
      if (s.phase === "hang") return judgeRelease();
    },
    update(dt) {
      s.time += dt; s.t += dt;
      if (s.flash) s.flash.t += dt;
      const k = 1 - Math.pow(1 - lerpSpeed, dt / 16.67);
      for (const j of JOINTS) { cur[j][0] = lerp(cur[j][0], target[j][0], k); cur[j][1] = lerp(cur[j][1], target[j][1], k); }
      // 바벨 위치: 잡고 있으면 손, 아니면 바닥
      const bt = s.barHeld ? cur.hand : FLOOR_BAR;
      s.bar[0] = lerp(s.bar[0], bt[0], 1 - Math.pow(1 - 0.2, dt / 16.67));
      s.bar[1] = lerp(s.bar[1], bt[1], 1 - Math.pow(1 - 0.2, dt / 16.67));

      if (s.barPhys) {   // 튕기는 바벨 물리 (실패 연출)
        const bp = s.barPhys, FLOOR = 83;
        bp.vy += 0.34; bp.x += bp.vx; bp.y += bp.vy; bp.ang += bp.va;
        if (bp.y > FLOOR) {
          bp.y = FLOOR;
          if (bp.vy > 1.3) { tone(150, 70, 0.05, 0.22); noise(0.04, 0.3, 1100); }  // 쨍강
          bp.vy *= -0.5; bp.vx *= 0.8; bp.va *= 0.72;
          if (Math.abs(bp.vy) < 0.6) { bp.vy = 0; bp.va *= 0.5; }
        }
        if (bp.x < 18) { bp.x = 18; if (bp.vx < -1) noise(0.03, 0.2, 900); bp.vx = Math.abs(bp.vx) * 0.6; }
        if (bp.x > 78) { bp.x = 78; if (bp.vx > 1) noise(0.03, 0.2, 900); bp.vx = -Math.abs(bp.vx) * 0.6; }
      }

      if (s.phase === "pull") { if (s.t > 260) { toPhase("hang"); s.cursor = 0; } }
      else if (s.phase === "hang") { s.cursor += dt / s.hangDur; if (s.cursor >= 1) fail("LATE"); }
      else if (s.phase === "pop") {
        if (s.t > 110 && target === POSE.ext) { setPose("catch", 0.4); noise(0.05, 0.2, 1000); }
        if (s.t > 300 && target === POSE.catch) setPose("stand", 0.22);
        if (s.t > 620) toPhase("stand");
      }
      else if (s.phase === "stand") { if (s.t > 260) { toPhase("descend"); setPose("setup", 0.16); } }
      else if (s.phase === "descend") { if (s.t > 360) toPhase("ready"); }
      // ── B급 실패 → 복구 시퀀스 (바벨 주울 때까지 대기) ──
      else if (s.phase === "drop")   { if (s.t > 240) toPhase("fallen"); }
      else if (s.phase === "fallen") { if (s.t > 900) { toPhase("getup"); setPose("stand", 0.13); } }
      else if (s.phase === "getup")  { if (s.t > 540) { toPhase("pickup"); setPose("setup", 0.16); s.barPhys = null; s.barHeld = true; s.bar[0] = FLOOR_BAR[0]; s.bar[1] = FLOOR_BAR[1]; } }
      else if (s.phase === "pickup") { if (s.t > 440) toPhase("ready"); }
      setHint(hint());
    },
    render() { drawPlatform(); drawLifter(); drawBounceBar(); drawMeter(); drawFlash(); },
  };
}
