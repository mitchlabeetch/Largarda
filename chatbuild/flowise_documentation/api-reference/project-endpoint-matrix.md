# AionUi Flowise Project Endpoint Matrix

This document maps the generic Flowise API surface to the endpoints and behaviors that AionUi currently uses in its own codebase.

It is based on the repo implementation, not just the upstream Flowise docs.

## Runtime Profile

- Default Flowise base URL: `http://localhost:3000`
- Default auth mode: optional Bearer API key
- Default timeout: `60000`
- Retry policy: `3` attempts with exponential backoff
- Current integration style: direct REST over `fetch`, with SSE-style event parsing for streaming responses

## Verified Live Instance

Live verification completed on `2026-04-19` against the Flowise instance the user provided.

- Verified base URL: `https://filo.manuora.fr`
- Verified auth mode: `Authorization: Bearer <token>`
- Verified result: `GET /api/v1/chatflows` succeeds with bearer auth
- Token handling note: keep the token masked in all docs and code samples unless you are injecting it from a secret store

Verified objects returned by the live instance:

| ID | Name | Type | Deployed | Public | Updated |
| --- | --- | --- | --- | --- | --- |
| `697004ac-f76a-4400-bb61-7afb42a65c39` | `Company_Look_Up` | `AGENTFLOW` | `false` | `false` | `2026-04-19T04:58:23.000Z` |
| `2ab0be12-f65c-4c0e-8f4d-7dd36fa599e2` | `Largo` | `ASSISTANT` | unknown | unknown | `2026-04-19T03:56:22.000Z` |
| `3a668c37-e508-4e72-8d6e-826f18efa00c` | `Largo Cherche` | `AGENTFLOW` | `false` | `false` | `2026-04-12T13:11:42.000Z` |

Interpretation:

- The live tenant is not empty.
- The project can now stop treating `flowId` as purely theoretical.
- The two immediately testable agentflow targets are `Company_Look_Up` and `Largo Cherche`.
- There is also an assistant object named `Largo`, but the current AionUi integration is written around chatflow/agentflow prediction endpoints, not assistant-specific handling.

Primary sources in this repo:

- `src/common/ma/constants.ts`
- `src/process/agent/flowise/FloWiseConnection.ts`
- `src/process/agent/flowise/FloWiseAgentManager.ts`
- `src/process/bridge/maBridge.ts`
- `src/common/ma/types.ts`
- `src/process/services/database/migrations.ts`

## Effective Configuration Model

The Flowise connection is created from `FloWiseAgentManagerData` and then normalized by `createFloWiseConnection(...)`.

Current runtime inputs:

- `baseUrl?`
- `apiKey?`
- `flowId`
- `conversation_id`
- `workspace?`
- `dealContext?`
- `yoloMode?`

Important detail:

- `flowId` is required at agent-manager level, but it is not hardcoded globally in the repo.
- That means this project does not yet define a fixed catalog of target Flowise flows in code.
- Instead, a caller must supply the `flowId` at runtime.

## Endpoint Matrix

| Endpoint | Method | Status in AionUi | Current Use | Auth | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/prediction/:flowId` | `POST` | Active | Execute a Flowise flow and get a final result | Optional Bearer token | Used by `executeFlow(...)` |
| `/api/v1/prediction/:flowId` | `POST` | Active | Stream flow execution events and final result | Optional Bearer token | Used by `streamFlow(...)` |
| `/api/v1/chatflows` | `GET` | Active | List available flows | Optional Bearer token | Also used as health check |
| `/api/v1/chatflows/:flowId` | `GET` | Active | Fetch one flow definition/metadata | Optional Bearer token | Used by `getFlow(...)` |
| `/api/v1/vector/upsert` | unknown | Declared only | Not wired | Unknown | Present in constants only |
| `/api/v1/vector/query` | unknown | Declared only | Not wired | Unknown | Present in constants only |
| `/api/v2/agentflows` | unknown | Declared only | Not wired | Unknown | Present in constants only |

## Actual Request Shapes

### 1. Non-streaming execution

Current request body sent by `FloWiseConnection.executeFlow(...)`:

```json
{
  "question": "user message",
  "overrideConfig": {}
}
```

Notes:

- Only `question` and `overrideConfig` are serialized today.
- `FlowInput.context` and `FlowInput.documents` exist in shared types, but are not currently sent by the connection layer.

### 2. Streaming execution

Current request body sent by `FloWiseConnection.streamFlow(...)`:

```json
{
  "question": "user message",
  "overrideConfig": {},
  "stream": true
}
```

Important project-specific note:

- Upstream Flowise docs often show `streaming: true`.
- AionUi currently sends `stream: true`.
- Any live-instance validation should confirm which flag the deployed Flowise server actually expects.

## Response/Event Mapping

The streaming parser converts Flowise event names into AionUi agent events.

| Flowise event | AionUi event | Meaning |
| --- | --- | --- |
| `token` | `token` | Token stream to UI |
| `metadata` | `node_start` | Node start-ish lifecycle signal |
| `usedTools` | `tool_call` | Tool usage surfaced to agent UI |
| `sourceDocuments` | `node_end` | Retrieval/source completion-ish signal |
| `agentReasoning` | `tool_call` | Reasoning/tool-like activity |
| `error` | `error` | Error surfaced to UI |
| `complete` | `complete` | Final parsed flow result |

Final parsed result shape:

```ts
type FlowResult = {
  text: string;
  artifacts?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};
