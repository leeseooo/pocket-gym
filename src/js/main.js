// ═══════════════ 라우터 · 입력 · 메인 루프 ═══════════════
// 각 게임은 { shake, enter, onDown, onMove, onUp, update, render } 인터페이스를 구현한다.
const menuEl = document.getElementById("menu");
const stageEl = document.getElementById("stage");
const backEl = document.getElementById("back");
const GAMES = { combobag: makeComboBag(), unbroken: makeUnbroken(), rings: makeRingMuscleUp() };
let active = null;

function openGame(id) {
  active = GAMES[id];
  menuEl.style.display = "none"; stageEl.style.display = "block";
  backEl.style.display = "block";
  try { actx().resume(); } catch (e) {}   // 사용자 제스처에서 오디오 활성화
  active.enter();
}
function goMenu() {
  active = null; stageEl.style.display = "none"; stageEl.classList.remove("grab");
  menuEl.style.display = "flex"; backEl.style.display = "none";
  setHint(""); setStat1("FROG GYM", { title: true }); setStat2("");
}

document.querySelectorAll(".card[data-game]").forEach(c => c.addEventListener("click", () => openGame(c.dataset.game)));
backEl.addEventListener("click", (e) => { e.stopPropagation(); goMenu(); });
document.getElementById("close").addEventListener("click", (e) => {
  e.stopPropagation();
  if (window.__TAURI__) window.__TAURI__.window.getCurrentWindow().close();
});
stageEl.addEventListener("pointerdown", (e) => { if (active) active.onDown(e); });
window.addEventListener("pointermove", (e) => { if (active) active.onMove(e); });
window.addEventListener("pointerup", (e) => { if (active) active.onUp(e); });

let lastT = performance.now();
function loop(now) {
  const dt = Math.min(48, now - lastT); lastT = now;
  ctx.clearRect(0, 0, W, H);
  if (active) {
    active.update(dt); active.render();
    const sh = active.shake || 0;   // 화면 흔들림 오프셋
    const sx = sh ? (Math.random() - .5) * sh : 0, sy = sh ? (Math.random() - .5) * sh : 0;
    vctx.clearRect(0, 0, view.width, view.height);
    vctx.drawImage(buf, sx * SCALE, sy * SCALE, view.width, view.height);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

goMenu();
