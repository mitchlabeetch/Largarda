/**
 * Integration tests for the Flowise env-var fallback and readiness probe.
 *
 * Exercises `resolveFlowiseConfig`, `createFloWiseConnection` and
 * `probeFlowiseReadiness` with a mocked `fetch` so no network calls are
 * made. Also regression-covers the argument precedence contract so we
 * never accidentally let the env override an explicit caller-supplied
 * API key.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLOWISE_PRODUCTION_URL } from '../../src/common/ma/constants';
import {
  FLOWISE_ENV,
  createFloWiseConnection,
  probeFlowiseReadiness,
  resolveFlowiseConfig,
} from '../../src/process/agent/flowise/FloWiseConnection';

const ORIGINAL_ENV = { ...process.env };

function clearFlowiseEnv(): void {
  delete process.env[FLOWISE_ENV.baseUrl];
  delete process.env[FLOWISE_ENV.apiKey];
}

beforeEach(() => {
  clearFlowiseEnv();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

// ============================================================================
// resolveFlowiseConfig
// ============================================================================

describe('resolveFlowiseConfig', () => {
  it('defaults to FLOWISE_PRODUCTION_URL and apiKeySource="none" when nothing is set', () => {
    const resolved = resolveFlowiseConfig();
    expect(resolved.baseUrl).toBe(FLOWISE_PRODUCTION_URL);
    expect(resolved.apiKey).toBeUndefined();
    expect(resolved.apiKeySource).toBe('none');
  });

  it('reads baseUrl and apiKey from env when no args are given', () => {
    process.env[FLOWISE_ENV.baseUrl] = 'https://env.flowise.test';
    process.env[FLOWISE_ENV.apiKey] = 'env-key';

    const resolved = resolveFlowiseConfig();
    expect(resolved.baseUrl).toBe('https://env.flowise.test');
    expect(resolved.apiKey).toBe('env-key');
    expect(resolved.apiKeySource).toBe('env');
  });

  it('prefers explicit args over env (apiKeySource="arg")', () => {
    process.env[FLOWISE_ENV.baseUrl] = 'https://env.flowise.test';
    process.env[FLOWISE_ENV.apiKey] = 'env-key';

    const resolved = resolveFlowiseConfig({ baseUrl: 'https://arg.flowise.test', apiKey: 'arg-key' });
    expect(resolved.baseUrl).toBe('https://arg.flowise.test');
    expect(resolved.apiKey).toBe('arg-key');
    expect(resolved.apiKeySource).toBe('arg');
  });

  it('treats empty-string env values as unset (no accidental empty bearer)', () => {
    process.env[FLOWISE_ENV.apiKey] = '';
    const resolved = resolveFlowiseConfig();
    expect(resolved.apiKey).toBeUndefined();
    expect(resolved.apiKeySource).toBe('none');
  });
});

// ============================================================================
// createFloWiseConnection (smoke — just verifies wiring, behaviour covered via probeFlowiseReadiness)
// ============================================================================

describe('createFloWiseConnection', () => {
  it('returns a connection instance that uses the resolved config', () => {
    process.env[FLOWISE_ENV.apiKey] = 'env-key';
    const conn = createFloWiseConnection();
    expect(conn).toBeDefined();
    // healthCheck is the simplest public surface; we just verify it exists
    // (full behaviour is covered by the probe tests below).
    expect(typeof conn.healthCheck).toBe('function');
  });
});

// ============================================================================
// probeFlowiseReadiness
// ============================================================================

type FetchCall = [input: string | URL, init?: RequestInit];

function makeResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `HTTP ${status}`,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('probeFlowiseReadiness', () => {
  it('happy path: pingOk + authOk + flowCount with apiKeySource="arg"', async () => {
    const fetchMock = vi.fn(async (_url: string | URL): Promise<Response> => {
      const url = String(_url);
      if (url.endsWith('/api/v1/ping')) return makeResponse(200, 'pong');
      if (url.endsWith('/api/v1/chatflows')) return makeResponse(200, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeFlowiseReadiness({ baseUrl: 'https://f.test', apiKey: 'arg-key' });

    expect(result.baseUrl).toBe('https://f.test');
    expect(result.hasApiKey).toBe(true);
    expect(result.apiKeySource).toBe('arg');
    expect(result.pingOk).toBe(true);
    expect(result.authOk).toBe(true);
    expect(result.flowCount).toBe(3);
    expect(result.error).toBeUndefined();
    expect(result.checkedAt).toBeGreaterThan(0);
  });

  it('skips the auth probe when no key is available', async () => {
    const calls: FetchCall[] = [];
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit): Promise<Response> => {
      calls.push([input, init]);
      return makeResponse(200, 'pong');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeFlowiseReadiness({ baseUrl: 'https://f.test' });

    expect(result.hasApiKey).toBe(false);
    expect(result.apiKeySource).toBe('none');
    expect(result.pingOk).toBe(true);
    expect(result.authOk).toBeUndefined();
    expect(result.flowCount).toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(String(calls[0][0])).toMatch(/\/api\/v1\/ping$/);
  });

  it('records auth failure as authOk=false with a short error', async () => {
    const fetchMock = vi.fn(async (_url: string | URL): Promise<Response> => {
      const url = String(_url);
      if (url.endsWith('/api/v1/ping')) return makeResponse(200, 'pong');
      return makeResponse(401, { error: 'Unauthorized Access' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeFlowiseReadiness({ baseUrl: 'https://f.test', apiKey: 'bad-key' });

    expect(result.pingOk).toBe(true);
    expect(result.authOk).toBe(false);
    expect(result.error).toBe('auth 401');
    expect(result.flowCount).toBeUndefined();
  });

  it('never throws on ping network failure; reports pingOk=false with error', async () => {
    const fetchMock = vi.fn(async (): Promise<Response> => {
      throw new TypeError('fetch failed');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeFlowiseReadiness({ baseUrl: 'https://f.test', apiKey: 'arg-key' });

    expect(result.pingOk).toBe(false);
    expect(result.authOk).toBeUndefined();
    expect(result.error).toContain('ping');
    expect(result.error).toContain('fetch failed');
  });

  it('strips a trailing slash on baseUrl before building URLs', async () => {
    const calls: FetchCall[] = [];
    const fetchMock = vi.fn(async (input: string | URL): Promise<Response> => {
      calls.push([input]);
      if (String(input).endsWith('/api/v1/ping')) return makeResponse(200, 'pong');
      return makeResponse(200, []);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeFlowiseReadiness({ baseUrl: 'https://f.test/', apiKey: 'k' });
    expect(result.baseUrl).toBe('https://f.test');
    expect(String(calls[0][0])).toBe('https://f.test/api/v1/ping');
    expect(String(calls[1][0])).toBe('https://f.test/api/v1/chatflows');
  });
});
