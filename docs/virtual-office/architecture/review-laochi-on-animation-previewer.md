# 骨骼动画预览器 — 复核报告

> 架构-老尺 | 2026-04-01
>
> 复核对象：`docs/virtual-office/architecture/animation-previewer.md`（阿构方案）
>
> 复核依据：9问题清单 + 项目现有代码结构（Router.tsx / vite.renderer.config.ts / package.json）+ 设计定稿（design-final.md §5）

---

## 一、总体判断

**有条件通过。**

技术选型方向正确，集成路径合理，主要风险已识别。但有3个问题必须明确后才能交付给开发-老锤/小快：

1. 文件结构预判了主场景组件（`EmployeeCard.tsx`、`EmployeeRoom.tsx`、`RoomCanvas.tsx`），不在预览器MVP范围内，需要删掉或分离
2. `useEmployeeState.ts` 这个hook的存在没有必要，预览器不依赖员工状态机，是过度抽象
3. 主进程路由集成方式有一处具体操作遗漏（见下文）

---

## 二、认同点

### 技术选型

- **PixiJS 8.x + `@pixi-spine/all-4.1`**：正确。Electron 37（Chromium 128+）WebGL2完整支持，无兼容风险。`@pixi-spine/all-4.1` 与 PixiJS 8.x 配套，这是当前唯一推荐路径。
- **不用 PixiJS 7.x 的理由充分**：8.x 是 2024 年 3 月 GA 的稳定版，不需要回退。
- **Spine Editor 格式锁定 4.1**：`@pixi-spine/all-4.1` 对应 4.1.x，格式版本锁定方式清晰，避免美术导错版本。

### 集成方式

- **独立 Route 页面而不是独立 Electron 窗口**：判断正确。新建窗口需要修改 main process，对预览器这类工具来说成本没有必要。
- **路由路径 `/virtual-office/animation-previewer`**：与现有路由命名风格一致（`/settings/*`、`/conversation/:id`）。
- **PixiJS 完全在 renderer 进程，不需要 IPC**：正确，无进程边界违规。

### 风险识别

- **风险1（pixi-spine PixiJS 8.x 兼容性）、风险3（骨骼文件格式不匹配）、风险4（Vite `.skel` 资产处理）**：都是真实风险，已识别到位。
- **风险2（Electron CSP阻止WebGL）**：是真实风险，但缓解措施不够具体（见挑战点）。

### 渲染层架构

- 5层方案来自 design-final.md §5，与设计定稿对齐，没有自己发明一套。
- MVP预览器只用 Layer 4 + Layer 5 的简化方案，合理：预览器用途是单独验证骨骼动画，不需要完整房间背景。

---

## 三、挑战点

### 挑战1：文件结构混入了主场景组件，预览器MVP边界失守

**问题：**

阿构在 `components/` 下列了5个组件：

```
AnimationPreviewer.tsx   ← 预览器
AnimationControls.tsx    ← 预览器
EmployeeCard.tsx         ← 主场景卡片（不属于预览器）
EmployeeRoom.tsx         ← 工作空间房间（不属于预览器）
RoomCanvas.tsx           ← PixiJS 房间 Canvas（不属于预览器）
```

后3个组件是主场景/工作空间的功能组件，和"预览器"这个交付物完全无关。

**带来的问题：**

- 开发-老锤/小快拿到这个文件结构，不知道哪些是第二步要做的，哪些是以后的
- 现在把主场景组件目录结构定死，但设计稿还没完全确定实现细节，将来可能需要大改
- `virtual-office/` 目录下一次性塞了 7 个文件/目录（含 hooks/、components/），components/ 里5个，边界还好，但语义上是"预期的未来结构"而不是"现在要做的"

**要求修改：** 第二步只交付预览器部分（`AnimationPreviewer.tsx` + `AnimationControls.tsx`）。其他组件从交付物清单里删除，另立文档规划主场景结构，不要混在一起。

---

### 挑战2：`useEmployeeState.ts` hook 对预览器是多余抽象

**问题：**

