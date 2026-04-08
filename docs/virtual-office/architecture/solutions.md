# 虚拟办公室 — 架构建议方案

> 架构-老尺 | 2026-04-01
>
> 本文针对 questions.md 中 Q1/Q2/Q5/Q6/Q7 四个问题给出建议方案。
> 方案基于现有代码的真实架构（BaseAgentManager / WorkerTaskManager / IpcAgentEventEmitter / ipcBridge），
> 不是空中楼阁，可以直接被开发-老锤/小快参考落地。
>
> 阿构未完成的部分（Q3/Q4骨骼动画性能方案）另文补充。

---

## S1：记忆写入机制（对应 Q1）

### 结论

**MVP 采用"A实例收尾写 + B实例异步整理"双轨方案。**

B实例 MVP 不是一个独立常驻进程，而是**任务结束后的一次独立 LLM 调用**（按需启动，异步执行，不阻塞用户下一任务）。

### 具体方案

**写入触发时机：**

```
A实例任务完成 → ipcBridge.conversation.turnCompleted 事件触发
  → main process 监听到 turnCompleted
  → 异步启动 MemoryWriteJob（不等待）
  → 用户立即可以发下一个任务
```

**MemoryWriteJob 执行内容：**

```
1. 读取本次 A 实例的对话历史（从 SQLite，conversation_id 已知）
2. 构造压缩提示词（见下文）
3. 发起一次 LLM 调用（Haiku/Sonnet，低 token 消耗）
4. 解析结构化摘要
5. 写入员工工作空间文件（fs.writeFile，append-only 日志或更新主题文件）
6. 更新核心记忆索引（MEMORY.md 等价物）
```

**压缩提示词结构（参考 Claude autoCompact 机制）：**

```
系统提示词：
  你是 [员工名] 的记忆整理助手。
  根据以下对话历史，提取：
  1. 用户偏好（工作风格/沟通偏好/代码规范等）
  2. 项目上下文（正在进行的任务/项目背景）
  3. 本次任务摘要（做了什么/用了什么工具/结果如何）

  输出格式（JSON）：
  {
    "task_summary": "...",
    "user_preferences": [...],
    "project_context": [...]
  }

用户消息：
  [A实例对话历史，截取最近 N 轮，控制 token 消耗]
```

**Token 消耗估算：**

- 输入：对话历史最近 20 轮，约 2000-5000 token
- 输出：结构化摘要，约 300-500 token
- 模型：用 Haiku（成本最低），不用 Sonnet

**失败处理：**

- 写入失败：静默记录日志，不通知用户（不打断当前体验）
- 重试：失败后下次任务结束时自动重试（不单独维护重试队列）
- 用户可手动点"整理记忆"按钮触发兜底

### 为什么不用 A 实例自己写

A 实例任务完成后，其 Worker 进程已进入收尾状态（ForkTask 生命周期结束），上下文仍在但 Worker 状态不稳定。让 A 实例在结束时再发起一次 LLM 调用会：
- 延长 Worker 进程生命周期，增加资源占用
- 增加 A 实例本身的复杂度（原本只负责执行任务）
- 失败率更高（Worker 进程可能已被 GC）

独立的 MemoryWriteJob（main process 中异步 LLM 调用）更简单、更可控。

### 与现有代码的接入点

```typescript
// src/process/bridge/conversationBridge.ts 中，监听 turnCompleted
ipcBridge.conversation.turnCompleted.emitter.on((event) => {
  if (event.employeeId) {  // 虚拟办公室员工才触发
    void memoryService.scheduleWriteJob(event.employeeId, event.conversation_id);
  }
});
```

---

## S2：记忆注入策略（对应 Q2）

### 结论

**MVP 采用分层注入方案：核心索引 always + AI 按需召回相关记忆深度注入 + staleness 标注。**

不全量注入（上下文爆炸风险随员工使用时间线性增长）；不用关键词匹配（语义覆盖率不足）；用一次轻量 Haiku 侧查询做相关性判断，top-N 条相关记忆做深度注入，其余记忆不注入。

