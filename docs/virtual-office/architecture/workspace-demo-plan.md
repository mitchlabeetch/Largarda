# 完整工作空间 Demo — 开发方案

> 架构-阿构 | 2026-04-01
>
> 目标：在 `tools/animation-previewer` 中交付一个完整的 cozy 像素风员工工作空间 demo，
> 达到"有趣、好玩，不是技术 demo"的标准。

---

## 一、现有底座（已可复用）

| 已有资产 | 路径 | 状态 |
|---------|------|------|
| 参考图房间背景 | `public/room/room-full.png`（1024×559）| 可用 |
| 干净背景（去角色）| `public/room/room-bg-clean.png` | 可用 |
| 角色部件切片 | `public/room/part-head/torso/lower/legs.png` | 可用 |
| PixiJS 7 骨骼角色 | `src/character.ts`（idle/working/sleeping）| 可用 |
| PixiJS Graphics 角色 | `src/employee.ts`（working/idle_sleeping/noting）| 可用 |
| PixiJS App hook | `src/usePixiApp.ts` | 可用 |
| React 框架 | `src/App.tsx`（已有多 mode 切换）| 可用 |

**结论：不需要从零开始，在 App.tsx 新增一个 `room-demo` mode，复用所有现有代码。**

---

## 二、Demo 功能范围（MVP，要好玩）

### 必须有（用户硬性要求）

- 完整 cozy 像素风房间（床、书架、电脑桌、台灯、窗户、植物、猫）
- 角色在房间里，能在不同位置（电脑前 / 床上 / 书架前）
- 点击/hover 家具有反馈（至少 hover 高亮 + 角色移动过去）
- 有趣、好玩

### 实现策略：最大化复用 room-bg-clean.png

房间背景美术已经完备（`room-bg-clean.png` 是去掉角色的干净版，包含床、书架、电脑、台灯、窗户、植物，家具完整）。
**不需要重新绘制房间**，只需要：

1. 用 `room-bg-clean.png` 作为背景（已去掉角色的干净版本）
2. 在 PixiJS 层叠加角色 + 交互层
3. 用 `PIXI.Graphics` 画家具 hitbox（透明矩形，hover 时描边发光）

### "有趣、好玩"的交互设计

| 交互 | 触发 | 效果 |
|------|------|------|
| 点击电脑 | 点击桌面区域 | 角色走到电脑前，切换 working 动画，屏幕闪烁青光 |
| 点击床 | 点击床区域 | 角色走到床上，切换 sleeping 动画，出现 ZZZ 气泡 |
| 点击书架 | 点击书架区域 | 角色走到书架前，切换 noting 动画，书本飞出再回去 |
| 点击台灯 | 点击台灯区域 | 房间亮度切换（暖光/暗）——用 ColorMatrixFilter |
| 双击任意空白 | - | 角色跳起 happy 动画 + 星星粒子 |

---

## 三、技术架构

### 文件结构（新增 1 个文件）

```
src/
├── App.tsx              # 新增 'room-demo' mode（现有文件修改）
└── RoomDemo.tsx         # 新建，完整 demo 逻辑（约 250 行）
```

RoomDemo.tsx 内部结构：

```
RoomDemo
├── usePixiApp（复用）
├── bg sprite（room-bg-clean.png）
├── FurnitureLayer（PixiJS Container）
│   ├── bedHitbox（Graphics，透明，hover 描边）
│   ├── bookshelfHitbox
│   ├── deskHitbox
│   ├── lampHitbox
├── CharacterLayer（复用 Employee 或 Character 类）
│   └── 角色当前状态 + 位置
└── EffectLayer（粒子 / ZZZ 气泡 / 台灯光晕）
```

### 角色位置定义（基于 room-bg-clean.png 坐标系 1024×559）

```typescript
const POSITIONS = {
  desk:      { x: 700, y: 380 },  // 电脑桌前（working）
  bed:       { x: 200, y: 380 },  // 床上（sleeping）
  bookshelf: { x: 140, y: 330 },  // 书架前（noting）
};

const HITBOXES = {
  desk:      { x: 580, y: 290, w: 260, h: 160 },  // 桌面区域
  bed:       { x: 60,  y: 300, w: 250, h: 180 },  // 床区域
  bookshelf: { x: 40,  y: 150, w: 180, h: 220 },  // 书架区域
  lamp:      { x: 780, y: 230, w: 60,  h: 100 },  // 台灯
};
```

