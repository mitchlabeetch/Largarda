# 虚拟办公室 — 前端技术笔记

> 开发-老锤 | 2026-04-01
>
> 覆盖两个核心问题：
> 1. 主场景员工卡片列表的虚拟化方案
> 2. PixiJS Canvas 层 + React DOM 层的叠加与事件分发
>
> 注：Canvas/DOM 分层架构定论已在 solutions.md S4 给出，本文补充实现细节和坑点。

---

## 一、主场景员工卡片虚拟列表

### 1.1 为什么需要虚拟化

流程文档（flow-final.md §1.4）要求：
- 10人以内：平铺，无需虚拟化
- 10-50人：分组 + 虚拟滚动
- 50人以上：搜索优先 + 分组折叠

员工卡片包含 PixiJS Canvas 动画（骨骼动画实例），每个卡片创建一个独立的 PIXI.Application 成本极高（WebGL context 上限约 16 个）。因此虚拟化不只是性能优化，而是**必须的架构约束**。

### 1.2 方案选型

**不引入新依赖，用 @tanstack/react-virtual。**

理由：
- 项目已有 `@tanstack/react-query`（package.json 中），@tanstack 系列已在依赖树里，`@tanstack/react-virtual` 只多加约 8KB
- 比 `react-window`/`react-virtualized` 更现代（支持动态行高、分组）
- API 简单，核心就是 `useVirtualizer` 一个 hook

安装：`bun add @tanstack/react-virtual`

### 1.3 骨骼动画 + 虚拟列表的核心矛盾

员工卡片里有骨骼动画，但虚拟列表会**销毁不可见的行**。PixiJS Application 每次销毁重建代价极高。

**解法：Canvas 动画和卡片 DOM 分离。**

```
主场景架构：
  ┌─────────────────────────────────────────────────────┐
  │ VirtualOfficeScene (React Component)                │
  │                                                     │
  │  ┌─────────────────────────────────────────────┐   │
  │  │ PixiJS Canvas（全屏，position: absolute）    │   │
  │  │   - 渲染所有可见员工的骨骼动画              │   │
  │  │   - 动画实例由 PixiJS 的 ticker 统一管理    │   │
  │  │   - 不创建多个 PIXI.Application             │   │
  │  └─────────────────────────────────────────────┘   │
  │                                                     │
  │  ┌─────────────────────────────────────────────┐   │
  │  │ DOM 层（position: absolute, 覆盖 Canvas）   │   │
  │  │   - 虚拟列表渲染卡片 DOM（名字/状态文字）   │   │
  │  │   - 不含 Canvas，只是文字+背景框            │   │
  │  │   - 卡片 DOM 的位置对齐 Canvas 里的动画角色 │   │
  │  └─────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────┘
```

骨骼动画角色在 **单个全屏 PixiJS Application** 里统一管理，`IntersectionObserver` 监测卡片可见性，只对可见员工播放动画（不可见的角色暂停 ticker），用 `Container.visible = false` 隐藏。

这样虚拟列表滚动时，DOM 卡片销毁/重建，但 PixiJS 层不受影响，动画实例始终存在，只是 `visible` 切换。

### 1.4 虚拟列表实现骨架

```typescript
// EmployeeGrid.tsx — 主场景员工卡片列表
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

type Props = {
  employees: Employee[];
  onEmployeeClick: (id: string) => void;
};

export function EmployeeGrid({ employees, onEmployeeClick }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160,    // 卡片高度估算（含动画区域）
    overscan: 3,                // 可视区上下各多渲染3个，避免滚动白屏
  });

  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vItem => (
          <EmployeeCard
            key={employees[vItem.index].id}
            employee={employees[vItem.index]}
            style={{
              position: 'absolute',
              top: vItem.start,
              left: 0,
              width: '100%',
              height: vItem.size,
            }}
            onClick={() => onEmployeeClick(employees[vItem.index].id)}
          />
        ))}
      </div>
    </div>
  );
}
```

卡片 DOM 里**不放 Canvas**，只有状态文字、颜色边框、名字。骨骼动画角色通过 PixiJS 的 Container 定位到对应卡片位置（见第二节）。

### 1.5 分组展示（10-50人）

flow-final.md 要求：出错 > 工作中 > 高压 > 空闲 > 休眠。

用 `useVirtualizer` 的 `lanes` 特性处理分组：

```typescript
// 按状态分组，出错组置顶
const grouped = [
  { label: '出错', employees: employees.filter(e => e.state === 'error') },
  { label: '工作中', employees: employees.filter(e => e.state === 'working') },
  { label: '高压', employees: employees.filter(e => e.state === 'stressed') },
  { label: '空闲', employees: employees.filter(e => e.state === 'idle') },
  { label: '休眠', employees: employees.filter(e => e.state === 'sleeping') },
].filter(g => g.employees.length > 0);

// 将分组头和员工卡片铺平成一维数组传给 virtualizer
// 分组头行高约 36px，员工卡片行高约 160px
```

### 1.6 搜索过滤

