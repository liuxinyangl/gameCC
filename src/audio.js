// =============================================================
//  audio.js — WebAudio 合成音效（零素材，首次交互懒初始化）
// =============================================================
let ctx = null;
let master = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.45;
  master.connect(ctx.destination);
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
  win()      { [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, dur: 0.3, type: 'triangle', gain: 0.26, delay: i * 0.12 })); },
  lose()     { [330, 247, 175, 110].forEach((f, i) => tone({ f0: f, dur: 0.4, type: 'sawtooth', gain: 0.26, delay: i * 0.15 })); },
};
