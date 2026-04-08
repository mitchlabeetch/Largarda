# 骨骼动画预览器 — 架构方案

> 架构-阿构 | 2026-04-01（v2，经老尺 review 修订）
>
> 目标：在 AionUi（Electron + React）中实现一个可用的 Spine 骨骼动画预览器，
> 供美术/开发联调使用，同时作为虚拟办公室角色动画的技术底座。

---

## 一、技术选型确认

### PixiJS 版本锁定

项目 package.json 中**尚未安装 PixiJS**。需新增依赖：

| 包                    | 版本               | 原因                                            |
| --------------------- | ------------------ | ----------------------------------------------- |
| `pixi.js`             | `^8.x`（最新稳定） | 官方推荐，WebGL/WebGPU 双后端，Electron 37 兼容 |
| `@pixi-spine/all-4.1` | `^4.x`             | 对应 Spine Editor 4.1.x，官方生态，API 稳定     |

> **注意：** `@pixi-spine/all-4.1` 对应 Spine Editor 4.1 导出格式（`.skel` 二进制 + `.atlas`）。
> Spine Essential $69 版本支持导出 4.1 格式。不要使用 3.x 或 5.x 格式，运行时不兼容。

### 为什么不用 PixiJS 7.x

PixiJS 8.x 已是稳定版（2024 年 3 月 GA），`@pixi-spine` 同步支持。
Electron 37 内置 Chromium 128+，WebGL2 完整支持，无兼容风险。

### Spine 运行时版本对应关系

```
Spine Editor 4.1.x  →  导出 skeleton v4.1
@pixi-spine/all-4.1  →  解析 skeleton v4.1（.skel 二进制 或 .json 文本）
```

---

## 二、预览器功能范围（MVP）

MVP 预览器需要能做到：

1. **加载骨骼文件**：支持 `.skel`（二进制）和 `.json`（文本）两种格式
2. **加载图集**：`.atlas` + 对应 `.png` spritesheet
3. **播放动画**：列出所有可用动画状态，点击切换
4. **循环/单次控制**：toggle 循环播放（idle/working 等循环；happy 单次）
5. **皮肤切换**：列出所有可用 skin，支持切换（多职位换装验证）
6. **帧率/速度控制**：timeScale 调节（0.25x ~ 2x），方便美术验收
7. **像素风渲染质量**：强制 `SCALE_MODE.NEAREST`，无模糊

**不在 MVP 范围：**

- 骨骼混合（animation mixing）的可视化配置
- 多角色同时预览
- 导出截图/录制

---

## 三、集成到现有 Electron 应用的方式

### 方式选择：独立 Route 页面（推荐）

不新建 Electron 窗口，不修改 main process，仅在 renderer 层添加新 Route。

**原因：**

- 预览器是开发/调试工具，不需要独立进程
- 共享 renderer 的 React 路由体系，集成成本最低
- PixiJS Canvas 完全在 renderer 进程运行，无需 IPC
- 可通过 URL 参数传入骨骼文件路径，方便调试

**路由路径：** `/virtual-office/animation-previewer`

### Router.tsx 路由注册（具体操作）

在 `src/renderer/components/layout/Router.tsx` 中：

```typescript
// 1. 顶部 lazy import（与其他页面一致）
const AnimationPreviewer = React.lazy(() => import('@renderer/pages/virtual-office'));

// 2. 在 ProtectedLayout 的 <Route> 块内添加（认证保护内，与 /test/components 同级）
<Route path='/virtual-office/animation-previewer' element={withRouteFallback(AnimationPreviewer)} />
```

**放在 `ProtectedLayout` 内的原因：** 预览器是开发工具，只有登录用户才能访问，与其他工具页（`/test/components`）保持一致。

### renderer 进程约束

- PixiJS 是纯浏览器/Canvas API，完全兼容 renderer 进程
- **骨骼文件加载（MVP）：** 只做 `<input type="file">` 本地拖入 + `FileReader` 读取 ArrayBuffer，无需 IPC
- **IPC 方式（P1，不在 MVP 范围）：** 如果将来需要从应用内部路径自动加载资产，再通过 IPC 调用 main process 的 `fs` 模块；MVP 不做
- 不直接调用 Node.js `fs`，遵守三进程隔离规则

---

## 四、文件结构规划

遵守项目规范：renderer 内用 PascalCase 目录，目录不超过 10 个子项。