主场景搜索框是实时过滤（flow-final.md §1.3），不需要分页 API，纯前端过滤：

```typescript
const filteredEmployees = useMemo(() =>
  employees.filter(e =>
    e.name.includes(query) ||
    e.currentTaskSummary.includes(query)
  ),
  [employees, query]
);
```

SWR 订阅员工状态（通过 IPC 事件推送，见 solutions.md S3），过滤结果会在状态更新时自动重算。

---

## 二、Canvas + DOM 分层实现细节

solutions.md S4 已定论分层边界，本节补充具体实现。

### 2.1 层叠方案

```
.vo-scene（position: relative）
  ├── canvas（PixiJS，position: absolute, inset: 0, z-index: 0）
  └── .vo-dom-overlay（position: absolute, inset: 0, z-index: 10）
       ├── .vo-status-bar（顶部，pointer-events: auto）
       ├── .vo-employee-grid（主体，pointer-events: none → 只透传到 canvas）
       │    └── .vo-card（pointer-events: auto → 卡片可点击）
       ├── .vo-drawer（右侧抽屉，pointer-events: auto）
       └── .vo-hud（底部，pointer-events: auto）
```

**关键：** `.vo-employee-grid` 本身设 `pointer-events: none`，但每个 `.vo-card` 设 `pointer-events: auto`。这样卡片之间的空白区域（透过 DOM 到 Canvas）仍然可以触发 PixiJS 的点击事件（比如点击房间背景关闭抽屉）。

### 2.2 Canvas → DOM 通信

PixiJS 运行在 React 的 `useEffect` 里，天然能访问 React state setter：

```typescript
// VirtualOfficeRoom.tsx
const [activeDrawer, setActiveDrawer] = useState<DrawerType | null>(null);
const [hoveredEmployee, setHoveredEmployee] = useState<string | null>(null);

useEffect(() => {
  if (!app) return;

  // 家具点击 → 更新 React state → 触发 DOM 抽屉渲染
  furnitureManager.onComputerClick = () => setActiveDrawer('computer');
  furnitureManager.onShelfClick    = () => setActiveDrawer('shelf');

  // 员工角色 hover → 更新 React state → DOM tooltip 跟随
  characterManager.onCharacterHover = (id) => setHoveredEmployee(id);
  characterManager.onCharacterOut   = ()   => setHoveredEmployee(null);

  // 点背景空白 → 关闭抽屉（solutions.md S4 已给出）
  app.stage.on('pointerdown', (e) => {
    if (e.target === app.stage) setActiveDrawer(null);
  });
}, [app]);
```

不需要 EventEmitter、不需要 Zustand/Redux，直接用 React state 即可。PixiJS 的事件回调在 main thread 同步执行，和 React state 更新无异步问题。

### 2.3 DOM → Canvas 通信

DOM 层需要通知 Canvas 层的场景，比如：抽屉打开时暗化背景、切换到工作空间时角色播放入场动画。

```typescript
// 用 ref 持有 PixiJS 场景实例，DOM 层直接调用方法
const sceneRef = useRef<VORoomScene | null>(null);

// 抽屉打开 → 通知 Canvas 层暗化
const handleDrawerOpen = useCallback((type: DrawerType) => {
  setActiveDrawer(type);
  sceneRef.current?.setDimmed(true);  // Canvas 层半透明遮罩
}, []);

// 抽屉关闭
const handleDrawerClose = useCallback(() => {
  setActiveDrawer(null);
  sceneRef.current?.setDimmed(false);
}, []);
```

`VORoomScene` 是封装 PixiJS 逻辑的普通 class（不是 React Component），通过 ref 持有，DOM 层直接调方法，不走 React state 的批量更新机制（避免延迟）。

### 2.4 员工动画与 DOM 卡片坐标对齐

主场景（上帝视角）的员工卡片是 DOM，但动画角色是 Canvas。两者需要坐标对齐。

**方案：固定网格布局，Canvas 和 DOM 按同一套坐标计算位置。**

```typescript
// 每张卡片的像素位置由 index 决定（网格布局）
const CARD_W = 200, CARD_H = 160, GRID_GAP = 16, COLS = 4;

function getCardPosition(index: number) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: col * (CARD_W + GRID_GAP) + CARD_W / 2,
    y: row * (CARD_H + GRID_GAP) + CARD_H * 0.6,  // 角色站在卡片下方 60% 处
  };
}

// DOM 层：用 CSS absolute + top/left
// Canvas 层：character.root.x = pos.x; character.root.y = pos.y;
```

虚拟列表滚动时，Canvas 层需要同步偏移（Canvas 自身不滚动，通过修改 `app.stage.y` 跟随 DOM 的 scrollTop）：

```typescript
parentRef.current?.addEventListener('scroll', (e) => {
  const scrollTop = (e.target as HTMLElement).scrollTop;
  app.stage.y = -scrollTop;  // Canvas stage 偏移跟随 DOM 滚动
});
```

这样 Canvas 动画角色和 DOM 卡片始终在视觉上对齐。

### 2.5 工作空间视图（单员工房间）

