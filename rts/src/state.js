// =============================================================
//  state.js — 跨模块共享的可变状态（原单文件的全局集中在此）
//  约定：会被「重新赋值」的字段挂在对象上 —— ES module 的 import 是
//        只读绑定，不能直接重绑导入名；数组/对象集合用 const 原地增删。
// =============================================================
import { SIDEBAR } from './config.js';

export const cam = { x: 0, y: 0 };          // 镜头世界坐标
export const view = { W: 0, H: 0 };         // 画布像素尺寸（resize 时更新）
export const VIEW_W = () => view.W - SIDEBAR;   // 战场视口宽度（扣掉右侧栏）

export const buildings = [];
export const units = [];
export const effects = [];                  // {kind:'tracer'|'boom', ...}
export const menuButtons = [];              // 每帧重算，供点击命中

export const mouse = { x: 0, y: 0, inView: false };
export const keys = {};

export const player = { side: 'player', credits: 5000, color: '#5b8dd6', dark: '#2f5e9e' };
export const enemy  = { side: 'enemy',  credits: 5000, color: '#d65b5b', dark: '#9e2f2f', aiTimer: 4, aiRally: null };

// 会被重新赋值的散装状态，统一挂在 game 上
export const game = {
  nextId: 1,
  started: false, gameOver: null,           // 'win' | 'lose'
  selected: [], selectedBuilding: null,     // 选中的我方单位 / 建筑
  placing: null,                            // 放置中的建筑类型
  dragStart: null,                          // 框选起点（屏幕坐标）
  minimap: null,                            // 小地图命中区（每帧重算）
  msg: '', msgT: 0,                         // 顶部提示
};

export function flashMsg(t){ game.msg = t; game.msgT = 1.5; }