```
src/renderer/pages/virtual-office/           # 新增 virtual-office 页面模块（第二步只交付预览器）
├── index.tsx                                # re-export AnimationPreviewerPage（供 Router.tsx lazy import）
├── AnimationPreviewerPage.tsx               # 预览器页面根组件（路由 /virtual-office/animation-previewer）
├── types.ts                                 # 本模块类型定义（EmployeeState 枚举等）
├── constants.ts                             # 常量（STATE_ANIM_MAP 等）
├── index.module.css                         # 页面级样式，颜色只使用 --vo-* CSS 变量（来自 design-final.md §1）
├── components/                             # 页面私有组件（仅预览器所需）
│   ├── AnimationPreviewer.tsx              # 预览器主组件（PixiJS Canvas 容器 + 文件拖入区）
│   └── AnimationControls.tsx               # 控制面板（动画列表/皮肤/速度）
└── hooks/                                  # 页面私有 hooks（仅预览器所需）
    ├── useSpineAnimation.ts                # Spine 骨骼动画状态管理
    └── usePixiApp.ts                       # PixiJS Application 生命周期管理

public/spine/                               # Spine 静态资产（Vite publicDir，fetch 加载不依赖构建）
└── employee/
    ├── employee.atlas
    ├── employee.skel
    └── employee.png
```

> **说明：** `EmployeeCard.tsx`、`EmployeeRoom.tsx`、`RoomCanvas.tsx`、`useEmployeeState.ts` 不属于预览器 MVP，推迟到主场景/工作空间阶段单独规划，不在此文件结构中出现。
>
> **Spine 资产放 `public/` 的原因：** 走 `fetch() + ArrayBuffer` 加载（见第七节），资产需要在打包后可通过相对 URL 访问，`public/` 是 Vite 的 publicDir，文件原样复制到 dist 根目录，路径最简单，不需要 `assetsInclude` 配置。
>
> **目录数量核验：** `virtual-office/` 下：index.tsx + AnimationPreviewerPage.tsx + types.ts + constants.ts + index.module.css + components/ + hooks/ = 7 项，未超 10。`components/` 下：2 个文件。

---

## 五、核心模块接口定义

### useSpineAnimation hook

```typescript
// src/renderer/pages/virtual-office/hooks/useSpineAnimation.ts

type SpineAnimationConfig = {
  skelUrl: string; // .skel 文件 URL 或 data URL
  atlasUrl: string; // .atlas 文件 URL 或 data URL
};

type SpineAnimationControls = {
  spine: Spine | null;
  availableAnimations: string[];
  availableSkins: string[];
  currentAnimation: string | null;
  currentSkin: string | null;
  isLoaded: boolean;
  error: string | null;
  playAnimation: (name: string, loop?: boolean) => void;
  setSkin: (name: string) => void;
  setTimeScale: (scale: number) => void;
};

function useSpineAnimation(app: PIXI.Application | null, config: SpineAnimationConfig | null): SpineAnimationControls;
```

### usePixiApp hook

```typescript
// src/renderer/pages/virtual-office/hooks/usePixiApp.ts

type PixiAppOptions = {
  width: number;
  height: number;
  background: number; // hex color
};

function usePixiApp(containerRef: React.RefObject<HTMLDivElement>, options: PixiAppOptions): PIXI.Application | null;
```

### EmployeeState 枚举

```typescript
// src/renderer/pages/virtual-office/types.ts

type EmployeeState = 'idle' | 'working' | 'chatting' | 'memorizing' | 'resting' | 'sleep' | 'happy' | 'error';

// 状态到骨骼动作名映射（运行时常量）
const STATE_ANIM_MAP: Record<EmployeeState, string> = {
  idle: 'anim_idle',
  working: 'anim_work',
  chatting: 'anim_chat',
  memorizing: 'anim_read',
  resting: 'anim_rest',
  sleep: 'anim_sleep',
  happy: 'anim_happy',
  error: 'anim_error',
};
```

---

## 六、渲染层架构（5 层）

完整房间视图的 5 层架构（来自 design-final.md Section 5，此处确认实现方式）：

```
Layer 5 (z=50):  React DOM — 状态栏、HUD、抽屉
Layer 4 (z=40):  PixiJS Canvas — 骨骼动画角色 Sprite
Layer 3 (z=30):  PixiJS Canvas — 家具/道具 Sprite + hitbox
Layer 2 (z=20):  CSS div — 昼夜叠加，mix-blend-mode: multiply
Layer 1 (z=10):  背景 PNG — 预渲染房间（<img> 或 CSS background）
```

**实现细节：**

- Layer 1-4 共用同一个 `<div>` 容器，使用 `position: relative`
- PixiJS Canvas（Layer 3+4）绝对定位覆盖在背景 PNG 上，`background: transparent`
- PixiJS 配置 `backgroundAlpha: 0`，允许透出底层 PNG
- Layer 5 的 React DOM 组件绝对定位覆盖在 Canvas 上，`pointer-events: none` 的区域不拦截 Canvas 事件

**MVP 预览器简化层：** 只有 Layer 4（骨骼角色）+ Layer 5（控制面板），不包含完整房间背景，以便美术单独验证骨骼动画效果。

---

## 七、AnimationPreviewer 组件交互流程