参考来源：老乔 §16.3 "LLM 侧查询（Claude 的做法）"，用户裁决2（记忆系统是 MVP 命脉）。

### 三层注入架构

```
Layer 0 — 核心索引（always 注入，约 1-2 KB）
  MEMORY.md：只有文件名 + description 一行描述，不含正文
  token 开销：始终约 300-500 token

Layer 1 — AI 召回层（每次对话前一次轻量 LLM 调用）
  输入：当前任务描述 + 所有记忆文件的 frontmatter（name / description / type / updated）
  输出：选出 top-N 条（N ≤ 5）相关记忆的文件名列表
  模型：Haiku，max_tokens=64，只输出 JSON 数组
  开销：约 200-400 token 输入 + 50 token 输出，单次 <$0.0001

Layer 2 — 深度注入（仅 AI 选中的文件，完整内容）
  被选中的文件：完整内容注入，单文件上限 8 KB
  未被选中的文件：不注入（不可见于当前对话）
  总量上限：16 KB（约 4000 token，system prompt 合理占比）
```

### 注入流程（时序）

```
任务开始前：
  1. 读取 MEMORY.md（Layer 0，始终注入）
  2. 扫描所有记忆文件的 frontmatter（只读元数据，不读正文）
  3. 发起 Haiku 侧查询，传入任务描述 + 所有 frontmatter
  4. 获得 top-N 文件名列表（Layer 1 结果）
  5. 读取这 N 个文件完整内容（Layer 2，深度注入）
  6. 检查每个文件 updated 字段，超过 7 天的附加 staleness caveat
  7. 组装注入字符串，写入 system prompt
```

**Haiku 侧查询 prompt（固定，不可更改）：**

```
你是一个记忆检索助手。根据当前任务，从以下记忆文件中选出最相关的至多5条。

当前任务：{taskDescription}

可选记忆：
{frontmatterList}

只输出 JSON 数组，包含文件名，按相关性降序排列。例如：["用户偏好.md","项目上下文.md"]
不要解释，不要多余文字。
```

**注入格式（组装结果）：**

```
<employee_memory>
以下是 [员工名] 的记忆，按相关性选取，供本次任务参考：

## 记忆索引
[MEMORY.md 内容]

## 相关记忆（AI 选取）

### 用户偏好.md
[完整内容]

### 项目上下文.md
[完整内容]
⚠ 此记忆距上次更新已 12 天，内容可能过时，引用时请注意。
</employee_memory>
```

### 分层策略详表

| 层级 | 内容 | token 开销 | 触发条件 |
|------|------|-----------|---------|
| Layer 0（核心索引） | MEMORY.md 全文 | 约 500 | 始终 |
| Layer 1（AI 召回） | Haiku 侧查询 | 约 500 | 始终（每次对话前） |
| Layer 2（深度注入） | top-N 文件完整内容 | 0 - 8000 token | 仅 AI 选中的文件 |
| staleness caveat | 一行警告文字 | 可忽略 | 文件 updated 超过 7 天 |

**总 token 开销（正常情况）：** 约 1000-5000 token（随相关记忆数量而定）

**与旧方案（全量注入）的对比：**

| 对比维度 | 旧方案（全量注入） | 新方案（分层注入） |
|---------|---------------|---------------|
| token 开销 | 随记忆积累线性增长，最终可达 16KB 上限 | 基本稳定在 1000-5000 token |
| 相关性 | 所有记忆平等注入，LLM 自己消化 | AI 预筛选，只注入相关部分 |
| 额外 API 调用 | 无 | 每次对话 +1 次 Haiku 调用（$<0.0001） |
| 实现复杂度 | 低 | 中（需实现 frontmatter 解析 + Haiku 调用） |
| 规模可扩展性 | 差（记忆多了必然爆炸） | 好（开销不随记忆数量线性增长） |

### staleness 机制

