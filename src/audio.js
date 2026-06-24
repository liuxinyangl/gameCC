// =============================================================
//  audio.js — WebAudio 合成音效（零素材，首次交互懒初始化）
// =============================================================
let ctx = null;
let master = null;
const BASE_VOL = 0.45;
let muted = false;
try { muted = localStorage.getItem('shadowtrial.muted') === '1'; } catch {}   // 跨会话记住静音

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : BASE_VOL;
  master.connect(ctx.destination);
  startAmbient();
}

// 暗黑氛围垫：失谐低频锯齿 → 低通（带缓慢 LFO 起伏）→ 缓入；经 master 走总线，静音随之静
let musicStarted = false;
function startAmbient() {
  if (!ctx || musicStarted) return;
  musicStarted = true;
  const t = ctx.currentTime;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t);
  bus.gain.exponentialRampToValueAtTime(0.10, t + 5);   // 5 秒缓入
  bus.connect(master);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 5; lp.connect(bus);

  [55, 55.5, 82.5].forEach((f, i) => {                  // 根音 + 微失谐 + 五度
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = i === 2 ? 0.16 : 0.28;
    o.connect(g).connect(lp); o.start(t);
  });

  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.05;   // 极慢呼吸
  const lfoG = ctx.createGain(); lfoG.gain.value = 220;
  lfo.connect(lfoG).connect(lp.frequency); lfo.start(t);
}

export function isMuted() { return muted; }
// M 键切换静音；持久化到 localStorage，下次进来记得
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : BASE_VOL;
  try { localStorage.setItem('shadowtrial.muted', muted ? '1' : '0'); } catch {}
  return muted;
}

// 单个振荡器音 + 指数包络
function tone({ f0, f1 = f0, dur = 0.15, type = 'sine', gain = 0.3, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t); osc.stop(t + dur + 0.02);
}

// 噪声爆（用于挥风 / 撞击），带低通
function noise({ dur = 0.18, gain = 0.3, lp = 1200, hp = 0, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = src;
  if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
  if (hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
  node.connect(g).connect(master);
  src.start(t); src.stop(t + dur);
}

export const sfx = {
  swing()    { noise({ dur: 0.16, gain: 0.18, lp: 1800, hp: 600 }); },
  hit()      { tone({ f0: 220, f1: 90, dur: 0.12, type: 'square', gain: 0.22 }); noise({ dur: 0.1, gain: 0.18, lp: 2200 }); },
  heavyHit() { tone({ f0: 150, f1: 50, dur: 0.22, type: 'sawtooth', gain: 0.3 }); noise({ dur: 0.18, gain: 0.28, lp: 1400 }); },
  exec()     { tone({ f0: 320, f1: 80, dur: 0.3, type: 'square', gain: 0.32 }); noise({ dur: 0.22, gain: 0.3, lp: 1800 }); },
  parry()    { tone({ f0: 1800, f1: 2600, dur: 0.12, type: 'triangle', gain: 0.28 }); tone({ f0: 2400, f1: 3200, dur: 0.16, type: 'sine', gain: 0.2, delay: 0.02 }); },
  dodge()    { noise({ dur: 0.2, gain: 0.16, lp: 900, hp: 200 }); },
  heal()     { tone({ f0: 520, f1: 900, dur: 0.35, type: 'sine', gain: 0.22 }); },
  hurt()     { tone({ f0: 180, f1: 70, dur: 0.18, type: 'sawtooth', gain: 0.26 }); },
  ult()      { tone({ f0: 120, f1: 1200, dur: 0.5, type: 'sawtooth', gain: 0.34 }); noise({ dur: 0.5, gain: 0.3, lp: 3000 }); tone({ f0: 80, f1: 40, dur: 0.6, type: 'sine', gain: 0.3, delay: 0.05 }); },
  cast()     { tone({ f0: 300, f1: 880, dur: 0.5, type: 'sine', gain: 0.15 }); tone({ f0: 620, f1: 1320, dur: 0.5, type: 'triangle', gain: 0.09, delay: 0.05 }); },
  zap()      { tone({ f0: 920, f1: 280, dur: 0.18, type: 'sawtooth', gain: 0.2 }); noise({ dur: 0.12, gain: 0.12, lp: 2600, hp: 800 }); },
  pickup()   { tone({ f0: 720, f1: 1320, dur: 0.16, type: 'sine', gain: 0.2 }); tone({ f0: 1080, f1: 1760, dur: 0.14, type: 'triangle', gain: 0.12, delay: 0.04 }); },
  roar()     { tone({ f0: 90, f1: 50, dur: 0.7, type: 'sawtooth', gain: 0.36 }); tone({ f0: 130, f1: 70, dur: 0.6, type: 'square', gain: 0.2, delay: 0.04 }); },
  bossHit()  { tone({ f0: 160, f1: 70, dur: 0.14, type: 'square', gain: 0.2 }); },
  slam()     { tone({ f0: 150, f1: 38, dur: 0.45, type: 'sine', gain: 0.34 }); noise({ dur: 0.3, gain: 0.3, lp: 1300 }); tone({ f0: 92, f1: 30, dur: 0.55, type: 'triangle', gain: 0.26, delay: 0.03 }); },
  win()      { [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, dur: 0.3, type: 'triangle', gain: 0.26, delay: i * 0.12 })); },
  lose()     { [330, 247, 175, 110].forEach((f, i) => tone({ f0: f, dur: 0.4, type: 'sawtooth', gain: 0.26, delay: i * 0.15 })); },
};
