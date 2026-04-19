# Flowise API Control Playbook

This note is a local working guide for controlling Flowise directly through HTTP APIs, based on the documentation in this repository.

## Goal

Use Flowise as an API-first orchestration runtime instead of relying on the UI for daily operations.

The main use cases are:

- Run chatflows and agentflows from our own services
- Pass runtime data, files, and state into flows
- Manage flow definitions and supporting resources
- Operate RAG ingestion and refresh pipelines
- Support approval checkpoints and resumable runs

## Core Mental Model

Flowise has three main builder concepts:

- `Assistant`: higher-level assistant builder
- `Chatflow`: flexible single-agent and LLM flow builder
- `Agentflow`: orchestration builder for richer multi-step logic

From an API-control point of view, the most important distinction is not the builder name but the runtime pattern:

- Resource management APIs create or update saved objects
- Prediction APIs execute a saved flow
- Upsert and document store APIs manage knowledge ingestion

## Most Important Endpoints

### 1. Runtime execution

Primary endpoint:

- `POST /api/v1/prediction/:id`

Use this for:

- Standard chat requests
- Agentflow execution
- Streaming responses
- Session-based conversations
- File, image, and audio uploads
- Form-driven flow starts
- Human-in-the-loop resume actions

This is the main endpoint we should design around.

### 2. Flow management

Chatflow CRUD:

- `GET /api/v1/chatflows`
- `GET /api/v1/chatflows/:id`
- `GET /api/v1/chatflows/apikey/:apikey`
- `POST /api/v1/chatflows`
- `PUT /api/v1/chatflows/:id`
- `DELETE /api/v1/chatflows/:id`

Use these when we need to inspect, create, or update saved flow definitions.

### 3. Document Store management

Document store APIs are the preferred modern ingestion path.

Key endpoints:

- `GET /api/v1/document-store/store`
- `GET /api/v1/document-store/store/:id`
- `POST /api/v1/document-store/store`
- `PUT /api/v1/document-store/store/:id`
- `DELETE /api/v1/document-store/store/:id`
- `POST /api/v1/document-store/upsert/:id`
- `POST /api/v1/document-store/refresh/:id`
- `POST /api/v1/document-store/vectorstore/query`
- `GET /api/v1/document-store/chunks/:storeId/:loaderId/:pageNo`
- `PUT /api/v1/document-store/chunks/:storeId/:loaderId/:chunkId`
- `DELETE /api/v1/document-store/chunks/:storeId/:loaderId/:chunkId`

Use these for:

- Creating and maintaining knowledge bases
- Replacing or appending source files
- Refreshing remote or dynamic sources
- Inspecting and editing chunks
- Querying vectorized content directly

### 4. Legacy upsert endpoint

Older path:

- `POST /api/v1/vector/upsert/:id`

This still works for chatflow-based upsert pipelines, but the docs recommend Document Stores instead.

### 5. Supporting resources

Tools:

- `GET /api/v1/tools`
- `GET /api/v1/tools/:id`
- `POST /api/v1/tools`
- `PUT /api/v1/tools/:id`
- `DELETE /api/v1/tools/:id`

Variables:

- `GET /api/v1/variables`
- `POST /api/v1/variables`
- `PUT /api/v1/variables/:id`
- `DELETE /api/v1/variables/:id`

Messages, feedback, leads, attachments:

- `GET /api/v1/chatmessage/:id`
- `DELETE /api/v1/chatmessage/:id`
- `GET /api/v1/feedback/:id`
- `POST /api/v1/feedback`
- `PUT /api/v1/feedback/:id`
- `GET /api/v1/leads/:id`
- `POST /api/v1/leads`
- `POST /api/v1/attachments/:chatflowId/:chatId`

Operational checks:

- `GET /api/v1/ping`
- `GET /api/v1/upsert-history/:id`
- `PATCH /api/v1/upsert-history/:id`

## Runtime Request Shape

Canonical prediction body:

```json
{
  "question": "Your message here",
  "streaming": false,
  "overrideConfig": {},
  "history": [],
  "uploads": [],
  "form": {}
}
```

Important fields:

- `question`: normal user prompt
- `form`: form payload for Agentflow V2 Start nodes configured for form input
- `streaming`: SSE-style runtime behavior
- `overrideConfig`: dynamic runtime overrides
- `history`: explicit conversation context
- `uploads`: files, images, audio, and URLs
- `humanInput`: resume a halted run after approval or rejection