每个记忆文件的 frontmatter 包含 `updated` 字段（由 MemoryWriteJob 写入，精确到日期）。

```markdown
---
name: 项目上下文
description: 当前进行中的项目背景和目标
type: project
updated: 2026-03-25
---
```

注入时计算 `today - updated` 天数：

- 0-7 天：正常注入，无附加说明
- 7-30 天：注入时末尾附加一行：`⚠ 此记忆距上次更新已 N 天，可能过时。`
- 30 天以上：附加：`⚠ 此记忆已 N 天未更新，引用前请向用户确认是否仍然有效。`

### 缓存机制（避免重复扫描）

记忆文件元数据缓存（frontmatter + mtime）：

```typescript
type MemoryMetaCache = Map<employeeId, {
  frontmatterHash: string;  // 所有记忆文件 frontmatter + mtime 的组合哈希
  frontmatterList: MemoryFileMeta[];
}>;

type MemoryInjectionCache = Map<string, {  // key: employeeId + taskDescriptionHash
  injectedContent: string;
  expiresAt: number;  // 记忆文件有变更时失效
}>;
```

- frontmatter 扫描结果缓存：记忆文件 mtime 不变则复用，不重新读文件
- Haiku 召回结果缓存：同一员工 + 相似任务描述（hash 相同）时复用，跳过 API 调用

### 文件结构（与老乔 §16.2 对齐）

```
~/.aionui/workspaces/{employeeId}/
├── MEMORY.md              ← 索引（Layer 0，始终注入）
├── 用户偏好.md             ← type: feedback（AI 可选 Layer 2）
├── 项目上下文.md           ← type: project（AI 可选 Layer 2）
├── 工具使用记录.md         ← type: reference（AI 可选 Layer 2）
└── logs/
    └── 2026-04/
        └── 2026-04-01.md ← append-only 日志（一般不进 Layer 2，除非 AI 选中）
```

每个文件必须有 frontmatter，否则 Layer 1 无法扫描。MemoryWriteJob 写文件时必须维护 frontmatter。

**工作空间根目录：** `app.getPath('home') + '/.aionui/workspaces/{employeeId}/'`

### 降级策略（Haiku 调用失败时）

```
Haiku 侧查询失败（网络/超时）：
  1. 降级为按文件类型优先级注入（feedback > project > reference）
  2. 取前 3 个文件，直到总量达 8 KB 为止
  3. 不阻塞任务开始，降级静默执行（不报错给用户）
  4. 日志记录降级原因，下次任务重试
```

降级策略与旧方案（全量注入）性质相同，但仅在失败时触发，不是常规路径。

---

## S3：状态推送机制（对应 Q5）

### 结论

**MVP 采用 IPC 事件推送，不用轮询。**

现有代码已经是推送模型（`IpcAgentEventEmitter.emitMessage` → `ipcBridge.conversation.responseStream`）。虚拟办公室的员工状态推送沿用相同模式，新增一个 `virtualOffice.employeeStateChanged` 事件即可。

### 现有推送架构（已验证）

```
A实例 Worker（ForkTask）
  → postMessage 给 main process
  → BaseAgentManager 收到消息
  → IpcAgentEventEmitter.emitMessage()
  → ipcBridge.conversation.responseStream.emit()
  → preload.ts 通过 ipcRenderer.on 转发给 renderer
  → renderer 侧 SWR/React 状态更新
```

整个链路是纯事件推送，没有轮询。延迟在 main process → renderer 这段，P99 < 50ms（Electron IPC 典型值）。

### 新增员工状态事件

在 `src/common/adapter/ipcBridge.ts` 中新增：

```typescript
export const virtualOffice = {
  employeeStateChanged: bridge.buildEmitter<IEmployeeStateChangedEvent>('vo.employee.state.changed'),
  taskProgressUpdated: bridge.buildEmitter<ITaskProgressEvent>('vo.task.progress'),
};

interface IEmployeeStateChangedEvent {
  employeeId: string;
  state: EmployeeState;       // 'idle' | 'working' | 'chatting' | 'memorizing' | 'error' | ...
  health: number;             // 0-100
  stress: number;             // 0-100
  productivity: number;       // 0-100
  currentTaskSummary: string; // 当前在做什么（一句话）
  timestamp: number;
}
```

