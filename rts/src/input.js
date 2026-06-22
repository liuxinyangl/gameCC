// =============================================================
//  input.js — 键鼠输入：选择/框选、右键指令、侧栏与小地图点击
// =============================================================
import { TILE, WORLD_W, WORLD_H } from './config.js';
import { clamp, dist } from './util.js';
import { cam, view, VIEW_W, keys, mouse, game, units, menuButtons } from './state.js';
import { cv } from './canvas.js';
import { unitAt, buildingAt } from './entities.js';
import { tryBuildStructure, placeStructure, queueUnit } from './production.js';
import { commandTo } from './command.js';

addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyR' && game.gameOver) location.reload(); });
addEventListener('keyup', e => { keys[e.code] = false; });

document.getElementById('center').addEventListener('click', () => {
  if (game.gameOver) { location.reload(); return; }
  game.started = true; document.getElementById('center').classList.add('hidden');
});

cv.addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  mouse.inView = e.clientX < VIEW_W();
});
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => {
  if (!game.started || game.gameOver) return;
  const mx = e.clientX, my = e.clientY;
  if (e.button === 0) {                       // 左键
    if (mx >= VIEW_W()) { handleSidebarClick(mx, my); return; }
    if (game.placing) { const wx = mx + cam.x, wy = my + cam.y; placeStructure(game.placing, Math.floor(wx / TILE), Math.floor(wy / TILE)); return; }
    game.dragStart = { x: mx, y: my };
  } else if (e.button === 2) {                // 右键
    if (game.placing) { game.placing = null; return; }
    if (mx < VIEW_W()) commandTo(mx + cam.x, my + cam.y);
  }
});
cv.addEventListener('mouseup', e => {
  if (!game.started || game.gameOver || e.button !== 0 || !game.dragStart) return;
  const mx = e.clientX, my = e.clientY;
  const moved = dist(game.dragStart.x, game.dragStart.y, mx, my);
  if (moved < 6) {                            // 单击选择
    const wx = mx + cam.x, wy = my + cam.y;
    const u = unitAt(wx, wy, 'player');
    if (u) { game.selected = [u]; game.selectedBuilding = null; }
    else { const b = buildingAt(wx, wy, 'player'); game.selected = []; game.selectedBuilding = b || null; }
  } else {                                     // 框选我方单位
    const x1 = Math.min(game.dragStart.x, mx) + cam.x, y1 = Math.min(game.dragStart.y, my) + cam.y;
    const x2 = Math.max(game.dragStart.x, mx) + cam.x, y2 = Math.max(game.dragStart.y, my) + cam.y;
    game.selected = units.filter(u => u.owner === 'player' && u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2);
    game.selectedBuilding = null;
  }
  game.dragStart = null;
});

function handleSidebarClick(mx, my){
  for (const btn of menuButtons) {
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      if (btn.kind === 'structure') tryBuildStructure(btn.key);
      else queueUnit(btn.key, 'player');
      return;
    }
  }
  // 小地图点击跳转
  const mm = game.minimap;
  if (mm && mx >= mm.x && mx <= mm.x + mm.w && my >= mm.y && my <= mm.y + mm.h) {
    const wx = (mx - mm.x) / mm.w * WORLD_W, wy = (my - mm.y) / mm.h * WORLD_H;
    cam.x = clamp(wx - VIEW_W() / 2, 0, WORLD_W - VIEW_W());
    cam.y = clamp(wy - view.H / 2, 0, WORLD_H - view.H);
  }
}
