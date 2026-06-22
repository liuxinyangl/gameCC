// =============================================================
//  scene.js — 渲染器 / 场景 / 镜头 / 灯光 / Bloom 后处理
// =============================================================
import * as THREE from 'three';

export const canvas = document.getElementById('game');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // 电影级色调，配合 Bloom
renderer.toneMappingExposure = 1.05;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a14);
scene.fog = new THREE.FogExp2(0x0a0a14, 0.018);

export const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);

// ---- 灯光：冷调环境 + 暖色主光 + 两盏彩色补光（营造氛围）----
scene.add(new THREE.HemisphereLight(0x8899ff, 0x141018, 0.6));
const sun = new THREE.DirectionalLight(0xfff2e0, 1.15);
sun.position.set(14, 24, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34;
sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0004;
scene.add(sun);
const rim1 = new THREE.PointLight(0x3366ff, 0.6, 60); rim1.position.set(-20, 8, -16); scene.add(rim1);
const rim2 = new THREE.PointLight(0xff3366, 0.5, 60); rim2.position.set(20, 8, 16);  scene.add(rim2);

// ---- Bloom 后处理：动态加载，失败/未就绪时降级直接渲染（绝不黑屏）----
let composer = null, bloomPass = null;
(async () => {
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]);
    const c = new EffectComposer(renderer);
    c.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.5, 0.6);
    c.addPass(bloomPass);
    c.addPass(new OutputPass());
    c.setSize(innerWidth, innerHeight);
    composer = c;                       // 加载完成后接管渲染
  } catch (e) {
    console.warn('Bloom 不可用，降级直接渲染:', e);
  }
})();

export function render() {
  if (composer) composer.render();
  else renderer.render(scene, camera);
}
// 大招/破势时短暂拉高泛光
export function pulseBloom(strength) { if (bloomPass) bloomPass.strength = strength; }
export function decayBloom(dt) { if (bloomPass && bloomPass.strength > 0.85) bloomPass.strength = Math.max(0.85, bloomPass.strength - dt * 2.5); }

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);
onResize();
