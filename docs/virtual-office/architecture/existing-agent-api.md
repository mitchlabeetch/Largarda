# 现有 Agent 数据层分析

> 文档目的：摸清 AionUi 现有的 Agent 状态管理、任务生命周期、消息存储与推送、IPC 通道，为虚拟办公室第一阶段接入真实 Agent 数据打基础。
> 文档作者：老锤
> 最后更新：2026-04-02

---

## 1. 数据层整体架构

```
Renderer (React)
  ↕ ipcBridge (bridge.buildProvider / bridge.buildEmitter)
Main Process
  ├─ conversationBridge.ts       — IPC handler 注册
  ├─ ConversationServiceImpl.ts  — Conversation CRUD + Agent 工厂
  ├─ WorkerTaskManager.ts        — IAgentManager 实例缓存与调度
  ├─ BaseAgentManager.ts         — Agent 基类（Fork 子进程）
  └─ IpcAgentEventEmitter.ts     — 向 Renderer 推事件
```

核心设计：每个 `conversation_id` 对应一个 `IAgentManager` 实例，由 `WorkerTaskManager` 管理生命周期。

---

## 2. Agent 类型与状态

### AgentType（`src/process/task/agentTypes.ts`）

```ts
type AgentType = 'gemini' | 'acp' | 'codex' | 'openclaw-gateway' | 'nanobot' | 'remote';
```

### AgentStatus（`src/process/task/agentTypes.ts`）

```ts
type AgentStatus = 'pending' | 'running' | 'finished';
```

### IConversationTurnCompletedEvent.state（`src/common/adapter/ipcBridge.ts`）

推给 Renderer 的精细状态：

| state | 含义 |
|-------|------|
| `ai_generating` | 正在生成中 |
| `ai_waiting_input` | 等待用户输入 |
| `ai_waiting_confirmation` | 等待用户确认（工具调用权限等） |
| `initializing` | 初始化中 |
| `stopped` | 已停止 |
| `error` | 出错 |
| `unknown` | 未知 |

---

## 3. WorkerTaskManager — Agent 实例管理

文件：`src/process/task/WorkerTaskManager.ts`

```ts
// 核心结构
taskList: Array<{ id: string; task: IAgentManager }>

// 关键方法
getTask(id)              // 仅查缓存，找不到返回 undefined
getOrBuildTask(id, opts) // 缓存 → DB → 工厂，保证有实例
kill(id)                 // 从列表移除 + task.kill()
listTasks()              // 返回 { id, type }[]
```

`getOrBuildTask` 流程：

1. 查内存缓存 → 命中则返回
2. 从 DB 读取 `TChatConversation`
3. 根据 `conversation.type` 调用对应 Agent 工厂（`GeminiAgentManager` / `AcpAgentManager` 等）
4. 存入 `taskList`，返回

---

## 4. IAgentManager — 实例接口

文件：`src/process/task/IAgentManager.ts`

```ts
interface IAgentManager {
  status: AgentStatus | undefined;
  conversation_id: string;
  workspace: string;

  sendMessage(data: any): Promise<any>;  // 发消息
  stop(): Promise<any>;                  // 停止流
  confirm(msgId, callId, data): void;    // 确认工具权限
  getConfirmations(): IConfirmation[];
  kill(): void;                          // 彻底销毁
}
```

---

## 5. IPC 通道完整列表（Agent 相关）

文件：`src/common/adapter/ipcBridge.ts`

### 5.1 Provider（Renderer 调 Main，Request-Response）

| 通道 key | 方向 | 用途 |
|---------|------|------|
| `create-conversation` | R→M | 创建 Conversation + Agent 实例 |
| `get-conversation` | R→M | 读取 Conversation 配置 |
| `update-conversation` | R→M | 更新元信息（名称、extra 等） |
| `remove-conversation` | R→M | 删除（含 cron 清理） |
| `chat.send.message` | R→M | 发送消息，dispatch 到对应 Agent |
| `chat.stop.stream` | R→M | 停止当前流 |
| `reset-conversation` | R→M | 重置会话（清空历史） |
| `conversation.warmup` | R→M | 预热（bootstrap Agent） |
| `conversation.get-slash-commands` | R→M | 获取 slash commands |
| `conversation.ask-side-question` | R→M | 侧边问答（不计入主流） |
| `conversation.confirm.message` | R→M | 确认工具调用权限 |
| `confirmation.confirm` | R→M | 通用确认 |
| `confirmation.list` | R→M | 获取待确认列表 |
| `database.get-conversation-messages` | R→M | 读历史消息 |
| `database.get-user-conversations` | R→M | 读全部对话列表 |
| `task.stop-all` | R→M | 停止所有 Agent |
| `task.get-running-count` | R→M | 获取运行中 Agent 数量 |

### 5.2 Emitter（Main 推 Renderer，单向事件）

| 通道 key | 数据类型 | 触发时机 |
|---------|--------|---------|
| `chat.response.stream` | `IResponseMessage` | Agent 每次产出（内容流、工具调用等） |
| `conversation.turn.completed` | `IConversationTurnCompletedEvent` | 每轮对话结束（含精细 state） |
| `conversation.list-changed` | `IConversationListChangedEvent` | 对话新增/更新/删除 |
| `confirmation.add` | `IConfirmation & {conversation_id}` | Agent 发出确认请求 |
| `confirmation.update` | `IConfirmation & {conversation_id}` | 确认项更新 |
| `confirmation.remove` | `{conversation_id, id}` | 确认项已处理，移除 |

---

## 6. IResponseMessage — 消息流格式

