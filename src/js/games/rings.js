// ═══════════════ 게임 3: Shaky Rings (링 머슬업 · 추적) ═══════════════
// 꾹 누르면 커서 상승/떼면 하강. 도망가는 개구리 얼굴을 추적해 진행도를 채우면
// 개구리가 링을 타고 올라간다(1렙). 성공=댄스, 실패=낙하 후 축 처짐.
function makeRingMuscleUp() {
  const cam = makeCam(1.05 + Math.PI, -0.06, 0.9, 44, 52);   // 개구리 등 뒤 3/4 시점
  const CX = 44, HIPZ = 4, SHOZ = 5;
  const RING = [[CX - 11, 30], [CX + 11, 30]];               // 좌/우 링 화면 위치(고정)
  const body = FROG.ub.body, limb = FROG.ub.limb;

  // 난이도 프리셋 (현재: 하)
  const DIFFS = {
    easy: { ampBase:0.085, ampK:0.03, frBase:1.1, frK:2.4, tolBase:0.14,  tolK:0.03,  fill:0.26, fillBonus:0.12, drain:0.12, endur:0.010, dartAmp:0.045, dartMin:650, dartRange:650, accUp:1.9,  accDn:1.3, startProg:0.22 },
    med:  { ampBase:0.115, ampK:0.04, frBase:1.6, frK:4.2, tolBase:0.105, tolK:0.03,  fill:0.22, fillBonus:0.12, drain:0.17, endur:0.018, dartAmp:0.075, dartMin:480, dartRange:560, accUp:1.85, accDn:1.4, startProg:0.18 },
    hard: { ampBase:0.16,  ampK:0.06, frBase:2.2, frK:7.0, tolBase:0.075, tolK:0.028, fill:0.15, fillBonus:0.12, drain:0.28, endur:0.040, dartAmp:0.14,  dartMin:320, dartRange:480, accUp:1.7,  accDn:1.5, startProg:0.06 },
  };
  const D = DIFFS.easy;

  const J = ["pelvis","chest","head","sho","knee","ankle"];
  const lp = (a, b, t) => lerpPose(a, b, t, J);   // 이 게임 관절로 보간
  const P = {
    floor: { pelvis:[0,-18], chest:[0,-9], head:[0,-1], sho:[0,-6], knee:[6,-22], ankle:[2,-28] },
    hang:  { pelvis:[0,6],   chest:[0,15], head:[0,23], sho:[0,18], knee:[3,-6],  ankle:[1,-18] },
    kipF:  { pelvis:[3,6],   chest:[-1,15],head:[-2,23],sho:[0,18], knee:[9,-4],  ankle:[13,-14] },
    kipB:  { pelvis:[-3,6],  chest:[3,15], head:[4,23], sho:[1,18], knee:[-4,-6], ankle:[-7,-18] },
    trans: { pelvis:[0,16],  chest:[0,24], head:[0,31], sho:[0,27], knee:[4,4],   ankle:[1,-8] },
    top:   { pelvis:[0,30],  chest:[0,40], head:[0,48], sho:[0,42], knee:[0,16],  ankle:[0,2] },
    sad:   { pelvis:[0,-8],  chest:[-4,0], head:[-6,6], sho:[-5,2], knee:[7,-16], ankle:[11,-20] },
  };

  const s = {
    phase:"intro", t:0, time:0, reps:0, fails:0,
    progress:0, cursor:0.3, cvel:0, holding:false,
    target:0.3, wob:0, dart:0, dartTarget:0, dartT:0, climbT:0, flash:null,
    parts:[], sweatT:0, locked:false, failPose:null,
  };

  function hud() { setStat1(`<span class="n">${s.reps}</span> MUSCLE-UP`, { pop:true }); }
  function flash(text, color) { s.flash = { text, color, t:0 }; }
  function ringSway() { return s.phase==="climb" && s.progress<0.62 ? Math.sin(s.time/240)*2.4*clamp(1-s.progress/0.62,0.2,1) : 0; }

  // ── 파티클 (땀·컨페티) ──
  function spawnSweat() {
    const hp = cam(0, 18 + s.progress*22, 0);
    s.parts.push({ x:hp.sx+(Math.random()*2-1)*7, y:hp.sy-4, vx:(Math.random()*2-1)*0.7, vy:-0.9-Math.random()*0.7, g:0.05, t:0, life:650, col:"#bfe6ff" });
  }
  function spawnConfetti() {
    const cols = ["#ffd23f","#e2513b","#43b047","#049cd8","#ff8ad0"];
    for (let i=0;i<26;i++) s.parts.push({ x:CX+(Math.random()*2-1)*22, y:16+Math.random()*12, vx:(Math.random()*2-1)*1.5, vy:-1.6-Math.random()*1.6, g:0.06, t:0, life:1500, col:cols[i%5], sq:2 });
  }
  function updateParts(dt) {
    for (const p of s.parts) { p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.t+=dt; }
    s.parts = s.parts.filter(p => p.t<p.life && p.y<96);
  }
  function drawParts() { for (const p of s.parts) { const z=p.sq||1; px(p.x, p.y, z, z+(p.sq?0:1), p.col); } }

  function success() {
    s.reps++; flash("MUSCLE UP!", C.good); spawnConfetti();
    tone(440,660,0.1,0.35,"square"); setTimeout(()=>tone(660,880,0.12,0.35,"square"),110); setTimeout(()=>tone(880,1100,0.14,0.32,"square"),230);
    s.phase="success"; s.t=0; hud();
  }
  function fail() {
    s.fails++; flash("SLIPPED...", "#9a9aa2");
    tone(300,70,0.35,0.4,"sawtooth"); noise(0.16,0.4,400);
    s.failPose = climbPose();          // 떨어지기 직전 자세에서 벌러덩
    s.phase="fail"; s.t=0; s.locked=false;
  }
  function resetAttempt() { s.phase="intro"; s.t=0; }

  // ── 포즈 선택 ──
  function climbPose() {
    let pose;
    if (s.progress < 0.5) {
      const sw = Math.sin(s.time/190);
      const kp = sw>0 ? P.kipF : P.kipB;
      const base = lp(P.hang, kp, Math.abs(sw)*clamp(s.progress/0.4,0.3,1));   // 스윙 크게
      pose = lp(base, P.trans, smoothstep(0.35,0.5,s.progress));
    } else {
      pose = lp(P.trans, P.top, (s.progress-0.5)/0.5);
    }
    // 링에 매달려 펜듈럼처럼 흔들림 (하체가 크게)
    const sway = s.progress<0.62 ? Math.sin(s.time/240)*(3.5*clamp(1-s.progress/0.62,0,1)+0.6) : 0;
    pose.ankle[0]+=sway*1.5; pose.knee[0]+=sway*1.0; pose.pelvis[0]+=sway*0.5; pose.head[0]-=sway*0.3;
    const tr = s.progress>0.5 ? (s.progress-0.5)*1.3 : 0;   // 정상 근처 부들부들
    if (tr) for (const j of J) { pose[j][0]+=(Math.random()-.5)*tr*3.2; pose[j][1]+=(Math.random()-.5)*tr*3.2; }
    return pose;
  }
  function currentPose() {
    if (s.phase==="intro") {
      const ti=clamp(s.t/650,0,1);
      const pose=lp(P.floor, P.hang, easeOut(ti));
      const jump=Math.sin(ti*Math.PI)*12;
      for (const j of J) pose[j][1]+=jump;
      return pose;
    }
    if (s.phase==="climb") return climbPose();
    if (s.phase==="success") { const pose=lp(P.top,P.top,0); const hop=Math.abs(Math.sin(s.time/110))*6; for(const j of J) pose[j][1]+=hop; pose.head[0]+=Math.sin(s.time/90)*1.5; return pose; }
    if (s.phase==="fail") {
      const ti=clamp(s.t/520,0,1);                       // 링에서 벌러덩 → 축 처짐
      const pose=lp(s.failPose||P.sad, P.sad, easeIn(ti));
      if (ti>=1) pose.head[0]+=Math.sin(s.time/400)*1.2;
      return pose;
    }
    return P.hang;
  }
  function armMode() {
    if (s.phase==="success") return "up";
    if (s.phase==="fail") return "hang";
    if (s.phase==="intro") return s.t>380 ? "rings" : "hang";
    return "rings";
  }
  function faceMood() { return s.phase==="success" ? "happy" : s.phase==="fail" ? "sad" : "tired"; }

  // ── 렌더 ──
  function drawRings() {
    for (const [rx,ry] of RING) {
      px(rx, 3, 1, ry-6, "#4a4a55");                 // 스트랩
      disc(rx, ry, 5, OUTLINE); disc(rx, ry, 3.4, "#40404c"); disc(rx, ry, 1.8, "#23232b");
    }
  }
  function drawFrog() {
    const pose = currentPose(), mood = faceMood(), am = armMode();
    const L = [];                                    // 몸통/다리/머리/얼굴 → 3D 블롭
    bone([pose.pelvis[0],pose.pelvis[1],0],[pose.chest[0],pose.chest[1],0],4,body,L);
    bone([pose.chest[0],pose.chest[1],0],[pose.head[0],pose.head[1],0],2.6,limb,L);
    blob(pose.head[0],pose.head[1],0,5,limb,L);
    for (const sd of [-1,1]) {
      const hip=[pose.pelvis[0],pose.pelvis[1],sd*HIPZ], knee=[pose.knee[0],pose.knee[1],sd*HIPZ], ank=[pose.ankle[0],pose.ankle[1],sd*HIPZ];
      bone(hip,knee,3.4,body,L); bone(knee,ank,2.8,limb,L); blob(ank[0]+1.2,ank[1]-1,ank[2],2.6,[70,74,90],L);
    }
    frogFace(pose.head, mood, L);
    renderBlobs(L, cam);
    // 팔 (스크린 공간: 어깨 → 링/위/아래)
    for (const sd of [-1,1]) {
      const sp = cam(pose.sho[0], pose.sho[1], sd*SHOZ);
      let ex, ey;
      if (am==="rings") { const rg=RING[sp.sx < CX ? 0 : 1]; ex=rg[0]+ringSway(); ey=rg[1]; }   // 화면 기준 가까운 링(꼬임 방지)
      else if (am==="up") { ex=sp.sx+sd*5+Math.sin(s.time/110)*2; ey=sp.sy-11; }
      else { ex=sp.sx+sd*2; ey=sp.sy+13; }
      thickLine(sp.sx, sp.sy, ex, ey, 3, rgb(limb,1));
      disc(ex, ey, 2.4, rgb(limb,1));   // 손
    }
    if (s.phase==="success") {   // 춤 음표
      const hp=cam(pose.head[0],pose.head[1]+8,0);
      for (let i=0;i<2;i++){ const a=s.time/160+i*3.0; const nx=hp.sx+Math.cos(a)*10, ny=hp.sy-2+Math.sin(a)*4; px(nx,ny,2,2,"#ffd23f"); px(nx+2,ny-4,1,4,"#ffd23f"); }
    }
  }
  function drawTrack() {
    if (s.phase!=="climb" && s.phase!=="intro") return;
    const x=87, top=8, bot=88, h=bot-top;
    px(x-1, top, 5, h, "#191920");
    const TOL=D.tolBase - s.progress*D.tolK;
    const ty=bot - s.target*h;
    px(x+1, ty-TOL*h, 3, TOL*2*h, "#2a4a2a");          // 허용 밴드
    const pf=h*s.progress; px(x-1, bot-pf, 2, pf, C.good);   // 진행도
    px(x, ty-2, 5, 4, "#7ac846"); px(x+1,ty-1,1,1,"#111"); px(x+3,ty-1,1,1,"#111");  // 개구리 얼굴(타겟)
    const cy=bot - clamp(s.cursor,0,1)*h; px(x, cy, 5, 1, "#fff"); px(x,cy-1,1,3,"#fff");  // 커서
    if (s.locked) { px(x-3, ty-1, 2, 2, "#fff"); px(x+6, ty-1, 2, 2, "#fff"); }   // 락온 스파크
  }
  function drawFlash() {
    if (!s.flash) return; const p=s.flash.t/700; if(p>=1){s.flash=null;return;}
    ctx.globalAlpha=1-p*p; drawText(s.flash.text, CX, 11-p*5, 2, s.flash.color); ctx.globalAlpha=1;
  }

  return {
    shake: 0,
    enter() {
      s.phase="intro"; s.t=0; s.reps=0; s.fails=0; s.progress=0; s.cursor=0.3; s.cvel=0;
      s.holding=false; s.dart=0; s.dartTarget=0; s.dartT=0; s.flash=null;
      s.parts=[]; s.sweatT=0; s.locked=false; s.failPose=null;
      setHint("hold to pull up · chase the frog!"); hud();
    },
    onDown() { s.holding=true; },
    onMove() {},
    onUp() { s.holding=false; },
    update(dt) {
      s.time+=dt; s.t+=dt; const dts=dt/1000;
      if (s.flash) s.flash.t+=dt;
      updateParts(dt);
      if (s.phase==="intro") {
        if (s.t>680) { s.phase="climb"; s.t=0; s.progress=D.startProg; s.cursor=0.12+D.startProg*0.72; s.cvel=0; s.dart=0; s.climbT=0; setHint("chase the frog — don't let go!"); }
      } else if (s.phase==="climb") {
        // 타겟(도망가는 개구리 얼굴)
        const T=s.time/1000, amp=D.ampBase - s.progress*D.ampK, fr=D.frBase + s.progress*D.frK;
        s.dartT-=dt; if (s.dartT<=0){ s.dartTarget=(Math.random()*2-1)*D.dartAmp; s.dartT=D.dartMin+Math.random()*D.dartRange; }
        s.dart=lerp(s.dart, s.dartTarget, 1-Math.pow(0.004,dts));
        s.wob=Math.sin(T*fr)*amp + Math.sin(T*fr*1.7+1.3)*amp*0.45 + s.dart;
        s.target=clamp(0.12 + s.progress*0.72 + s.wob, 0.04, 0.98);
        // 커서 물리 (꾹=상승, 떼면=하강)
        const acc = s.holding ? D.accUp : -D.accDn;
        s.cvel += acc*dts; s.cvel *= Math.pow(0.05,dts);
        s.cursor += s.cvel*dts + (Math.random()-0.5)*0.006;
        s.cursor = clamp(s.cursor,0,1);
        // 진행도
        const d=Math.abs(s.cursor-s.target), TOL=D.tolBase - s.progress*D.tolK;
        const nowLocked = d<TOL;
        if (nowLocked && !s.locked) tone(300+s.progress*520, 0, 0.04, 0.1, "square");   // 락온 딸깍
        s.locked = nowLocked;
        if (nowLocked) s.progress += (D.fill + (1-d/TOL)*D.fillBonus)*dts;
        else s.progress -= D.drain*dts;
        s.progress -= D.endur*dts;
        s.climbT+=dt;
        // 땀방울 (정상 근처일수록 자주)
        s.sweatT-=dt; if (s.sweatT<=0) { spawnSweat(); s.sweatT = 240 - s.progress*150; }
        setStat2(`${clamp(s.progress*100,0,100)|0}%`);
        if (s.progress>=1) { s.progress=1; success(); }
        else if (s.progress<=0 && s.climbT>400) { s.progress=0; fail(); }
        else s.progress=clamp(s.progress,0,1);
      } else if (s.phase==="success") {
        setStat2(""); if (s.t>1900) resetAttempt();
      } else if (s.phase==="fail") {
        setStat2(""); if (s.t>1900) resetAttempt();
      }
    },
    render() { drawRings(); drawFrog(); drawParts(); drawTrack(); drawFlash(); },
  };
}
