// =============================================================
//  camera.js — 键盘 / 鼠标边缘滚动镜头
// =============================================================
import { WORLD_W, WORLD_H } from './config.js';
import { clamp } from './util.js';
import { cam, view, VIEW_W, keys, mouse } from './state.js';

export function updateCamera(dt){
  const sp = 600 * dt;
  if (keys['ArrowLeft'] || keys['KeyA']) cam.x -= sp;
  if (keys['ArrowRight'] || keys['KeyD']) cam.x += sp;
  if (keys['ArrowUp'] || keys['KeyW']) cam.y -= sp;
  if (keys['ArrowDown'] || keys['KeyS']) cam.y += sp;
  const edge = 24;
  if (mouse.inView) {
    if (mouse.x < edge) cam.x -= sp;
    if (mouse.x > VIEW_W() - edge) cam.x += sp;
    if (mouse.y < edge) cam.y -= sp;
    if (mouse.y > view.H - edge) cam.y += sp;
  }
  cam.x = clamp(cam.x, 0, WORLD_W - VIEW_W());
  cam.y = clamp(cam.y, 0, Math.max(0, WORLD_H - view.H));
}