## Authentication Model

There are two different auth layers.

### App-level auth

This protects the Flowise application itself.

The docs describe a Passport.js and JWT cookie-based app login model. This matters mostly for dashboard access and admin operations.

### Flow-level auth

This protects specific chatflows and agentflows.

If a flow is assigned an API key, requests must include:

```http
Authorization: Bearer <flow-api-key>
```

This is the auth mode we should assume for direct runtime calls.

## Runtime Overrides and Security Gates

Some of the most useful API capabilities are disabled unless explicitly enabled in Flowise security settings.

Important examples:

- Config override must be enabled before `overrideConfig` can change runtime behavior
- Variable override must be enabled before `overrideConfig.vars` can replace saved variables

Implication:

- If an API call appears valid but Flowise ignores part of the payload, check the security settings before debugging the payload shape

## Variables Strategy

Flowise supports:

- Static variables stored in Flowise
- Runtime variables loaded from environment

Variables can also be overridden at runtime:

```json
{
  "overrideConfig": {
    "vars": {
      "tenantId": "acme",
      "plan": "pro"
    }
  }
}
```

Recommended use:

- Use saved variables for stable environment-level defaults
- Use runtime overrides for user, tenant, workspace, or request-specific data

## Session and Memory Strategy

For multi-turn interaction, use:

```json
{
  "overrideConfig": {
    "sessionId": "user-123"
  }
}
```

This is preferable to manually rebuilding history every time when the underlying flow memory is designed to track a session.

Use explicit `history` only when:

- Replaying a conversation from an external store
- Migrating history from another system
- Running stateless orchestration where we want full caller control

## Uploads Strategy

Prediction supports uploads for:

- Images
- Audio
- Files

Uploads can be:

- Direct base64 file payloads
- Public URLs

Use URL uploads when the asset is already hosted and stable. Use base64 only when the content is local or ephemeral.

## Human-in-the-Loop Model

When a flow pauses for approval, the response includes:

- `chatId`
- `executionId`
- `action`
- action metadata including button definitions and node id

To resume:

```json
{
  "chatId": "existing-chat-id",
  "humanInput": {
    "type": "proceed",
    "startNodeId": "humanInputAgentflow_0",
    "feedback": ""
  }
}
```

This means Flowise supports approval checkpoints cleanly through API without rebuilding the run ourselves.

## Recommended Ingestion Path

Prefer Document Stores over legacy chatflow upsert.

Reasons:

- Cleaner resource model
- Chunk inspection and editing
- Refresh support
- Better fit for reusable knowledge bases
- Better operational lifecycle for multiple loaders and datasets

Only use `vector/upsert` when we are intentionally operating an older chatflow-based ingestion design.

## Agentflow V2 Concepts That Matter for API Control

Agentflow V2 introduces:

- Explicit Start, LLM, Agent, Tool, Retriever, HTTP, Condition, Iteration, Loop, Human Input, Direct Reply, Custom Function, and Execute Flow nodes
- Shared runtime state via `$flow.state`
- More direct control of orchestration semantics

What matters for us:

- A prediction request can start a complex workflow, not just a chat exchange
- Inputs may be `question` or `form`
- Runtime outcomes may branch, loop, or pause for approval
- Flow state is configured in the saved flow, but influenced by runtime payloads and overrides

## Known Documentation Gaps

The local docs are strong on examples and endpoint coverage, but a few gaps matter:

- `assistants.md` contains broken embedded links
- Many API pages point to an embedded OpenAPI spec instead of showing inline schemas
- Some advanced node config details are easier to understand from the UI than from markdown alone

Implication:

- For production integration, we should still verify exact payload shapes against the running instance

## Recommended Operating Pattern for This Project

1. Treat `prediction` as the main public runtime contract
2. Use flow-level bearer auth for all direct execution calls
3. Prefer Document Stores for knowledge ingestion
4. Use runtime `sessionId` and `vars` instead of cloning flows per user
5. Keep saved flows stable and push request-specific behavior through payloads
6. Use human-in-the-loop resume instead of custom pause-state machinery
7. Verify security toggles before depending on overrides

## What To Build Next

The next practical layer should be a small internal reference with:

- Ready-to-use curl commands
- JavaScript fetch examples
- Standard payload templates
- A short checklist for diagnosing auth, override, and ingestion failures

That companion reference lives in `api-examples.md`.