```
hooks/
├── useSpineAnimation.ts   ← 合理，管理骨骼动画状态
├── usePixiApp.ts          ← 合理，管理 PixiJS Application 生命周期
└── useEmployeeState.ts    ← 预览器用不到
```

`useEmployeeState` 描述为"员工状态机 hook"。预览器的职责是让美术/开发点击切换动作、看效果——它不需要知道员工状态机（`idle/working/chatting/...`），只需要能调用 `playAnimation(name)`。

状态机在正式员工房间组件里才需要，不是预览器的依赖。

**要求修改：** 从预览器 hooks 里删除 `useEmployeeState.ts`，此 hook 推迟到工作空间房间组件实现时再设计。

---

### 挑战3：Electron CSP 缓解措施不够具体

**问题：**

风险2提到"检查 `src/process/` 中的 CSP 配置"，但没有给出具体检查点。开发-老锤如果不知道去哪找，缓解措施等于没写。

**实际位置：** 在 Electron main process 初始化 BrowserWindow 时，`webPreferences` 和 `Content-Security-Policy` meta 标签两处都需要确认。`unsafe-eval` 和 WebGL 的 CSP 规则需要明确。

**要求补充：** 在方案里注明具体检查文件路径，至少给出确认 WebGL 可用的最小测试代码。

---

### 挑战4：路由集成遗漏了一个实际操作步骤

**问题：**

方案提到路由路径 `/virtual-office/animation-previewer`，但没有说明在 `Router.tsx` 里如何注册。读了现有代码后确认，这条路由需要：

1. 在 `Router.tsx` 里加 `React.lazy(() => import(...))`
2. 在 `<Route>` 里添加 `/virtual-office/animation-previewer`
3. 确认它在 `ProtectedLayout` 内还是外（预览器是开发工具，理论上应该在 `ProtectedLayout` 内，但需要明确）

这不是大问题，但交付物里没说，开发拿到后会来问。

**要求补充：** 在交付物清单里加"Router.tsx 路由注册"这一项，并说明放在 `ProtectedLayout` 内。

---

### 挑战5：文件加载方式的开发阶段 vs 生产阶段边界描述不清

**问题：**

方案写：

- 开发阶段：`<input type="file">` + `FileReader`
- 生产阶段：IPC 调用 main process 文件系统读取

但"预览器"这个工具，在生产包里是否需要存在？如果只是开发调试用途，生产阶段根本不需要文件加载。如果将来预览器演变成"美术提交资产后用户可以在 App 内预览自定义角色"，那才需要 IPC。

MVP 预览器的定位是"开发/调试工具，不是面向最终用户的功能"，那么：

- 生产阶段 IPC 方案可以不做，MVP 只实现 FileReader 方式
- 或者明确说"MVP 全走 FileReader，IPC 是 P1"

**要求修改：** 明确文件加载的 MVP 范围：只做 FileReader，IPC 方案标注 P1，不要含混"开发阶段/生产阶段"这种措辞。

---

## 四、规范问题

### 规范1：`index.tsx` re-export 文件的实际内容没有说明

方案在文件结构里列了 `index.tsx — 路由入口，re-export`，但没有说明 re-export 什么。现有项目的页面模块（如 `src/renderer/pages/conversation/Preview/index.ts`）有明确的 re-export 内容。这个文件需要说明导出什么，不能只写"re-export"。

### 规范2：`index.module.css` 被标注为"页面级样式"，但 CSS 变量应来自 design-final.md

design-final.md 定义了完整的 `--vo-*` CSS 变量体系。预览器如果有样式，需要用这套变量，不能在 `index.module.css` 里自己定义颜色。方案里没有提到 CSS 变量来源，需要补充。

### 规范3：Spine 资产路径放在 `src/renderer/assets/spine/`

`src/renderer/assets/` 是否存在？方案里没有确认。Vite 的 `publicDir` 配置是 `public/`，静态资产是否应该放 `public/spine/` 而不是 `src/renderer/assets/spine/`？这会影响打包后的路径解析。