**触发时机：**

| 事件 | 触发来源 | 触发时机 |
|------|---------|---------|
| 状态变更（idle→working） | A实例 Worker → main process | Agent 开始/结束任务时 |
| Stress 更新 | main process | 每次 turnCompleted 后根据 context 使用率计算 |
| Health 更新 | main process | 任务失败/成功后更新近 20 次成功率 |
| 任务进度 | A实例 Worker | 每次 toolCall 完成时（已有 responseStream，复用） |

**多员工并发不丢消息：**

现有的 `ipcBridge.buildEmitter` 底层是 `bridge.buildEmitter`（来自 `@office-ai/platform`），每个事件都携带 `employeeId`，renderer 侧按 `employeeId` 分发到对应员工的状态 store，不会串号。

**产品要求的 <2 秒延迟：** IPC 推送链路延迟 P99 < 50ms，远满足 2 秒要求。状态更新最大延迟取决于 A 实例 Worker 发出事件的频率，与 IPC 本身无关。

### 不推荐轮询的原因

- 轮询最低延迟受间隔限制（1秒轮询则延迟最高1秒）
- 多员工并发时，轮询每次需要查询所有员工状态，增加 SQLite 读取负担
- 现有架构已经是推送模型，无需引入轮询模式

---

## S4：Canvas/DOM 混层事件处理（对应 Q6）

### 结论

**悬浮面板（电脑抽屉/书架抽屉）全部用 DOM 层实现，不用 PixiJS 渲染。**

Canvas 层只负责骨骼动画角色和家具 Sprite 的渲染及点击检测，不渲染 UI 组件。

### 层级分工（确定边界）

```
DOM 层（React）负责：
  - 顶部状态栏（始终可见）
  - 底部 HUD 输入栏（始终可见）
  - 右侧抽屉面板（电脑/书架/角色菜单）
  - Toast/通知
  - 创建员工覆盖层

Canvas 层（PixiJS）负责：
  - 骨骼动画角色 Sprite
  - 家具 Sprite（书架/电脑/床/台灯）
  - 家具 hitbox（点击检测区域）
  - hover 发光边框效果
```

**为什么面板不用 PixiJS 渲染：**

抽屉面板包含富文本输入框（聊天输入）、Markdown 渲染（任务日志）、可编辑文本（记忆文件），这些在 PixiJS 里实现成本极高（需要自建文本编辑器）。用 DOM 实现成本接近零，且可以直接复用 Arco Design 组件和现有样式体系。

### Canvas 点击事件处理

**家具 hitbox 定义（PixiJS InteractionManager）：**

```typescript
// 家具 Sprite 的点击区域
const computerSprite = new PIXI.Sprite(computerTexture);
computerSprite.eventMode = 'static';  // PixiJS 8.x 写法
computerSprite.cursor = 'pointer';

// 矩形碰撞盒（不用像素精确，矩形足够）
computerSprite.hitArea = new PIXI.Rectangle(x, y, width, height);

computerSprite.on('pointerdown', () => {
  // 通过 React 状态通知 DOM 层打开抽屉
  setActiveDrawer('computer');
});
```

**Canvas → DOM 通信方案：**

PixiJS Canvas 层和 React DOM 层共享同一个 React 状态树（因为 PixiJS Application 是在 React 组件里初始化的）。Canvas 层的点击事件通过 React 的 `useState`/`useCallback` 直接更新状态，触发 DOM 层的抽屉渲染。

