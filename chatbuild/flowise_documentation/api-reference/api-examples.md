# Flowise API Examples

This file is a practical companion to `api-control-playbook.md`.

Use these examples as starting points for direct API control.

## Conventions

Assume:

- Base URL: `http://localhost:3000`
- Flow ID: `your-flow-id`
- Flow API key: `your-flow-api-key`
- Document Store ID: `your-doc-store-id`
- Document Loader ID: `your-doc-loader-id`

Headers:

```http
Content-Type: application/json
Authorization: Bearer your-flow-api-key
```

## 1. Health Check

### cURL

```bash
curl "http://localhost:3000/api/v1/ping"
```

### JavaScript

```ts
const response = await fetch('http://localhost:3000/api/v1/ping');
const result = await response.json();
console.log(result);
```

## 2. Basic Prediction Request

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "question": "Summarize the purpose of this flow",
    "streaming": false
  }'
```

### JavaScript

```ts
const response = await fetch('http://localhost:3000/api/v1/prediction/your-flow-id', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-flow-api-key',
  },
  body: JSON.stringify({
    question: 'Summarize the purpose of this flow',
    streaming: false,
  }),
});

const result = await response.json();
console.log(result);
```

## 3. Prediction With Session Memory

Use this when the saved flow should remember a conversation across calls.

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "question": "Continue our conversation",
    "overrideConfig": {
      "sessionId": "user-123"
    }
  }'
```

### JavaScript

```ts
const payload = {
  question: 'Continue our conversation',
  overrideConfig: {
    sessionId: 'user-123',
  },
};

const response = await fetch('http://localhost:3000/api/v1/prediction/your-flow-id', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-flow-api-key',
  },
  body: JSON.stringify(payload),
});

console.log(await response.json());
```

## 4. Prediction With Runtime Variables

Use this when the flow reads `vars` at runtime and override support is enabled.

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "question": "Prepare the account summary",
    "overrideConfig": {
      "vars": {
        "tenantId": "acme",
        "locale": "fr-FR",
        "plan": "enterprise"
      }
    }
  }'
```

### JavaScript

```ts
const payload = {
  question: 'Prepare the account summary',
  overrideConfig: {
    vars: {
      tenantId: 'acme',
      locale: 'fr-FR',
      plan: 'enterprise',
    },
  },
};

const response = await fetch('http://localhost:3000/api/v1/prediction/your-flow-id', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-flow-api-key',
  },
  body: JSON.stringify(payload),
});

console.log(await response.json());
```

## 5. Prediction With Explicit History

Use this when the caller owns history and wants a stateless server interaction.

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "question": "What should I do next?",
    "history": [
      {
        "role": "userMessage",
        "content": "I need help planning a migration"
      },
      {
        "role": "apiMessage",
        "content": "We should first inventory the current system."
      }
    ]
  }'
```

## 6. Form-Based Agentflow Start

Use this when the Start node expects `form` input instead of `question`.

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "form": {
      "title": "Quarterly Review",
      "department": "Product",
      "priority": "high"
    }
  }'
```

### JavaScript

```ts
const response = await fetch('http://localhost:3000/api/v1/prediction/your-flow-id', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-flow-api-key',
  },
  body: JSON.stringify({
    form: {
      title: 'Quarterly Review',
      department: 'Product',
      priority: 'high',
    },
  }),
});

console.log(await response.json());
```

## 7. Image Upload by Public URL

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "question": "Describe this screenshot",
    "uploads": [
      {
        "data": "https://example.com/screenshot.png",
        "type": "url",
        "name": "screenshot.png",
        "mime": "image/png"
      }
    ]
  }'
```

## 8. Audio Upload by Public URL

### cURL

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "question": "Transcribe this meeting and list action items",
    "uploads": [
      {
        "data": "https://example.com/meeting.mp3",
        "type": "url",
        "name": "meeting.mp3",
        "mime": "audio/mpeg"
      }
    ]
  }'
```

## 9. Human-in-the-Loop Resume

When a prediction response returns an `action`, keep the `chatId` and the human input node id.

### Approve

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "chatId": "returned-chat-id",
    "humanInput": {
      "type": "proceed",
      "startNodeId": "humanInputAgentflow_0",
      "feedback": ""
    }
  }'
```

### Reject With Feedback

```bash
curl -X POST "http://localhost:3000/api/v1/prediction/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "chatId": "returned-chat-id",
    "humanInput": {
      "type": "reject",
      "startNodeId": "humanInputAgentflow_0",
      "feedback": "Do not call the external system yet."
    }
  }'
```