工作空间视图是全屏 Canvas（PixiJS 渲染房间场景），DOM 层叠加在上面（solutions.md S4 层级分工）。

切换逻辑：

```typescript
type ViewMode = 'overview' | 'workspace';

// overview（主场景）：Canvas 渲染所有员工小人，DOM 渲染卡片网格
// workspace（工作空间）：Canvas 渲染单员工房间，DOM 渲染 HUD + 抽屉

// 切换时：
// 1. Canvas 层播放过渡动画（卡片展开 300ms）
// 2. 300ms 后 React state 切换 viewMode
// 3. DOM 层渲染工作空间的 HUD/抽屉（过渡期间已可用，solutions.md 要求）
```

**注意：** 过渡期间 HUD 输入框必须可用（flow-final.md §2.1），所以 DOM 层先于动画结束切换，不等动画完成。

### 2.6 已知坑点

**坑1：PixiJS 8.x 的 `eventMode` 设置**

PixiJS 8.x 移除了旧的 `interactive = true`，改为：
```typescript
sprite.eventMode = 'static';   // 静止物体（家具）
sprite.eventMode = 'dynamic';  // 动态物体（角色，会移动）
```
主场景小人用 `dynamic`，家具 hitbox 用 `static`。**未设置 eventMode 的 Sprite 不响应事件**，这是最常见的坑。

**坑2：多个 PIXI.Application 的 WebGL context 上限**

每个 `new PIXI.Application()` 消耗一个 WebGL context，浏览器上限约 16 个（Chrome/Safari 不同）。
- 主场景：整个主场景只用 **1个** PIXI.Application，所有员工角色都在同一个 stage 里
- 工作空间：切换时销毁主场景 Application，新建工作空间 Application（同一时刻只有1个）

不要给每个员工卡片创建独立的 PIXI.Application，这是致命错误。

**坑3：Canvas 尺寸和 devicePixelRatio**

高 DPI 屏幕（retina）下，CSS 尺寸 `640×480` 实际渲染像素是 `1280×960`。PixiJS 的 `resolution: window.devicePixelRatio` + `autoDensity: true` 处理了这个问题，但 Canvas 的 CSS 宽高必须用 `app.screen.width`（CSS 像素）而不是 `app.view.width`（物理像素）来定位 DOM 元素。

**坑4：React StrictMode 下 useEffect 双触发**

开发模式下，React StrictMode 会让 `useEffect` 执行两次（mount → unmount → mount）。PIXI.Application 如果不正确清理，会产生两个 canvas 叠加或 WebGL context 泄漏。

清理必须写完整：
```typescript
return () => {
  app.ticker.remove(onTick);
  app.stage.removeChildren();
  app.destroy(true, { children: true, texture: true, baseTexture: true });
};
```

**坑5：虚拟列表滚动时 Canvas stage 偏移的精度问题**

DOM 滚动是亚像素级的（`scrollTop` 可以是小数），Canvas stage 偏移用 `Math.round(scrollTop)` 对齐到整像素，避免骨骼动画角色和 DOM 卡片出现1px抖动错位。

---

## 三、状态管理方案

### 员工状态数据流

```
main process（employeeRuntimeStore）
  → IPC 推送 virtualOffice.employeeStateChanged
  → preload.ts 转发
  → renderer 侧 SWR mutate（或 Zustand store）
  → React 重渲染员工卡片颜色边框 + 状态文字
  → PixiJS 动画状态切换（useEffect 依赖 employee.state）
```

**SWR 用法：**

```typescript
// 订阅员工状态推送，实时更新 SWR cache
useEffect(() => {
  const unlisten = window.ipcBridge.virtualOffice.employeeStateChanged.on((event) => {
    mutate(`/employees/${event.employeeId}`, event, { revalidate: false });
  });
  return unlisten;
}, []);

// 员工卡片读状态
const { data: employee } = useSWR(`/employees/${id}`);
```

不用轮询（solutions.md S3 已确认），用 IPC 推送 + SWR mutate 的组合。

---

## 四、MVP 开发建议顺序

基于以上分析，主场景前端开发建议顺序：

1. **员工卡片组件**（纯 DOM，无动画）：名字、状态色边框、当前任务一句话
2. **虚拟列表框架**：`@tanstack/react-virtual` + 分组逻辑，用 mock 数据先跑通
3. **单个 PixiJS Application 场景**：所有员工角色在一个 stage，按网格坐标布局
4. **Canvas/DOM 坐标对齐**：stage.y 跟随 scrollTop，卡片位置和角色位置对齐
5. **事件系统**：家具 hitbox（工作空间）、员工点击（工作空间进入）、背景点击（关抽屉）
6. **IPC 状态推送接入**：SWR + ipcBridge 订阅，卡片颜色实时更新

每步可独立验证，不需要等动画资源完成才能做主场景列表。

---

*开发-老锤 · 2026-04-01*
*基于 solutions.md S4、flow-final.md §1.4/§7、PRD-overview.md 撰写。*
*有架构问题找老尺确认，有产品逻辑问题找郭聪明。*
