# Dispatch System: AionUi vs Claude Code Alignment

> Last updated: 2026-03-31 — based on CC source (dispatch_system extract) and AionUi feat/dispatch branch.

## Overview

AionUi's dispatch system is aligned with Claude Code's (CC) multi-agent orchestration protocol. Both share the same tool set, parameter schema, description style, and response format. Differences exist only where AionUi's multi-engine architecture requires extensions.

---

## Tool Set Comparison

| Tool | CC | AionUi | Notes |
|------|----|--------|-------|
| `start_task` | ✅ | ✅ | Identical semantics — non-code work |
| `start_code_task` | ✅ | ✅ | Identical — worktree isolation for code work |
| `read_transcript` | ✅ | ✅ | Identical params: session_id, limit, max_wait_seconds, format |
| `list_sessions` | ✅ | ✅ | Identical — most recent first |
| `send_message` | ✅ | ✅ | Identical — follow-up to existing session |
| `send_user_message` | ✅ | ❌ | **Not needed** — see "Channel Isolation" below |

### Tools CC has that AionUi intentionally omits

| CC Tool | Why AionUi doesn't have it |
|---------|---------------------------|
| `send_user_message` | CC uses channel isolation: leader's plain text is hidden from the user, requiring an explicit tool call to "send" a message to the user. AionUi chose **direct rendering** — leader's replies are shown to the user like a normal chat. This is simpler and matches single-chat UX. |
| `list_projects` | CC uses this to discover workspaces (git repos). AionUi has its own workspace management in the UI layer. Not needed at the dispatch tool level. |
| `set_agent_name` | CC lets the leader rename itself. Low value for AionUi — the dispatcher name is set at creation time. |

---

## Parameter Differences

### `start_task`

| Parameter | CC | AionUi | Notes |
|-----------|----|--------|-------|
| `prompt` | ✅ required | ✅ required | Identical |
| `title` | ✅ required | ✅ required | Identical — 3-6 words |
| `workspace` | ❌ | ✅ optional | **AionUi extension** — multi-workspace support; CC child inherits parent cwd |
| `agent_type` | ❌ | ✅ optional | **AionUi extension** — multi-engine (gemini, acp, codex, etc.); CC is single-engine |
| `model` | ❌ | ✅ optional | **AionUi extension** — multi-provider model override; CC uses a single model |

### `start_code_task`

| Parameter | CC | AionUi | Notes |
|-----------|----|--------|-------|
| `prompt` | ✅ required | ✅ required | Identical |
| `title` | ✅ required | ✅ required | Identical |
| `workspace` | ❌ | ✅ optional | **AionUi extension** |
| `agent_type` | ❌ | ✅ optional | **AionUi extension** |

### `read_transcript`, `list_sessions`, `send_message`

Identical parameters. No AionUi extensions.

---

## Architecture Differences

### MCP Transport

| Aspect | CC | AionUi |
|--------|----|--------|
| Transport type | Internal "Remote Tools Device" — in-process virtual MCP | Real HTTP MCP server (`StreamableHTTPServerTransport`) |
| Tool name prefix | `mcp__dispatch__` (internal routing) | `{serverName}__` for Gemini CLI (e.g. `aionui-team__start_task`); bare names for ACP agents |
| Server name | `dispatch` + `session_info` (two logical servers) | `aionui-team` (single server, all 5 tools) |
| Connection | No network — internal function dispatch | `http://127.0.0.1:{port}/mcp` per conversation |

**Why different**: CC's leader is always an in-process Claude instance. AionUi's leader can be any external CLI (Gemini CLI, Claude CLI, Codex CLI, etc.), so it needs a real network-accessible MCP endpoint.

### Channel Isolation vs Direct Rendering

| Aspect | CC | AionUi |
|--------|----|--------|
| Leader plain text visibility | Hidden from user | **Shown directly to user** |
| Sending messages to user | Requires `send_user_message` tool | Leader text renders automatically |
| UX model | Leader operates in a hidden channel; user only sees explicit messages | Leader operates in a visible chat; user sees everything |

