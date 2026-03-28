import { describe, it, expect } from 'vitest';
import { transformMessage } from '@/common/chat/chatLib';
import type { IResponseMessage } from '@/common/adapter/ipcBridge';

const makeMessage = (type: string, data: unknown = ''): IResponseMessage => ({
  type,
  data,
  msg_id: 'test-msg-id',
  conversation_id: 'test-conv-id',
});

describe('transformMessage', () => {
  it('transforms an error message into a tips message', () => {
    const result = transformMessage(makeMessage('error', 'something went wrong'));
    expect(result).toBeDefined();
    expect(result!.type).toBe('tips');
  });

  it('returns undefined for info type (stream retry notifications)', () => {
    const result = transformMessage(makeMessage('info', 'Stream interrupted, retrying...'));
    expect(result).toBeUndefined();
  });

  it('returns undefined for other transient types', () => {
    const transientTypes = [
      'start',
      'finish',
      'thought',
      'system',
      'available_commands',
      'acp_model_info',
      'codex_model_info',
      'acp_context_usage',
      'request_trace',
    ];
    for (const type of transientTypes) {
      const result = transformMessage(makeMessage(type));
      expect(result, `expected undefined for type '${type}'`).toBeUndefined();
    }
  });

  it('logs a warning for unknown message types', () => {
    const result = transformMessage(makeMessage('totally_unknown_type'));
    expect(result).toBeUndefined();
  });
});