```
用户拖入 .skel + .atlas 文件
  ↓
FileReader 读取为 ArrayBuffer / text
  ↓
usePixiApp 初始化 PIXI.Application（Canvas 渲染目标）
  ↓
useSpineAnimation 加载骨骼资产（PIXI.Assets.load）
  ↓
创建 Spine 对象，添加到 PIXI stage
  ↓
读取 skeleton.data.animations → 填充 AnimationControls 列表
读取 skeleton.data.skins → 填充皮肤切换列表
  ↓
用户点击动画名 → spine.state.setAnimation(0, name, loop)
用户切换皮肤 → spine.skeleton.setSkin(skin) + setSlotsToSetupPose()
用户调速度 → spine.state.timeScale = value
```

---

## 八、风险点

### 风险 1：pixi-spine 与 PixiJS 8.x 的兼容性

`@pixi-spine/all-4.1` 最新版（pixi-spine 4.x）已支持 PixiJS 8.x，但需要安装正确的包版本。

**缓解：** 安装时锁定版本，安装后立即跑一个最小 hello-world 验证渲染正常，再推进业务逻辑。

### 风险 2：Electron 的 CSP（Content Security Policy）阻止 Canvas

Electron 默认 CSP 可能拒绝 WebGL。

**缓解：** 检查 `src/process/` 中的 CSP 配置，确认允许 WebGL/Canvas。PixiJS 8 支持降级到 Canvas2D，可作为临时兜底。

### 风险 3：骨骼文件格式不匹配

美术用 Spine Editor 版本导出格式与运行时版本不一致（如用了 4.2 导出，运行时是 4.1）。

**缓解：** 预览器界面显示加载成功/失败状态，错误信息直接显示 pixi-spine 的 parse 异常原因，方便美术自查。

### 风险 4：vite.renderer.config.ts 的资产处理

`.skel` 是二进制文件，Vite 默认不识别，需要配置 `assetsInclude` 或通过 `?url` 后缀引用。

**缓解：** 在 `vite.renderer.config.ts` 中添加 `.skel` 到 `assetsInclude`，或在运行时使用 `fetch()` + ArrayBuffer 加载（推荐，不依赖 Vite 特殊配置）。

---

## 九、与老尺的分歧（已 review，有条件通过）

老尺 review 报告：`docs/virtual-office/architecture/review-laochi-on-animation-previewer.md`

**4 项必须修改——已在本版本（v2）全部解决：**

1. 删除 `EmployeeCard.tsx`、`EmployeeRoom.tsx`、`RoomCanvas.tsx` — 已从文件结构删除
2. 删除 `useEmployeeState.ts` — 已从文件结构删除
3. 文件加载方式：MVP 只做 FileReader，IPC 标注 P1 — 已在第三节明确
4. Router.tsx 路由注册说明 — 已在第三节补充具体代码

**建议修改（不阻塞，后续跟进）：**

5. Spine $69 授权确认：需要产品侧确认购买预算，开发启动前完成
6. Spine 资产路径：已确认放 `public/spine/`（见第四节说明）
7. CSP 检查：见第八节风险 2 更新
8. Canvas / DOM 点击事件处理：预览器 MVP 中 Canvas 层无点击交互，控制面板全部在 DOM 层，不存在事件冲突；工作空间阶段引入 hitbox 时再单独设计

---

## 十、交付物清单（给开发-老锤/小快）

| 交付物                  | 文件路径                                                              | 备注                                                                                          |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 新增依赖                | `package.json`                                                        | `pixi.js@^8` + `@pixi-spine/all-4.1`                                                          |
| 路由注册                | `src/renderer/components/layout/Router.tsx`                           | 添加 lazy import + `<Route path='/virtual-office/animation-previewer'>` 到 ProtectedLayout 内 |
| 页面入口                | `src/renderer/pages/virtual-office/index.tsx`                         | re-export `AnimationPreviewerPage`                                                            |
| 页面根组件              | `src/renderer/pages/virtual-office/AnimationPreviewerPage.tsx`        | 页面容器，组合 AnimationPreviewer + AnimationControls                                         |
| usePixiApp hook         | `src/renderer/pages/virtual-office/hooks/usePixiApp.ts`               | PixiJS Application 生命周期管理                                                               |
| useSpineAnimation hook  | `src/renderer/pages/virtual-office/hooks/useSpineAnimation.ts`        | 骨骼动画状态管理                                                                              |
| AnimationPreviewer 组件 | `src/renderer/pages/virtual-office/components/AnimationPreviewer.tsx` | PixiJS Canvas 容器 + 文件拖入区                                                               |
| AnimationControls 组件  | `src/renderer/pages/virtual-office/components/AnimationControls.tsx`  | 动画/皮肤/速度控制面板（纯 DOM）                                                              |
| types + constants       | `src/renderer/pages/virtual-office/types.ts` + `constants.ts`         | EmployeeState 枚举 + STATE_ANIM_MAP                                                           |
| Spine 占位资产          | `public/spine/employee/`                                              | .atlas + .skel + .png，美术提供前可用 Spine 官方示例文件占位                                  |

---

_架构-阿构 · 2026-04-01 v2（老尺 review 后修订）_