**Why different**: CC's channel isolation exists because the leader's internal reasoning (tool calls, retries, coordination chatter) would be noise for the user. AionUi chose direct rendering because:
1. Simpler implementation — no need for a separate "user channel"
2. Matches the single-chat UX users are already familiar with
3. The leader's system prompt already guides it to be concise and user-facing

### Agent Identity

| Aspect | CC | AionUi |
|--------|----|--------|
| Child agent identity | Defined by `prompt` parameter (who, what, rules embedded in the task description) | Same — identity is in `prompt` |
| Teammate/member concept | None — CC's Agent tool has no "teammate" registry | None — removed `teammate`, `member_id` to align with CC |
| Agent type selection | N/A (single engine: Claude) | `agent_type` param selects engine (gemini, acp, codex, etc.) |

### System Prompt

| Aspect | CC | AionUi |
|--------|----|--------|
| Prompt source | `Dwt` (Dispatch Worker Template) — compiled into CC binary | `buildDispatchSystemPrompt()` — faithful adaptation of Dwt |
| Routing heuristics | start_task, start_code_task, send_message, read_transcript, list_sessions | Identical set |
| Tone guidance | "You're texting, not writing a report" | Identical |
| Constraints | Max concurrent tasks, no cross-task communication, max 2 retries | Identical |
| Tool prefix | Hardcoded `mcp__dispatch__` | Dynamic `toolPrefix` param (engine-dependent) |

---

## Response Format

Both use identical MCP content format:

```json
{
  "content": [{ "type": "text", "text": "..." }]
}
```

Error responses add `isError: true`.

`start_task` / `start_code_task` responses include a task list matching CC's format:

```
Task started.
session_id: {id}
title: {title}

Existing tasks:
  - {id} "{title}" (running)
  - {id} "{title}" (idle)
```

---

## Summary: What's Aligned vs What's Extended

### Fully aligned with CC (identical behavior)

- Tool names: `start_task`, `start_code_task`, `read_transcript`, `list_sessions`, `send_message`
- Core parameters: `prompt`, `title`, `session_id`, `message`, `limit`, `max_wait_seconds`, `format`
- Tool descriptions (copied from CC with minor adaptation)
- Response format (`content: [{ type: 'text', text }]`)
- System prompt structure and routing heuristics
- No teammate/member registry — agent identity lives in the prompt

### AionUi extensions (additive, CC-compatible)

| Extension | Purpose |
|-----------|---------|
| `agent_type` on start_task/start_code_task | Multi-engine: route child to Gemini, ACP, Codex, etc. |
| `model` on start_task | Multi-provider: override child's model (provider_id + model_name) |
| `workspace` on start_task/start_code_task | Multi-workspace: child can work in a different directory |
| HTTP MCP transport | Required for external CLI agents (vs CC's in-process dispatch) |
| Direct rendering (no send_user_message) | Simpler UX — leader text shown to user without explicit tool call |

### Intentionally removed (was in AionUi, not in CC)

| Removed | Reason |
|---------|--------|
| `teammate` param | CC has no teammate registry; agent identity is in prompt |
| `member_id` param | CC has no member concept |
| `allowedTools` param | CC has no tool allowlist for children |
| `stop_child` tool | CC has no explicit stop tool |
| `send_user_message` tool | AionUi uses direct rendering instead |
| `TemporaryTeammateConfig` type | Dead code after teammate removal |

---

## File Reference

| File | Role |
|------|------|
| `src/process/task/dispatch/DispatchMcpServer.ts` | Tool schemas + handler dispatch (CC's tool definitions live here) |
| `src/process/task/dispatch/DispatchHttpMcpServer.ts` | HTTP MCP server with Zod schema registration |
| `src/process/task/dispatch/dispatchPrompt.ts` | System prompt (adapted from CC's Dwt) |
| `src/process/task/dispatch/dispatchTypes.ts` | Type definitions for dispatch protocol |
| `src/process/task/dispatch/DispatchAgentManager.ts` | Orchestrator: creates children, monitors progress, relays results |
| `src/process/task/dispatch/permissionPolicy.ts` | Soft permission enforcement for dangerous tool calls |