```

## Auth Model

Current header behavior:

- Always sends `Content-Type: application/json`
- Sends `Authorization: Bearer <apiKey>` only if `apiKey` is provided

This means the project currently supports:

- unauthenticated local Flowise usage
- authenticated Flowise usage through a bearer key

It does not currently implement:

- API key rotation
- token refresh
- separate auth discovery
- app-level Flowise auth negotiation

## Health Check Behavior

The current health check is:

- `GET /api/v1/chatflows`

Interpretation:

- If chatflow listing succeeds, the Flowise backend is treated as healthy.
- This is a practical minimal probe, but it is not a deep runtime verification of prediction or streaming behavior.

## Flow Ownership in the App

There is no single hardcoded M&A flow registry yet.

Current signs of intended ownership:

- `flowId` exists on analysis-domain types
- `flowId` exists on Flowise session types
- `ma_flowise_sessions` persistence is already in the database schema

Session table:

- `id`
- `conversation_id`
- `flow_id`
- `deal_id`
- `session_key`
- `config`
- `created_at`

This shows the planned model is:

- one app conversation may be linked to a Flowise session
- that session should know which `flow_id` it is attached to
- deal context can be associated through `deal_id`

With the verified live tenant, the strongest near-term registry candidates are:

- `697004ac-f76a-4400-bb61-7afb42a65c39` for `Company_Look_Up`
- `3a668c37-e508-4e72-8d6e-826f18efa00c` for `Largo Cherche`

## Current Gaps Versus Broader Flowise Capability

The generic Flowise docs support much more than the current AionUi integration. In this repo, the following are not yet wired even though some are anticipated by types or constants:

- document-store APIs
- vector upsert/query APIs
- variables APIs
- tools APIs
- attachments APIs
- feedback APIs
- leads APIs
- chat history APIs
- Agentflow V2-specific orchestration endpoints
- human-in-the-loop resume back into Flowise

There is also a local-vs-remote gap:

- AionUi already has local confirmation UX for tool approval
- but `FloWiseAgentManager.confirm(...)` does not yet send a resume/approval payload back to Flowise

## What Is Real Today

If we operate Flowise through this codebase today, the reliable, implemented contract is:

1. Supply a `flowId`
2. Optionally supply `baseUrl` and `apiKey`
3. Send plain user text as `question`
4. Optionally send `overrideConfig`
5. Execute or stream via `/api/v1/prediction/:flowId`
6. Discover flows or check health via `/api/v1/chatflows`

## What Is Planned But Incomplete

These parts appear designed but unfinished:

1. Persisting real Flowise sessions behind `ma.flowiseSession.*`
2. Feeding deal context into Flowise in a structured way
3. Passing documents or retrieval context into Flowise requests
4. Resuming Flowise runs after user confirmation
5. Managing a real catalog of M&A-specific flow IDs

## Recommended Next Build Steps

For direct API control in this project, the clean order is:

1. Add a Flowise config source of truth for `baseUrl`, `apiKey`, and named flow IDs
2. Implement `FlowiseSessionRepository` and wire the existing IPC placeholders
3. Decide whether this app should standardize on `stream` or `streaming`
4. Serialize `dealContext` into `overrideConfig` or another agreed Flowise input contract
5. Add document-store or vector upsert/query integration only after the basic flow/session path is stable

## Bottom Line

AionUi currently has a focused Flowise integration, not a full-platform integration.

The true endpoint surface in production terms is:

- `POST /api/v1/prediction/:flowId`
- `GET /api/v1/chatflows`
- `GET /api/v1/chatflows/:flowId`

Everything else is either planned, typed, or documented upstream, but not yet active in the repo.