```typescript
// AnimationPreviewer.tsx（Canvas 容器）
const [activeDrawer, setActiveDrawer] = useState<'computer' | 'shelf' | null>(null);

// 初始化 PixiJS 后，将 setActiveDrawer 传入 Canvas 交互逻辑
useEffect(() => {
  if (!app) return;
  setupFurnitureHitboxes(app, { onComputerClick: () => setActiveDrawer('computer') });
}, [app]);

// 抽屉渲染（DOM 层）
{activeDrawer === 'computer' && <ComputerDrawer onClose={() => setActiveDrawer(null)} />}
```

**"点空白关抽屉"实现（用户裁决8）：**

```typescript
// PixiJS Canvas 的 stage 监听 pointerdown
app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointerdown', (e) => {
  // 如果事件没有被子 Sprite 消费（即点到了空白区域）
  if (e.target === app.stage) {
    setActiveDrawer(null);
  }
});
```

PixiJS 的事件系统会在子 Sprite 消费事件后停止冒泡，所以 `e.target === app.stage` 时确实是点到了空白。

**DOM 层覆盖 Canvas 时的事件穿透：**

DOM 层的抽屉面板覆盖在 Canvas 上时，需要防止抽屉下方的 Canvas 接收点击事件：

```css
/* 抽屉打开时，Canvas 容器不接收指针事件 */
.vo-room-canvas--drawer-open {
  pointer-events: none;
}
```

抽屉关闭时移除这个 class，Canvas 恢复响应点击。

**不直接用 DOM 的 overlay 拦截 Canvas 点击的原因：** DOM overlay 方案需要全局遮罩，会遮挡 HUD 和状态栏；PixiJS 自带 `pointer-events: none` 控制更精确。

### hover 效果（Canvas 层）

家具 hover 时在 Canvas 上绘制发光边框：

```typescript
computerSprite.on('pointerover', () => {
  // PixiJS Graphics 绘制发光边框
  highlightGraphics.clear();
  highlightGraphics.lineStyle(2, 0xF5A623, 0.7);  // --vo-border-active
  highlightGraphics.drawRect(x, y, width, height);
});

computerSprite.on('pointerout', () => {
  highlightGraphics.clear();
});
```

DOM tooltip 通过 `@floating-ui/react`（已在 dependencies）实现，跟随鼠标位置。

---

## S5：三实例并发进程模型（对应 Q7）

### 结论

**三实例（A工作/B记忆/C社交）复用现有 WorkerTaskManager，每个实例是一个独立的 AgentManager（独立 conversation_id）。**

不引入新的进程模型，不改变现有 ForkTask + WorkerTaskManager 架构。

### 映射方案

每个员工在数据库里对应 3 条 conversation 记录：

```
员工 "小快"（employeeId: 'xiaokui-uuid'）
├── conversation_id: 'xiaokui-A'  （工作实例，AcpAgentManager）
├── conversation_id: 'xiaokui-B'  （记忆实例，轻量 LLM 调用，非 AgentManager）
└── conversation_id: 'xiaokui-C'  （社交实例，AcpAgentManager）
```

**B 实例不是 AgentManager：** B 实例（记忆写入）是一次性 LLM 调用（见 S1），不是持续运行的 Agent，不需要 ForkTask。它在 main process 里直接调用 Anthropic SDK，写完就结束。不占 WorkerTaskManager 槽位。

**A 实例和 C 实例并发：**

```typescript
// WorkerTaskManager 里，两个独立的 AgentManager 并发运行，互不干扰
const taskA = workerTaskManager.getOrBuildTask('xiaokui-A');  // 工作实例
const taskC = workerTaskManager.getOrBuildTask('xiaokui-C');  // 社交实例

// A 实例正在执行任务时，C 实例可以独立接收用户消息
// 两者通过不同的 conversation_id 区分，IPC 事件不会混淆
```

### 文件系统协调（代替内存共享）

A/B/C 三实例通过员工工作空间文件系统协调，不做内存共享（老乔已明确）：

