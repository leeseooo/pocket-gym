// ═══════════════ 게임 1: Combo Bag (복싱) ═══════════════
// 클릭 = 즉시 타격(광클 누락 0) → 랜덤 모션 + 콤보. 2D 도트 개구리 복서.
function makeComboBag() {
  const PUNCHES = ["jab", "straight", "hook", "upper", "kick"];
  const DEF = {
    jab:      { dur: 260, hitAt: .42, reach: 26, ty: 44, arc: "straight", power: .7 },
    straight: { dur: 340, hitAt: .48, reach: 30, ty: 46, arc: "straight", power: 1.0 },
    hook:     { dur: 380, hitAt: .50, reach: 24, ty: 42, arc: "hook",     power: 1.1 },
    upper:    { dur: 360, hitAt: .52, reach: 22, ty: 40, arc: "upper",    power: 1.15 },
    kick:     { dur: 460, hitAt: .55, reach: 30, ty: 60, arc: "kick",     power: 1.3 },
  };
  const s = { punch: null, combo: 0, total: 0, lastHit: -9999, bagVel: 0, bagAng: 0, fx: [], time: 0 };
  let shake = 0;

  function hud() { setStat1(`<span class="n">${s.combo}</span> COMBO`, { pop: true }); setStat2(`🥊 ${s.total}`); }
  function onHit(def) {
    s.total++;
    if (s.time - s.lastHit < 1500) s.combo++; else s.combo = 1;
    s.lastHit = s.time; shake = 6 * def.power; s.bagVel += 0.055 * def.power;
    s.fx.push({ x: 52, y: def.ty, t: 0, life: 260, power: def.power });
    tone(def.arc === "kick" ? 90 : def.arc === "upper" ? 150 : 130, 50, 0.16, 0.5 * def.power);
    noise(0.08, 0.35 * def.power, 900); hud();
  }
  function fistPos(p, prog) {
    const def = p.def, gx = 34, gy = 40, hx = 34 + def.reach, hy = def.ty;
    let ex = prog < def.hitAt ? easeOut(prog / def.hitAt) : 1 - easeIn((prog - def.hitAt) / (1 - def.hitAt));
    let x = gx + (hx - gx) * ex, y = gy + (hy - gy) * ex;
    if (def.arc === "hook")  { x += Math.sin(ex * Math.PI) * 6; y -= Math.sin(ex * Math.PI) * 8; }
    if (def.arc === "upper") y += Math.sin(ex * Math.PI) * 10;
    return { x, y, ex };
  }
  function drawHead(x, y) {
    // 피곤한 청개구리 (스내치 게임 얼굴과 톤 통일)
    const cc = FROG.box;
    px(x - 1, y + 2, 13, 10, cc.body);            // 넓적 얼굴
    px(x + 1, y - 3, 5, 5, cc.body); px(x + 6, y - 3, 5, 5, cc.body); // 눈두덩(툭)
    px(x + 2, y - 2, 3, 3, "#fafafa"); px(x + 7, y - 2, 3, 3, "#fafafa"); // 눈알
    px(x + 3, y, 2, 2, "#1a1a1e"); px(x + 8, y, 2, 2, "#1a1a1e");     // 처진 눈동자
    px(x + 1, y - 3, 5, 2, cc.bodyD); px(x + 6, y - 3, 5, 2, cc.bodyD); // 반쯤 감긴 눈꺼풀
    px(x + 2, y + 1, 3, 1, "#4f8a2e"); px(x + 7, y + 1, 3, 1, "#4f8a2e"); // 눈밑 다크서클
    px(x + 1, y + 8, 9, 1, cc.bodyD);             // 힘없는 입(직선)
  }
  function drawBoxer() {
    const cc = FROG.box;
    const prog = s.punch ? s.punch.t / s.punch.def.dur : 0;
    const kicking = s.punch && s.punch.def.arc === "kick";
    const breathe = Math.sin(s.time / 500) * 1;
    const baseY = s.punch ? -Math.sin(prog * Math.PI) * 1.5 : breathe;
    const cx = 22, feetY = 82;
    if (kicking) {
      const ex = prog < s.punch.def.hitAt ? easeOut(prog / s.punch.def.hitAt)
                                          : 1 - easeIn((prog - s.punch.def.hitAt) / (1 - s.punch.def.hitAt));
      px(cx - 4, feetY - 16, 5, 16, cc.trunkD);
      px(cx - 5, feetY - 2, 8, 3, C.bootD);
      px(cx + 2, 60 + baseY, ex * 22, 5, cc.body);
      px(cx + 2 + ex * 22, 58 + baseY + ex * 2, 7, 6, C.boot);
    } else {
      px(cx - 4, feetY - 16, 5, 16, cc.trunkD);
      px(cx + 2, feetY - 16, 5, 16, cc.trunk);
      px(cx - 5, feetY - 2, 8, 3, C.bootD);
      px(cx + 1, feetY - 2, 8, 3, C.boot);
    }
    px(cx - 5, 52 + baseY, 14, 12, cc.trunk);
    px(cx - 5, 60 + baseY, 14, 3, cc.trunkD);
    px(cx - 4, 38 + baseY, 12, 15, cc.body);
    px(cx - 4, 38 + baseY, 3, 15, cc.bodyD);
    px(cx + 5, 40 + baseY, 5, 8, cc.body);
    px(cx + 8, 36 + baseY, 7, 7, C.gloveD);
    drawHead(cx - 2, 26 + baseY);
    if (s.punch && !kicking) {
      const f = fistPos(s.punch, prog);
      thickLine(cx + 4, 42 + baseY, f.x, f.y, 4, cc.body);
      px(f.x, f.y - 4, 9, 9, C.glove);
      px(f.x, f.y + 2, 9, 3, C.gloveD);
      px(f.x + 1, f.y - 3, 3, 3, "#ff8a8a");
    } else if (!kicking) {
      px(cx + 6, 38 + baseY, 8, 8, C.glove);
      px(cx + 6, 44 + baseY, 8, 2, C.gloveD);
    }
  }
  function drawBag() {
    ctx.save(); ctx.translate(62, 14); ctx.rotate(s.bagAng);
    px(-1, -8, 2, 8, C.chain); px(-3, -8, 6, 3, C.chain);
    px(-9, 2, 18, 56, C.bag); px(-9, 2, 5, 56, C.bagD); px(4, 2, 3, 56, C.bagL);
    px(-9, 2, 18, 3, C.bagD); px(-9, 52, 18, 4, C.bagD); px(-9, 24, 18, 3, C.bagD);
    ctx.restore();
  }
  function drawFx() {
    for (const f of s.fx) {
      const p = f.t / f.life; if (p >= 1) continue;
      const r = (2 + p * 10) * (0.6 + f.power * 0.5);
      const cx = f.x + s.bagAng * 30, cy = f.y, col = p < 0.4 ? C.fxHot : C.fx;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2, len = r * (a % 2 ? 0.6 : 1), sz = Math.max(1, 3 - p * 3);
        px(cx + Math.cos(ang) * len - sz / 2, cy + Math.sin(ang) * len - sz / 2, sz, sz, col);
      }
    }
  }
  return {
    get shake() { return shake; },
    enter() { s.combo = 0; s.total = 0; s.lastHit = -9999; s.punch = null; s.fx = []; s.bagAng = 0; s.bagVel = 0; setHint("click to punch"); hud(); },
    onDown() { const t = PUNCHES[(Math.random() * PUNCHES.length) | 0]; s.punch = { type: t, t: 0, def: DEF[t] }; onHit(DEF[t]); },
    onMove() {}, onUp() {},
    update(dt) {
      s.time += dt;
      if (s.punch) { s.punch.t += dt; if (s.punch.t >= s.punch.def.dur) s.punch = null; }
      if (s.combo > 0 && s.time - s.lastHit > 1500) { s.combo = 0; hud(); }
      s.bagVel += -s.bagAng * 0.02; s.bagVel *= 0.94; s.bagAng += s.bagVel;
      shake *= 0.85; if (shake < 0.1) shake = 0;
      for (const f of s.fx) f.t += dt;
      s.fx = s.fx.filter(f => f.t < f.life);
    },
    render() {
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(10, 82, 32, 4); ctx.fillRect(52, 68, 22, 3);
      drawBag(); drawBoxer(); drawFx();
    },
  };
}
