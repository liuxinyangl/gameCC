// =============================================================
//  render.js — 全部绘制：战场、建筑、单位、特效、侧栏、小地图
// =============================================================
import { TILE, COLS, ROWS, WORLD_W, WORLD_H, SIDEBAR, BUILDINGS, UNITS, BUILD_MENU, UNIT_MENU } from './config.js';
import { clamp } from './util.js';
import { cam, view, VIEW_W, buildings, units, effects, menuButtons, mouse, player, enemy, game } from './state.js';
import { ctx } from './canvas.js';
import { ore } from './world.js';
import { bcx, bcy, power } from './entities.js';
import { canPlace } from './production.js';

export function draw(){
  const W = view.W, H = view.H;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, VIEW_W(), H); ctx.clip();   // 战场视口裁剪
  ctx.translate(-cam.x, -cam.y);

  // 地面 + 矿石（只画视野内）
  const t0x = Math.floor(cam.x / TILE), t1x = Math.ceil((cam.x + VIEW_W()) / TILE);
  const t0y = Math.floor(cam.y / TILE), t1y = Math.ceil((cam.y + H) / TILE);
  for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
    ctx.fillStyle = ((tx + ty) & 1) ? '#1c2417' : '#1f2719';
    ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    if (ore[ty][tx] > 0) {                    // 矿石（亮度随矿量）
      const a = clamp(ore[ty][tx] / 900, 0.25, 1);
      ctx.fillStyle = `rgba(240,200,70,${0.35 + a * 0.5})`;
      ctx.fillRect(tx * TILE + 4, ty * TILE + 4, TILE - 8, TILE - 8);
    }
  }

  // 建筑
  for (const b of buildings) {
    const x = b.tx * TILE, y = b.ty * TILE, w = b.w * TILE, h = b.h * TILE;
    const owner = b.owner === 'player' ? player : enemy;
    ctx.fillStyle = b.def.color;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.lineWidth = 3; ctx.strokeStyle = owner.color;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    // 名牌
    ctx.fillStyle = '#000a'; ctx.fillRect(x + 2, y + 2, w - 4, 14);
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(b.def.name, x + w / 2, y + 13);
    // 在建进度
    if (b.buildLeft > 0) {
      ctx.fillStyle = '#000a'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.fillStyle = '#ffd24a'; ctx.font = '11px sans-serif';
      ctx.fillText('建造中 ' + Math.ceil(b.buildLeft) + 's', x + w / 2, y + h / 2);
    }
    // 生产队列
    if (b.queue.length) {
      ctx.fillStyle = '#0af'; ctx.fillRect(x + 2, y + h - 6, (w - 4) * (1 - b.qLeft / (UNITS[b.queue[0]].build || 1)), 4);
    }
    if (b === game.selectedBuilding) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); }
    drawHpBar(x + 2, y - 6, w - 4, b.hp / b.maxHp, b.owner);
  }

  // 单位
  for (const u of units) {
    const owner = u.owner === 'player' ? player : enemy;
    if (game.selected.includes(u)) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(u.x, u.y, u.r + 4, 0, 7); ctx.stroke(); }
    ctx.fillStyle = u.def.color;
    if (u.type === 'tank') { ctx.save(); ctx.translate(u.x, u.y); ctx.fillRect(-u.r, -u.r * 0.7, u.r * 2, u.r * 1.4); ctx.fillStyle = owner.color; ctx.fillRect(-2, -u.r - 4, 4, u.r + 6); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(u.x, u.y, u.r, 0, 7); ctx.fill(); }
    ctx.lineWidth = 2; ctx.strokeStyle = owner.dark; ctx.stroke();
    if (u.type === 'harvester' && u.carry > 0) { ctx.fillStyle = '#ffd24a'; ctx.fillRect(u.x - 6, u.y - 3, 12 * (u.carry / u.def.cap), 6); }
    drawHpBar(u.x - u.r, u.y - u.r - 7, u.r * 2, u.hp / u.maxHp, u.owner);
  }

  // 特效
  for (const e of effects) {
    if (e.kind === 'tracer') { ctx.strokeStyle = e.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke(); }
    else { const p = 1 - e.t / (e.kind === 'boom' ? 0.6 : 0.4); ctx.fillStyle = `rgba(255,${150 - p * 100},40,${1 - p})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.5 + p), 0, 7); ctx.fill(); }
  }

  // 放置预览
  if (game.placing) {
    const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const def = BUILDINGS[game.placing];
    ctx.fillStyle = canPlace(game.placing, tx, ty) ? 'rgba(90,220,120,.4)' : 'rgba(220,80,80,.4)';
    ctx.fillRect(tx * TILE, ty * TILE, def.w * TILE, def.h * TILE);
  }
  ctx.restore();

  // 框选框
  if (game.dragStart) {
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.5;
    ctx.strokeRect(game.dragStart.x, game.dragStart.y, mouse.x - game.dragStart.x, mouse.y - game.dragStart.y);
  }

  drawSidebar();
  // 提示
  if (game.msgT > 0) { ctx.fillStyle = `rgba(255,80,80,${clamp(game.msgT, 0, 1)})`; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(game.msg, VIEW_W() / 2, 60); }
  // 胜负
  if (game.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, VIEW_W(), H);
    ctx.fillStyle = game.gameOver === 'win' ? '#7bed9f' : '#ff6b6b'; ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(game.gameOver === 'win' ? '胜 利' : '失 败', VIEW_W() / 2, H / 2 - 10);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
    ctx.fillText('按 R 重新开始', VIEW_W() / 2, H / 2 + 36);
  }
}

function drawHpBar(x, y, w, ratio, owner){
  if (ratio >= 1) return;
  ctx.fillStyle = '#000a'; ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = ratio > 0.5 ? '#5ed66b' : ratio > 0.25 ? '#e3c84a' : '#e35b5b';
  ctx.fillRect(x, y, w * clamp(ratio, 0, 1), 4);
}

function drawSidebar(){
  const H = view.H;
  const x0 = VIEW_W();
  ctx.fillStyle = '#15180f'; ctx.fillRect(x0, 0, SIDEBAR, H);
  ctx.fillStyle = '#2a2e1c'; ctx.fillRect(x0, 0, SIDEBAR, 56);
  // 资源
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText('$ ' + Math.floor(player.credits), x0 + 12, 26);
  const p = power('player');
  ctx.font = '13px sans-serif'; ctx.fillStyle = p < 0 ? '#ff6b6b' : '#7bd1ff';
  ctx.fillText('电力 ' + p + (p < 0 ? ' ⚠ 低电' : ''), x0 + 12, 46);

  menuButtons.length = 0;
  let y = 70;
  const label = (t) => { ctx.fillStyle = '#9a8'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(t, x0 + 12, y - 4); y += 6; };
  const btn = (key, kind) => {
    const def = kind === 'structure' ? BUILDINGS[key] : UNITS[key];
    const bx = x0 + 10, bw = SIDEBAR - 20, bh = 34;
    const afford = player.credits >= def.cost;
    const isPlacing = kind === 'structure' && game.placing === key;
    ctx.fillStyle = isPlacing ? '#4a5a2a' : (afford ? '#26301a' : '#201a14');
    ctx.fillRect(bx, y, bw, bh);
    ctx.strokeStyle = isPlacing ? '#ffd24a' : '#444'; ctx.lineWidth = 1; ctx.strokeRect(bx, y, bw, bh);
    ctx.fillStyle = kind === 'structure' ? BUILDINGS[key].color : UNITS[key].color;
    ctx.fillRect(bx + 4, y + 4, 26, 26);
    ctx.fillStyle = afford ? '#fff' : '#888'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(def.name, bx + 38, y + 16);
    ctx.fillStyle = afford ? '#ffd24a' : '#a86'; ctx.font = '11px sans-serif';
    ctx.fillText('$' + def.cost, bx + 38, y + 29);
    menuButtons.push({ x: bx, y, w: bw, h: bh, key, kind });
    y += bh + 5;
  };
  label('建筑');
  for (const k of BUILD_MENU) btn(k, 'structure');
  y += 6; label('单位');
  for (const k of UNIT_MENU) btn(k, 'unit');

  // 小地图
  const mmW = SIDEBAR - 20, mmH = mmW * (WORLD_H / WORLD_W);
  const mmX = x0 + 10, mmY = H - mmH - 12;
  game.minimap = { x: mmX, y: mmY, w: mmW, h: mmH };
  ctx.fillStyle = '#0a0d07'; ctx.fillRect(mmX, mmY, mmW, mmH);
  const sx = mmW / WORLD_W, sy = mmH / WORLD_H;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (ore[ty][tx] > 0) { ctx.fillStyle = '#7a6a2a'; ctx.fillRect(mmX + tx * TILE * sx, mmY + ty * TILE * sy, 2, 2); }
  for (const b of buildings) { ctx.fillStyle = (b.owner === 'player' ? player : enemy).color; ctx.fillRect(mmX + bcx(b) * sx - 2, mmY + bcy(b) * sy - 2, 4, 4); }
  for (const u of units) { ctx.fillStyle = (u.owner === 'player' ? player : enemy).color; ctx.fillRect(mmX + u.x * sx, mmY + u.y * sy, 2, 2); }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(mmX + cam.x * sx, mmY + cam.y * sy, VIEW_W() * sx, Math.min(H, WORLD_H) * sy);
  ctx.strokeStyle = '#333'; ctx.strokeRect(mmX, mmY, mmW, mmH);
}