```
A 实例：只读工作空间文件（任务开始时读记忆注入）
         写工具调用日志（logs/2026-04-01.md，append-only）
B 实例：读 A 实例写的日志
         写主题记忆文件（MEMORY.md / 用户偏好.md 等）
C 实例：只读工作空间文件（读记忆，了解员工背景）
         写聊天记录（独立文件，不和任务日志混）
```

**并发写冲突防范：**

- A 实例写日志是 append-only（`fs.appendFile`），不会和 B 实例写主题文件冲突（不同文件）
- B 实例写主题文件时，A 实例不会同时写同一文件（时序天然隔离：B 在 A 完成后触发）
- C 实例写聊天记录是独立文件，不和 A/B 冲突

MVP 不需要文件锁。**唯一风险：** 用户手动编辑记忆文件的同时 B 实例在写，可能产生竞争。缓解：B 实例写文件前先检查文件 mtime，与读取时一致才写，不一致则跳过（乐观锁简化版）。

### 消息队列（用户消息不打断 A 实例）

按郭聪明定稿 §2.1，用户消息在 A 实例工作时进入队列，不中断工作：

```typescript
// main process 收到用户消息时
if (employeeAIsRunning) {
  messageQueue.push({ employeeId, message, timestamp });
  // 通知 renderer 显示"消息已排队"气泡
  virtualOffice.employeeStateChanged.emit({ employeeId, messageQueued: true });
} else {
  // 直接发给 C 实例
  taskC.sendMessage(message);
}

// A 实例 turnCompleted 时，检查消息队列
ipcBridge.conversation.turnCompleted.on((event) => {
  if (event.employeeId) {
    const queued = messageQueue.dequeue(event.employeeId);
    if (queued) taskC.sendMessage(queued.message);
  }
});
```

### 员工状态机（main process 中维护）

```typescript
type EmployeeRuntimeState = {
  employeeId: string;
  instanceA: { conversationId: string; status: 'idle' | 'running' | 'error' };
  instanceC: { conversationId: string; status: 'idle' | 'running' };
  messageQueue: Array<{ message: string; timestamp: number }>;
  health: number;
  stress: number;
  productivity: number;
};

// 单例 Map，main process 生命周期
const employeeRuntimeStore = new Map<string, EmployeeRuntimeState>();
```

这个 Map 是内存状态，App 重启后根据数据库的 conversation 记录重建。

---

## 六、方案间依赖关系

```
S1 记忆写入
  依赖：工作空间文件路径（S2 确定）
  依赖：turnCompleted 事件（现有，无需新增）
  依赖：LLM 调用（直接用 @anthropic-ai/sdk，已在 dependencies）

S2 记忆注入
  依赖：工作空间文件结构（S1 写，S2 读）
  独立于其他方案

S3 状态推送
  依赖：ipcBridge 新增 virtualOffice 事件
  依赖：employeeRuntimeStore（S5 维护）

S4 Canvas/DOM 混层
  依赖：PixiJS 初始化（动画预览器方案，阿构负责）
  独立于 S1/S2/S3/S5

S5 三实例进程模型
  依赖：WorkerTaskManager（现有，无需改造）
  为 S1 提供 turnCompleted 触发点
  为 S3 提供状态变更触发点
```

---

## 七、MVP 开发顺序建议

基于以上方案，建议按此顺序落地：

1. **S5 先行**：建立 `employeeRuntimeStore`，创建员工数据库结构，让三实例的 conversation_id 体系可以工作
2. **S3 并行**：新增 `virtualOffice.employeeStateChanged` IPC 事件，让 renderer 能订阅员工状态
3. **S2 后**：实现记忆文件读取和注入逻辑（先有文件结构，再注入）
4. **S1 最后**：记忆写入依赖 S2 的文件结构，且 A 实例要先能正常运行任务
5. **S4 独立**：与 S1-S3/S5 无依赖，可以在动画预览器完成后单独推进

---

*老尺 · 2026-04-01*
*基于代码库实际架构（BaseAgentManager / WorkerTaskManager / IpcAgentEventEmitter / ipcBridge）撰写，非凭空设想。*
