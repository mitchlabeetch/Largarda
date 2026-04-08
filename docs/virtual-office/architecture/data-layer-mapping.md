# 虚拟办公室 — 数据层映射文档

**目标**：虚拟办公室展示的每个状态、每条任务、每段对话，都必须来自 AionUi 现有 Agent 真实数据，不允许 mock。

本文档梳理现有 Agent 数据接口，明确虚拟办公室每个 UI 状态应读哪个字段、调哪个 API。

---

## 1. 员工运行状态

### 映射关系

| 虚拟办公室状态 | 数据源 | 字段 | 值含义 |
|---|---|---|---|
| 工作中（running） | `IAgentManager.status` | `'running'` | Agent 正在执行任务 |
| 等待中（pending） | `IAgentManager.status` | `'pending'` | Agent 已创建，尚未收到消息 |
| 空闲（finished） | `IAgentManager.status` | `'finished'` | 上一个任务已完成 |
| 离线（not found） | `IWorkerTaskManager.getTask(id)` | 返回 `undefined` | 无对应运行中进程 |

### 数据接口

```typescript
// src/process/task/IAgentManager.ts
interface IAgentManager {
  status: AgentStatus | undefined;  // 'pending' | 'running' | 'finished'
  type: AgentType;                  // 'gemini' | 'acp' | 'codex' | 'openclaw-gateway' | 'nanobot' | 'remote'
  workspace: string;                // 员工工作目录
  conversation_id: string;          // 关联会话 ID
}

// src/process/task/IWorkerTaskManager.ts
interface IWorkerTaskManager {
  listTasks(): Array<{ id: string; type: AgentType }>;  // 所有运行中的 Agent
  getTask(id: string): IAgentManager | undefined;        // 按 conversation_id 查找（仅缓存）
  getOrBuildTask(id: string): Promise<IAgentManager>;    // 查找或创建
}
```

### 状态叠加逻辑

`conversation.get` IPC 调用返回时，主进程会将运行时 status 叠加到存储的 conversation 上：

```typescript
// src/process/bridge/conversationBridge.ts
// 返回值结构：
{ ...conversation, status: task?.status || 'finished' }
```

这是虚拟办公室获取员工状态的正确入口。

### 颜色信号对照（产品裁决 #9）

| AgentStatus | 虚拟办公室颜色 |
|---|---|
| `'running'` | 绿色边框 |
| `'pending'` | 橙色边框 |
| `'finished'` | 灰色边框 |
| not found（进程不存在） | 红色边框（offline） |

---

## 2. 任务队列与执行记录

### 映射关系

虚拟办公室"任务面板"所需数据全部来自 `TChatConversation` 和 `IConversationRepository`。

| 虚拟办公室字段 | 数据源 | 字段路径 |
|---|---|---|
| 任务标题 | `TChatConversation.name` | `conversation.name` |
| 任务创建时间 | `TChatConversation.createTime` | `conversation.createTime` |
| 最近更新时间 | `TChatConversation.modifyTime` | `conversation.modifyTime` |
| 任务状态（运行/完成） | `TChatConversation.status` + 运行时叠加 | 见上节状态叠加逻辑 |
| 工作目录 | `extra.workspace` | `conversation.extra.workspace` |
| Agent 类型 | `TChatConversation.type` | `conversation.type` |

### 查询接口

```typescript
// src/process/services/database/IConversationRepository.ts
interface IConversationRepository {
  getUserConversations(cursor?: string, offset?: number, limit?: number): Promise<PaginatedResult<TChatConversation>>;
  getConversation(id: string): Promise<TChatConversation | undefined>;
  listAllConversations(): Promise<TChatConversation[]>;
}
```

IPC 入口（renderer 侧调用）：

```typescript
// src/common/adapter/ipcBridge.ts
database.getUserConversations({ page, pageSize })  // 分页获取会话列表
database.getConversationMessages({ conversation_id, page, pageSize })  // 获取消息记录
```

---

## 3. 对话与消息记录

### 消息类型全集

```typescript
// src/common/chat/chatLib.ts
type TMessage =
  | IMessage<'text', string>
  | IMessage<'tool_call', IMessageToolCall>
  | IMessage<'tool_group', IMessageToolGroup>
  | IMessage<'agent_status', IMessageAgentStatus>
  | IMessage<'acp_tool_call', unknown>
  | IMessage<'codex_tool_call', unknown>
  | IMessage<'plan', unknown>
  | IMessage<'thinking', string>
```

### 虚拟办公室消息面板映射

| 展示内容 | 消息类型 | 关键字段 |
|---|---|---|
| 员工发言 / AI 回复 | `type: 'text'` | `content: string` |
| 工具调用记录 | `type: 'tool_call'` | `content.name`, `content.args`, `content.status: 'success'\|'error'` |
| 工具组执行状态 | `type: 'tool_group'` | `content[].status: 'Executing'\|'Success'\|'Error'\|'Canceled'\|'Pending'\|'Confirming'` |
| 连接状态（ACP 类型员工） | `type: 'agent_status'` | `content.status: 'connecting'\|'connected'\|'session_active'\|'disconnected'\|'error'` |
| 思考过程（可折叠） | `type: 'thinking'` | `content: string` |

