# gameCC

两个纯前端网页游戏 Demo（无构建步骤、无依赖安装，原生 ES module + Three.js）。

## 暗影试炼（`index.html`）
Three.js 卡通渲染的 3D 类魂动作 Demo：三连击 / 重击破防 / 翻滚无敌帧 / 弹反攒「势」处决 / 蓄力大招「影斩」。先清暗影小鬼，再战 Boss「暗影督军」（含二阶段狂暴）。代码在 `src/` 下按模块拆分（scene / world / player / enemies / effects / hud …）。

## 钢铁前线（`rts/index.html`）
红警风 2D Canvas 即时战略 Demo：采矿经济 → 建造基地 → 生产部队 → 框选指挥 → 摧毁敌方建造场，含简单敌方 AI。代码在 `rts/src/` 下模块化。

## 运行
用了原生 ES module，**不能 `file://` 直接打开**，需起一个本地 http 服务：

```bash
python3 -m http.server 8000
# 动作游戏：http://localhost:8000/
# RTS：     http://localhost:8000/rts/
```

Three.js 已随仓库放在 `vendor/`（importmap 指向本地），断网也能跑。

## 操作
- **暗影试炼**：WASD 移动 · 鼠标视角 · 左键/J 连击 · K 重击 · 空格翻滚 · 右键/Q 弹反 · E 大招 · Shift 冲刺 · F 回血 · Tab 锁定 · R 重开
- **钢铁前线**：左键选择/框选 · 右键移动/攻击/采矿 · 右侧栏造建筑和单位 · 方向键/WASD 或鼠标移到边缘移动镜头 · 小地图可点击跳转