> **注意：** hitbox 坐标需要老锤根据实际 room-bg-clean.png 像素位置校准，上方为估算值。

### 角色位置移动（无走路动画，用 fade+位移）

遵守 design-final.md B 级动画方案：
```
fade out（150ms）→ 位置瞬移 → fade in（150ms）
```

```typescript
async function moveCharacterTo(
  char: Employee,
  targetX: number,
  targetY: number,
  newState: AnimState,
  app: PIXI.Application
) {
  // fade out
  await tweenAlpha(char.root, 1, 0, 150, app);
  char.root.x = targetX;
  char.root.y = targetY;
  char.setState(newState);
  // fade in
  await tweenAlpha(char.root, 0, 1, 150, app);
}
```

### 台灯光晕效果（CSS overlay + PixiJS）

```typescript
// PixiJS 层：ColorMatrixFilter 控制整体亮度
const darkenFilter = new PIXI.ColorMatrixFilter();
darkenFilter.brightness(0.4, false);  // 关灯时压暗背景

// 台灯光晕：PixiJS Graphics 径向渐变模拟（用 alpha gradient mesh）
// 或直接用 CSS radial-gradient overlay div（更简单）
```

### ZZZ 气泡（睡觉状态）

```typescript
class ZzzBubble {
  // 创建 3 个 PIXI.Text（Z / Z / Z），不同大小
  // ticker 里：每个 Z 向右上方漂移 + 透明度减少 → 消失后重置
}
```

### 星星粒子（双击 happy）

```typescript
class StarParticles {
  // 创建 8 个 PIXI.Graphics 小星星
  // 爆炸式散开（随机角度，随机速度）
  // 0.5 秒后全部 fade out
}
```

---

## 四、开发任务拆分（给老锤）

| 任务 | 内容 | 优先级 | 估计 |
|------|------|--------|------|
| T1 | 新建 `RoomDemo.tsx`，加载 room-bg-clean.png 背景 + 角色初始位置（desk，working 状态）| P0 | 1h |
| T2 | 实现 3 个家具 hitbox（Graphics），hover 时描边暖黄发光 | P0 | 1h |
| T3 | 点击家具 → 角色 fade 移动到对应位置 + 切换动画状态 | P0 | 1h |
| T4 | ZZZ 气泡（sleeping 状态时自动出现）| P0 | 0.5h |
| T5 | 台灯点击 → 亮度切换（ColorMatrixFilter）| P1 | 0.5h |
| T6 | 双击空白 → happy 跳跃 + 星星粒子 | P1 | 1h |
| T8 | App.tsx 新增 `room-demo` mode tab | P0 | 0.5h |

**T1-T4 + T8 是最低交付集（约 4 小时），T5-T6 加分项。**

---

## 五、验收标准

测试-刺猬/镜子 验收时检查：

- [ ] 进入 room-demo mode，能看到完整房间背景（非黑屏，非报错）
- [ ] 角色默认在电脑前，playing working 动画
- [ ] hover 床/书架/电脑桌区域，出现暖黄发光边框
- [ ] 点击床 → 角色出现在床上，playing sleeping 动画，有 ZZZ
- [ ] 点击书架 → 角色出现在书架前，playing noting 动画
- [ ] 点击电脑 → 角色回到电脑前，playing working 动画
- [ ] 整体视觉：cozy 暖色调，不是冷技术风

---

## 六、风险点

| 风险 | 说明 | 缓解 |
|------|------|------|
| room-bg-clean.png 尺寸与 hitbox 坐标不匹配 | hitbox 坐标是估算值，需要实测校准 | 老锤开发时打开 debug 模式显示 hitbox 矩形，肉眼校准 |
| 角色位置 y 坐标与地板透视不匹配 | 房间是侧视透视，角色脚底要贴地板线 | 先跑起来，肉眼微调 y 坐标 |
| ColorMatrixFilter 亮度在低端显卡闪烁 | 已知 PixiJS 7 ColorMatrixFilter 问题 | 降级为 CSS opacity overlay |

---

*架构-阿构 · 2026-04-01*
