// =============================================================
//  config.js — 地图尺寸 + 建筑/单位数值（调参只改这里）
// =============================================================
export const TILE = 32;
export const COLS = 64, ROWS = 46;
export const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
export const SIDEBAR = 210;                 // 右侧建造栏宽度

export const BUILDINGS = {
  conyard:    { name: '建造场',  cost: 0,    build: 0, w: 3, h: 3, hp: 1500, power: 50,  color: '#6b7a3a' },
  power:      { name: '电厂',    cost: 300,  build: 3, w: 2, h: 2, hp: 400,  power: 200, color: '#3a6b7a' },
  refinery:   { name: '矿场',    cost: 1500, build: 6, w: 3, h: 2, hp: 900,  power: -40, color: '#7a6b3a' },
  barracks:   { name: '兵营',    cost: 400,  build: 4, w: 2, h: 2, hp: 600,  power: -20, color: '#5a7a3a', makes: 'infantry' },
  warfactory: { name: '战车厂',  cost: 1000, build: 6, w: 3, h: 2, hp: 900,  power: -40, color: '#7a4a3a', makes: 'tank' },
  turret:     { name: '防御塔',  cost: 600,  build: 4, w: 1, h: 1, hp: 500,  power: -40, color: '#88607a', range: 150, dmg: 22, rate: 0.8 },
};
export const UNITS = {
  harvester: { name: '矿车',  cost: 1100, build: 5,   hp: 320, speed: 60, r: 11, color: '#caa84a', cap: 500, harvestRate: 260 },
  infantry:  { name: '步兵',  cost: 100,  build: 1.4, hp: 60,  speed: 70, r: 7,  color: '#9ad', range: 90,  dmg: 9,  rate: 0.5, sight: 150 },
  tank:      { name: '坦克',  cost: 700,  build: 4,   hp: 320, speed: 58, r: 12, color: '#8bd', range: 130, dmg: 30, rate: 1.1, sight: 180 },
};
// 侧边栏按钮顺序
export const BUILD_MENU = ['power', 'refinery', 'barracks', 'warfactory', 'turret'];
export const UNIT_MENU = ['harvester', 'infantry', 'tank'];