### 实时消息流

员工当前正在执行时，消息通过 IPC 流式推送：

```typescript
// src/common/adapter/ipcBridge.ts
conversation.responseStream  // → IResponseMessage（流式内容，含 msg_id、内容增量）
conversation.turnCompleted   // → IConversationTurnCompletedEvent（一轮结束）
conversation.listChanged     // → IConversationListChangedEvent（会话列表变更）
```

虚拟办公室订阅这三个事件，实现"员工正在打字"的实时状态。

---

## 4. 工具调用记录

### 进行中的工具执行

```typescript
// src/common/chat/chatLib.ts
interface IMessageToolGroupItem {
  callId: string;
  description: string;
  name: string;
  status: 'Executing' | 'Success' | 'Error' | 'Canceled' | 'Pending' | 'Confirming';
  confirmationDetails?: unknown;  // 需要人工确认时
}
type IMessageToolGroup = IMessageToolGroupItem[];
```

虚拟办公室可用此展示"员工正在做什么"（如：正在读取文件 / 正在执行命令）。

### 已完成的工具调用

```typescript
interface IMessageToolCall {
  callId: string;
  name: string;      // 工具名称，如 'read_file', 'bash', 'web_search'
  args: unknown;     // 入参
  error?: unknown;   // 如有错误
  status?: 'success' | 'error';
}
```

### 等待人工确认

当 `IMessageToolGroupItem.status === 'Confirming'` 时，虚拟办公室需要显示确认提示。
调用接口：

```typescript
IAgentManager.getConfirmations(): Promise<Array<{ msgId: string; callId: string; content: unknown }>>
IAgentManager.confirm(msgId: string, callId: string, data: unknown): Promise<void>
```

---

## 5. 实时状态推送机制

### 事件流向

```
Agent 进程
  → IAgentEventEmitter.emitMessage(event)
    → event.type: 'text' | 'tool_group' | 'status'
      → IPC: conversation.responseStream (renderer 订阅)
        → 虚拟办公室 React 状态更新
```

### 延迟要求（产品规格）

PRD-overview.md 要求状态推送 < 2 秒延迟。现有机制为直接 IPC 事件，延迟应远低于此阈值，满足要求。

### 会话列表变更

```typescript
// 当有新会话创建、删除、或状态变更时触发
conversation.listChanged → IConversationListChangedEvent
```

虚拟办公室员工列表刷新应订阅此事件，而不是轮询。

---

## 6. 员工 → Agent 实例对应关系

### 当前架构中员工 = conversation

虚拟办公室的"员工"在数据层面就是一个 `TChatConversation`。MVP 阶段映射：

| 虚拟办公室概念 | 现有数据结构 | 说明 |
|---|---|---|
| 员工 | `TChatConversation` | 一个员工 = 一个会话 |
| 员工名称 | `TChatConversation.name` | |
| 员工类型（Gemini/ACP等） | `TChatConversation.type` | |
| 员工工作目录 | `extra.workspace` | |
| 员工当前任务 | `IAgentManager.status` + 最近消息 | |
| 员工历史工作记录 | `IConversationRepository.getMessages()` | 分页读取 |
| 员工记忆文件 | `~/.aion/employees/{id}/memory/core.md` | 见 PRD-workspace.md 1.3.1 节 |

### 三实例模型（P1 规划）

产品规划中每个员工由三个 Agent 实例组成（A=工作、B=记忆、C=社交），但 MVP 阶段只需 A 实例。B/C 实例在 P1 阶段通过 `getOrBuildTask()` 按需创建。

---

## 7. 虚拟办公室消费端调用路径

### 员工卡片（主场景）

```
renderer 侧:
1. database.getUserConversations() → 获取员工列表
2. 订阅 conversation.listChanged → 列表实时更新
3. 每张卡片调用 conversation.get(id) → 获取含运行时 status 的完整数据
4. 订阅 conversation.responseStream → 捕获正在执行中的员工消息
```

### 电脑抽屉（详情面板）

```
renderer 侧:
1. database.getConversationMessages({ conversation_id, pageSize: 50 }) → 加载历史消息
2. 订阅 conversation.responseStream，过滤 conversation_id 匹配的事件
3. IMessageToolGroup 中 status==='Confirming' 的条目 → 显示确认按钮
4. 调用 IAgentManager.sendMessage(data) 发新消息（通过 IPC）
```

---

## 8. 待确认事项（产品 → 架构）

1. **员工 ID 稳定性**：`TChatConversation.id` 是 UUID，重启后是否稳定？是 —— SQLite 持久化，重启不变。
2. **并发上限**：`IWorkerTaskManager.listTasks()` 返回所有运行中 Agent，目前无上限，虚拟办公室需在 UI 层做分页。
3. **员工删除**：`IConversationRepository.deleteConversation(id)` 存在，虚拟办公室删除员工时调用此接口。
4. **跨员工协作消息**：当前 conversation 是独立隔离的。员工间通信需通过主进程桥接（P1 阶段设计）。

---

*文档生成：产品-郭聪明 | 2026-04-01*
*数据源：src/process/task/ + src/common/chat/ + src/process/services/database/*