## 10. List Chatflows

### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/chatflows" \
  -H "Authorization: Bearer your-flow-api-key"
```

### JavaScript

```ts
const response = await fetch('http://localhost:3000/api/v1/chatflows', {
  headers: {
    Authorization: 'Bearer your-flow-api-key',
  },
});

console.log(await response.json());
```

## 11. Get a Chatflow

```bash
curl -X GET "http://localhost:3000/api/v1/chatflows/your-flow-id" \
  -H "Authorization: Bearer your-flow-api-key"
```

## 12. Create a Variable

```bash
curl -X POST "http://localhost:3000/api/v1/variables" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "name": "tenantId",
    "type": "static",
    "value": "default-tenant"
  }'
```

## 13. List Tools

```bash
curl -X GET "http://localhost:3000/api/v1/tools" \
  -H "Authorization: Bearer your-flow-api-key"
```

## 14. Query a Document Store Vector Index

Use this for direct retrieval testing outside a full flow run.

```bash
curl -X POST "http://localhost:3000/api/v1/document-store/vectorstore/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "storeId": "your-doc-store-id",
    "query": "What are the cancellation terms?"
  }'
```

## 15. List Document Stores

```bash
curl -X GET "http://localhost:3000/api/v1/document-store/store" \
  -H "Authorization: Bearer your-flow-api-key"
```

## 16. Upsert a File Into a Document Store

Use multipart form data for file-based loaders.

```bash
curl -X POST "http://localhost:3000/api/v1/document-store/upsert/your-doc-store-id" \
  -H "Authorization: Bearer your-flow-api-key" \
  -F "files=@./knowledge-base.pdf" \
  -F "docId=your-doc-loader-id"
```

### Replace existing loader content

```bash
curl -X POST "http://localhost:3000/api/v1/document-store/upsert/your-doc-store-id" \
  -H "Authorization: Bearer your-flow-api-key" \
  -F "files=@./knowledge-base-v2.pdf" \
  -F "docId=your-doc-loader-id" \
  -F "replaceExisting=true"
```

### Override loader config during upsert

```bash
curl -X POST "http://localhost:3000/api/v1/document-store/upsert/your-doc-store-id" \
  -H "Authorization: Bearer your-flow-api-key" \
  -F "files=@./knowledge-base.pdf" \
  -F "docId=your-doc-loader-id" \
  -F 'loader={"config":{"usage":"perPage"}}'
```

## 17. Refresh a Document Store

Use this to re-process all loaders or selected loaders.

### Refresh whole store

```bash
curl -X POST "http://localhost:3000/api/v1/document-store/refresh/your-doc-store-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key"
```

### Refresh one loader with splitter override

```bash
curl -X POST "http://localhost:3000/api/v1/document-store/refresh/your-doc-store-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "items": [
      {
        "docId": "your-doc-loader-id",
        "splitter": {
          "name": "recursiveCharacterTextSplitter",
          "config": {
            "chunkSize": 2000,
            "chunkOverlap": 100
          }
        }
      }
    ]
  }'
```

## 18. Legacy Chatflow Upsert

Use only for older upsert chatflows.

### File-based legacy upsert

```bash
curl -X POST "http://localhost:3000/api/v1/vector/upsert/your-flow-id" \
  -H "Authorization: Bearer your-flow-api-key" \
  -F "files=@./knowledge-base.pdf" \
  -F 'overrideConfig={"chunkSize":1000,"chunkOverlap":200}'
```

### JSON-based legacy upsert

```bash
curl -X POST "http://localhost:3000/api/v1/vector/upsert/your-flow-id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-flow-api-key" \
  -d '{
    "overrideConfig": {
      "chunkSize": 800,
      "chunkOverlap": 100
    }
  }'
```

## 19. Quick Failure Checklist

If an API call does not behave as expected, check these in order:

1. Wrong flow or document store id
2. Missing or wrong bearer API key
3. Flow security settings disabling `overrideConfig`
4. Variable override disabled in Flowise security settings
5. Wrong request shape for `question` versus `form`
6. File upload sent as JSON instead of multipart form data
7. Loader and file type mismatch
8. Embedding and vector store dimension mismatch
9. Human resume request missing `chatId` or `startNodeId`
10. Flow node misconfiguration causing server-side 500 errors

## 20. Recommended Minimal Integration Contract

For our own integrations, the minimum useful contract should support:

- `prediction`
- `sessionId`
- `vars`
- `form`
- `uploads`
- `humanInput`
- document store `upsert`
- document store `refresh`

Everything else can be added after we verify the live instance schemas.
