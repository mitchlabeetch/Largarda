# Message Flow: Renderer → Main → Agent

## Overview

End-to-end flow of a chat message from user input through the renderer, main process, agent execution, and back to the UI.

## Flow Diagram

```
┌──────────────┐
│   Renderer   │
│   (User UI)  │
└──────┬───────┘
       │ 1. User types message
       │ 2. Send to backend
┌──────▼──────────────────────┐
│   Preload (IPC Bridge)      │
│   - Expose safe API         │
│   - Send via ipcRenderer    │
└──────┬──────────────────────┘
       │ 3. IPC invoke
┌──────▼──────────────────────┐
│   Main Process              │
│   - conversationBridge      │
│   - ConversationService     │
└──────┬──────────────────────┘
       │ 4. Create message
       │ 5. Store in database
┌──────▼──────────────────────┐
│   Database (SQLite)         │
│   - Persist message         │
│   - Update conversation     │
└──────┬──────────────────────┘
       │ 6. Message stored
┌──────▼──────────────────────┐
│   Main Process              │
│   - Agent orchestration     │
│   - Build agent context     │
└──────┬──────────────────────┘
       │ 7. Send to agent
┌──────▼──────────────────────┐
│   Agent Service             │
│   - Select agent type       │
│   - Prepare prompt          │
└──────┬──────────────────────┘
       │ 8. Call AI provider
┌──────▼──────────────────────┐
│   AI Client (common/api)    │
│   - Anthropic/OpenAI/Gemini │
│   - Protocol conversion     │
└──────┬──────────────────────┘
       │ 9. API request
┌──────▼──────────────────────┐
│   External AI Provider      │
│   - Generate response       │
│   - Stream tokens           │
└──────┬──────────────────────┘
       │ 10. Response
┌──────▼──────────────────────┐
│   AI Client                 │
│   - Parse response          │
│   - Convert protocol        │
└──────┬──────────────────────┘
       │ 11. Agent response
┌──────▼──────────────────────┐
│   Main Process              │
│   - Store assistant message │
│   - Emit update event       │
└──────┬──────────────────────┘
       │ 12. IPC event
┌──────▼──────────────────────┐
│   Preload                   │
│   - Receive event           │
└──────┬──────────────────────┘
       │ 13. Callback
┌──────▼──────────────────────┐
│   Renderer                  │
│   - Update UI               │
│   - Display message         │
└─────────────────────────────┘
```

## Detailed Steps

### Step 1-2: User Input

```typescript
// Renderer: src/renderer/components/chat/sendbox.tsx
const handleSend = async () => {
  const message = inputRef.current.value;
  await window.electronAPI.conversation.sendMessage({
    conversationId,
    content: message,
  });
};
```

### Step 3-5: IPC and Storage

```typescript
// Preload: src/preload/main.ts
contextBridge.exposeInMainWorld('electronAPI', {
  conversation: {
    sendMessage: (params) => ipcRenderer.invoke('conversation:sendMessage', params)
  }
})

// Main Bridge: src/process/bridge/conversationBridge.ts
ipcMain.handle('conversation:sendMessage', async (event, params) => {
  const service = getConversationService()
  return await service.sendMessage(params)
})

// Service: src/process/services/ConversationServiceImpl.ts
async sendMessage(params) {
  const message = {
    role: 'user',
    content: params.content,
    timestamp: Date.now()
  }
  await this.repository.save(message)
  return message
}
```

### Step 6-7: Agent Orchestration

```typescript
// Service: src/process/services/ConversationServiceImpl.ts
async sendMessage(params) {
  // Save user message
  await this.saveUserMessage(params)

  // Trigger agent response
  const agent = this.getAgent(params.agentId)
  const context = await this.buildContext(params.conversationId)
  const response = await agent.generateResponse(context)

  // Save assistant message
  await this.saveAssistantMessage(response)

  return response
}
```

### Step 8-9: AI Provider Call

```typescript
// Agent: src/process/agent/gemini/
async generateResponse(context) {
  const client = ClientFactory.create('gemini', config)
  const response = await client.chat.completions.create({
    messages: context.messages,
    model: 'gemini-pro',
    stream: true
  })
  return response
}

// Client: src/common/api/
const response = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  messages: messages,
  stream: true
})
```

### Step 10-12: Response Handling

```typescript
// Agent
async generateResponse(context) {
  const stream = await client.chat.completions.create({...})

  // Process streaming response
  for await (const chunk of stream) {
    // Emit streaming event
    mainWindow.webContents.send('conversation:streaming', {
      conversationId: context.conversationId,
      content: chunk.content
    })
  }
}

// Main Bridge
function emitStreamingUpdate(conversationId, content) {
  mainWindow.webContents.send('conversation:streaming', {
    conversationId,
    content
  })
}
```

### Step 13: UI Update

```typescript
// Preload
contextBridge.exposeInMainWorld('electronAPI', {
  onConversationStreaming: (callback) => {
    ipcRenderer.on('conversation:streaming', (event, data) => {
      callback(data);
    });
  },
});

// Renderer
useEffect(() => {
  const unsubscribe = window.electronAPI.onConversationStreaming((data) => {
    if (data.conversationId === currentConversationId) {
      appendStreamingContent(data.content);
    }
  });
  return unsubscribe;
}, [currentConversationId]);
```

## Streaming Flow

For streaming responses, the flow is slightly different:

```
1. Agent starts streaming
2. Each chunk sent via IPC event
3. Renderer updates UI incrementally
4. Final message stored when complete
```

### Streaming Implementation

```typescript
// Agent
for await (const chunk of stream) {
  // Send chunk to renderer
  event.sender.send('conversation:chunk', {
    conversationId,
    content: chunk.delta.content,
  });
}

// Renderer - accumulate chunks
let streamingContent = '';
window.electronAPI.onConversationChunk((data) => {
  streamingContent += data.content;
  updateMessageDisplay(streamingContent);
});

// On stream complete
window.electronAPI.onConversationComplete((data) => {
  saveCompleteMessage(data.fullContent);
});
```

## Error Handling Flow

```typescript
try {
  // Agent execution
  const response = await agent.generateResponse(context);
} catch (error) {
  // Log error
  logger.error('Agent error', error);

  // Store error message
  await this.saveErrorMessage(error);

  // Notify renderer
  mainWindow.webContents.send('conversation:error', {
    conversationId,
    error: error.message,
  });
}
```

## Related Documentation

- [src/common/api/](../../src/common/api/) - AI client implementations
- [src/process/bridge/conversationBridge.ts](../../src/process/bridge/conversationBridge.ts) - Conversation bridge
- [src/process/services/ConversationServiceImpl.ts](../../src/process/services/ConversationServiceImpl.ts) - Conversation service
- [docs/data-flows/ipc-communication.md](./ipc-communication.md) - IPC patterns