**要求明确：** 确认 Spine 资产的最终存放路径，并在 `vite.renderer.config.ts` 里验证是否需要 `assetsInclude` 配置（方案里风险4的"推荐方案"是 `fetch() + ArrayBuffer`，如果走这条，资产放 `public/` 更合适）。

---

## 五、对9问题清单的覆盖情况

| 问题编号              | 覆盖情况     | 说明                                                                   |
| --------------------- | ------------ | ---------------------------------------------------------------------- |
| Q1 记忆写入时机       | 未覆盖       | 预览器范围外，正确                                                     |
| Q2 记忆注入策略       | 未覆盖       | 预览器范围外，正确                                                     |
| Q3 Spine授权          | **部分覆盖** | 明确了 Spine Essential $69，但授权是否实际购买/可用未确认              |
| Q4 骨骼动画性能边界   | **未覆盖**   | 预览器是单角色，不涉及多角色性能，MVP可接受，但生产阶段需要单独回答    |
| Q5 状态推送           | 未覆盖       | 预览器范围外，正确                                                     |
| Q6 Canvas/DOM混层事件 | **部分覆盖** | 5层架构说明了分层，但 Canvas 点击事件和 DOM 事件的具体处理逻辑没有展开 |
| Q7 三实例进程模型     | 未覆盖       | 预览器范围外，正确                                                     |
| Q8 本地持久化方案     | 未覆盖       | 预览器范围外，正确                                                     |
| Q9 预览器功能边界     | **已覆盖**   | MVP功能范围清晰（加载/播放/切换/速度/皮肤），不在MVP的也说明了         |

**Q6 的遗漏是真正需要补充的：** 预览器 Layer 4（PixiJS Canvas）和 Layer 5（React DOM 控制面板）的事件分层，在预览器里已经出现了——用户点 Canvas 上的骨骼角色时是否有交互？DOM 控制面板覆盖在 Canvas 上时是否会拦截 Canvas 事件？这在预览器里就会出现，方案里没有说清楚。

---

## 六、长期维护风险评估

| 风险                   | 等级 | 说明                                                                            |
| ---------------------- | ---- | ------------------------------------------------------------------------------- |
| Spine $69 授权未确认   | 高   | 外部依赖，MVP硬阻塞。建议在方案合并前先购买或确认预算                           |
| 文件结构预判了未来组件 | 中   | 现在定的目录结构将来可能成为累赘（如设计变更后 `EmployeeRoom.tsx` 结构大改）    |
| `pixi-spine` 版本锁定  | 低   | 方案已明确锁定 `@pixi-spine/all-4.1`，维护风险可控                              |
| Vite 资产路径未验证    | 中   | `.skel` 文件打包路径如果搞错，生产包里预览器加载失败，且不容易发现              |
| CSP 未提前验证         | 中   | WebGL 被 CSP 拦截是一类在本地开发时正常、打包后失效的问题，不提前确认会浪费时间 |

---

## 七、建议修改清单（给阿构）

**必须修改（阻塞交付）：**

1. 从 `components/` 里删除 `EmployeeCard.tsx`、`EmployeeRoom.tsx`、`RoomCanvas.tsx`，这3个组件不属于预览器MVP范围
2. 从 `hooks/` 里删除 `useEmployeeState.ts`，预览器不依赖员工状态机
3. 文件加载方式明确：MVP只做 FileReader，IPC 标注 P1
4. 交付物清单补充：`Router.tsx 路由注册`，并说明放在 `ProtectedLayout` 内

**建议修改（不阻塞，但应尽快补充）：**

5. 补充 Spine 授权确认方式（谁来购买，什么时间）
6. 明确 Spine 资产存放路径（`public/spine/` vs `src/renderer/assets/spine/`）并验证 Vite 配置
7. 在风险2里补充具体的 CSP 检查文件路径
8. 补充 Layer 4（Canvas）和 Layer 5（DOM）的点击事件处理说明

---

## 八、是否通过复核

**有条件通过。**

必须修改项1-4完成后可以交付给开发-老锤/小快执行。建议修改项5-8在开发开始后一周内补充，不阻塞开发启动但需要跟进。

---

_老尺 · 2026-04-01_