```ts
interface IResponseMessage {
  type: string;       // 消息类型，见下表
  data: unknown;      // 消息数据
  msg_id: string;
  conversation_id: string;
}
```

**已知 type 值（从 `useConversationListSync.ts` 提取）：**

| type | 含义 |
|------|------|
| `start` | 开始生成 |
| `content` | 流式文本块 |
| `thought` | 思考过程（reasoning） |
| `thinking` | 同上（另一种叫法） |
| `tool_group` | 工具调用组 |
| `acp_tool_call` | ACP 工具调用 |
| `acp_permission` | ACP 权限请求 |
| `plan` | 计划步骤 |
| `finish` | 生成完成 |
| `error` | 出错 |
| `agent_status` | Agent 运行时状态（见 `data.status`） |

---

## 7. Renderer 数据消费层

### 7.1 全局对话列表 — `useConversationListSync`

文件：`src/renderer/pages/conversation/GroupedHistory/hooks/useConversationListSync.ts`

**核心机制：**

- 模块级 `useSyncExternalStore` —— 全局单例，不依赖 React context
- 初始化时调 `database.get-user-conversations` 拉取全量对话
- 订阅 3 个 IPC 事件实时更新：
  - `conversation.listChanged` → 增量刷新列表
  - `conversation.responseStream` → 维护 `generatingConversationIds`（是否在生成中）
  - `conversation.turnCompleted` → 清 generating 状态，标记 unread

**暴露的值：**

```ts
{
  conversations: TChatConversation[];         // 全量对话列表
  isConversationGenerating(id): boolean;      // 是否在生成中
  hasCompletionUnread(id): boolean;           // 是否有未读完成
  clearCompletionUnread(id): void;
  setActiveConversation(id | null): void;
}
```

### 7.2 单个对话数据 — `ConversationContext`

文件：`src/renderer/hooks/context/ConversationContext.tsx`

```ts
interface ConversationContextValue {
  conversationId: string;
  workspace?: string;
  type: AgentType;
}
```

通过 `<ConversationProvider value={...}>` 在对话页面级别注入。

### 7.3 消息历史读取

```ts
// IPC provider
ipcBridge.database.getConversationMessages.invoke({
  conversation_id: string,
  page?: number,     // 默认 0
  pageSize?: number, // 默认全量
})
// 返回 TMessage[]
```

---

## 8. 消息存储

- **存储层**：SQLite（通过 `IConversationRepository`，实现在 `src/process/services/database/`）
- **写入时机**：Agent 工作过程中由各 Agent 实现负责写入
- **读取**：通过 `database.get-conversation-messages` IPC
- **TChatConversation** 存储在 DB，包含：`id`, `name`, `type`, `createTime`, `modifyTime`, `extra`（workspace、model 等）

---

## 9. 虚拟办公室接入方案建议

### 需要的数据

| 虚拟办公室需求 | 数据来源 | 接入方式 |
|------------|--------|--------|
| 员工是否在工作（working/idle） | `isConversationGenerating(id)` | `useConversationListSync` |
| 员工状态详细（在想/在执行工具） | `conversation.turnCompleted` event 的 `state` 字段 | 订阅 `ipcBridge.conversation.turnCompleted.on` |
| 员工名称/类型 | `TChatConversation.name` + `type` | `conversations` 数组 |
| 员工工作空间 | `TChatConversation.extra.workspace` | `conversations` 数组 |
| 点击员工进入对话 | navigate to `/conversation/${conversation_id}` | React Router |

### 精细状态映射

```ts
// conversation.turnCompleted.state → 动画状态
const stateToAnim = {
  ai_generating: 'working',
  ai_waiting_confirmation: 'working',  // 等权限确认，还是工作中
  initializing: 'working',
  ai_waiting_input: 'idle',
  stopped: 'idle',
  error: 'idle',
  unknown: 'idle',
};

// responseStream.type → 更细的 working 子状态（可选）
const typeToSubstate = {
  thinking: 'thinking',  // 歪头思考
  tool_group: 'executing', // 操作电脑
  content: 'writing',      // 打字
};
```

### 最小接入代码示意

```ts
// 在虚拟办公室场景初始化
import { useConversationListSync } from '@renderer/pages/conversation/GroupedHistory/hooks/useConversationListSync';
import { ipcBridge } from '@common/adapter/ipcBridge';

// 1. 获取所有对话（员工列表）
const { conversations, isConversationGenerating } = useConversationListSync();

// 2. 订阅精细状态（可选，用于区分思考/执行/打字）
useEffect(() => {
  const off = ipcBridge.conversation.turnCompleted.on((event) => {
    // 更新对应员工的动画状态
    dispatch({ conversationId: event.sessionId, state: event.state });
  });
  return off;
}, []);

// 3. 实时流状态（用于打字动画等）
useEffect(() => {
  const off = ipcBridge.conversation.responseStream.on((msg) => {
    if (msg.type === 'content' || msg.type === 'thinking') {
      setWorking(msg.conversation_id, true);
    }
  });
  return off;
}, []);
```

---

## 10. 注意事项

1. **不要 mock**：第一阶段必须用真实 IPC 数据，不走 mock
2. **`isHealthCheck` 过滤**：`useConversationListSync` 已自动过滤掉健康检查会话，虚拟办公室不用额外处理
3. **workspace 区分**：一个 workspace 可以有多个 conversation，虚拟办公室可以按 workspace 分区显示员工
4. **`conversation.listChanged`** 触发刷新：对话增删改都会触发，虚拟办公室员工列表直接监听这个事件即可
5. **消息历史量**：`database.getConversationMessages` 支持分页，对话长了不要一次性全拉
