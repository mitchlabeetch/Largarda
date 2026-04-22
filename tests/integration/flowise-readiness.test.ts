/**
 * Integration tests for the Flowise env-var fallback, settings layer, and readiness probe.
 *
 * Exercises `resolveFlowiseConfig`, `resolveFlowiseConfigSync`, `createFloWiseConnection`,
 * `createFloWiseConnectionSync`, and `probeFlowiseReadiness` with a mocked `fetch` so no
 * network calls are made. Also regression-covers the argument precedence contract so we
 * never accidentally let the env override an explicit caller-supplied API key.
 *
 * Tests cover:
 * - Settings coverage: settings are read and applied correctly
 * - Readiness coverage: health probe works end-to-end
 * - Config precedence coverage: settings > args > env > default
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLOWISE_PRODUCTION_URL } from '../../src/common/ma/constants';
import {
  FLOWISE_ENV,
  createFloWiseConnection,
  createFloWiseConnectionSync,
  probeFlowiseReadiness,
  resolveFlowiseConfig,
  resolveFlowiseConfigSync,
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
// resolveFlowiseConfigSync (backward compatibility)
// ============================================================================

describe('resolveFlowiseConfigSync', () => {
  it('defaults to FLOWISE_PRODUCTION_URL and apiKeySource="none" when nothing is set', () => {
    const resolved = resolveFlowiseConfigSync();
    expect(resolved.baseUrl).toBe(FLOWISE_PRODUCTION_URL);
    expect(resolved.apiKey).toBeUndefined();
    expect(resolved.apiKeySource).toBe('none');
  });

  it('reads baseUrl and apiKey from env when no args are given', () => {
    process.env[FLOWISE_ENV.baseUrl] = 'https://env.flowise.test';
    process.env[FLOWISE_ENV.apiKey] = 'env-key';

    const resolved = resolveFlowiseConfigSync();
    expect(resolved.baseUrl).toBe('https://env.flowise.test');
    expect(resolved.apiKey).toBe('env-key');
    expect(resolved.apiKeySource).toBe('env');
  });

  it('prefers explicit args over env (apiKeySource="arg")', () => {
    process.env[FLOWISE_ENV.baseUrl] = 'https://env.flowise.test';
    process.env[FLOWISE_ENV.apiKey] = 'env-key';

    const resolved = resolveFlowiseConfigSync({ baseUrl: 'https://arg.flowise.test', apiKey: 'arg-key' });
    expect(resolved.baseUrl).toBe('https://arg.flowise.test');
    expect(resolved.apiKey).toBe('arg-key');
    expect(resolved.apiKeySource).toBe('arg');
  });

  it('treats empty-string env values as unset (no accidental empty bearer)', () => {
    process.env[FLOWISE_ENV.apiKey] = '';
    const resolved = resolveFlowiseConfigSync();
    expect(resolved.apiKey).toBeUndefined();
    expect(resolved.apiKeySource).toBe('none');
  });
});

// ============================================================================
// resolveFlowiseConfig (async with settings layer)
// ============================================================================

describe('resolveFlowiseConfig (with settings layer)', () => {
  it('defaults to FLOWISE_PRODUCTION_URL and apiKeySource="none" when nothing is set', async () => {
    const resolved = await resolveFlowiseConfig();
    expect(resolved.baseUrl).toBe(FLOWISE_PRODUCTION_URL);
    expect(resolved.apiKey).toBeUndefined();
    expect(resolved.apiKeySource).toBe('none');
  });

  it('reads baseUrl and apiKey from settings when no args or env are given', async () => {
    const resolved = await resolveFlowiseConfig(undefined, {
      baseUrl: 'https://settings.flowise.test',
      apiKey: 'settings-key',
    });
    expect(resolved.baseUrl).toBe('https://settings.flowise.test');
    expect(resolved.apiKey).toBe('settings-key');
    expect(resolved.apiKeySource).toBe('settings');
  });

  it('reads baseUrl and apiKey from env when no args or settings are given', async () => {
    process.env[FLOWISE_ENV.baseUrl] = 'https://env.flowise.test';
    process.env[FLOWISE_ENV.apiKey] = 'env-key';

    const resolved = await resolveFlowiseConfig();
    expect(resolved.baseUrl).toBe('https://env.flowise.test');
    expect(resolved.apiKey).toBe('env-key');
    expect(resolved.apiKeySource).toBe('env');
  });

  it('prefers explicit args over settings (apiKeySource="arg")', async () => {
    const resolved = await resolveFlowiseConfig(
      { baseUrl: 'https://arg.flowise.test', apiKey: 'arg-key' },
      { baseUrl: 'https://settings.flowise.test', apiKey: 'settings-key' }
    );
    expect(resolved.baseUrl).toBe('https://arg.flowise.test');
    expect(resolved.apiKey).toBe('arg-key');
    expect(resolved.apiKeySource).toBe('arg');
  });

  it('prefers settings over env (apiKeySource="settings")', async () => {
    process.env[FLOWISE_ENV.baseUrl] = 'https://env.flowise.test';
    process.env[FLOWISE_ENV.apiKey] = 'env-key';

    const resolved = await resolveFlowiseConfig(undefined, {
      baseUrl: 'https://settings.flowise.test',
      apiKey: 'settings-key',
    });
    expect(resolved.baseUrl).toBe('https://settings.flowise.test');
    expect(resolved.apiKey).toBe('settings-key');
    expect(resolved.apiKeySource).toBe('settings');
  });

  it('config precedence: args > settings > env > default for baseUrl', async () => {
    process.env[FLOWISE_ENV.baseUrl] = 'https://env.flowise.test';

    let resolved = await resolveFlowiseConfig();
    expect(resolved.baseUrl).toBe('https://env.flowise.test');

    resolved = await resolveFlowiseConfig(undefined, { baseUrl: 'https://settings.flowise.test' });
    expect(resolved.baseUrl).toBe('https://settings.flowise.test');

    resolved = await resolveFlowiseConfig(
      { baseUrl: 'https://arg.flowise.test' },
      { baseUrl: 'https://settings.flowise.test' }
    );
    expect(resolved.baseUrl).toBe('https://arg.flowise.test');
  });

  it('config precedence: args > settings > env > default for apiKey', async () => {
    process.env[FLOWISE_ENV.apiKey] = 'env-key';

    let resolved = await resolveFlowiseConfig();
    expect(resolved.apiKey).toBe('env-key');
    expect(resolved.apiKeySource).toBe('env');

    resolved = await resolveFlowiseConfig(undefined, { apiKey: 'settings-key' });
    expect(resolved.apiKey).toBe('settings-key');
    expect(resolved.apiKeySource).toBe('settings');

    resolved = await resolveFlowiseConfig({ apiKey: 'arg-key' }, { apiKey: 'settings-key' });
    expect(resolved.apiKey).toBe('arg-key');
    expect(resolved.apiKeySource).toBe('arg');
  });

  it('treats empty-string settings values as unset', async () => {
    const resolved = await resolveFlowiseConfig(undefined, { apiKey: '' });
    expect(resolved.apiKey).toBeUndefined();
    expect(resolved.apiKeySource).toBe('none');
  });

  it('treats empty-string env values as unset', async () => {
    process.env[FLOWISE_ENV.apiKey] = '';
    const resolved = await resolveFlowiseConfig();
    expect(resolved.apiKey).toBeUndefined();
    expect(resolved.apiKeySource).toBe('none');
  });
});

// ============================================================================
// createFloWiseConnectionSync (smoke — just verifies wiring, behaviour covered via probeFlowiseReadiness)
// ============================================================================

describe('createFloWiseConnectionSync', () => {
  it('returns a connection instance that uses the resolved config', () => {
    process.env[FLOWISE_ENV.apiKey] = 'env-key';
    const conn = createFloWiseConnectionSync();
    expect(conn).toBeDefined();
    expect(typeof conn.healthCheck).toBe('function');
  });
});

// ============================================================================
// createFloWiseConnection (async with settings)
// ============================================================================

describe('createFloWiseConnection', () => {
  it('returns a connection instance that uses the resolved config with settings', async () => {
    const conn = await createFloWiseConnection(undefined, { apiKey: 'settings-key' });
    expect(conn).toBeDefined();
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

  it('happy path with settings: pingOk + authOk + flowCount with apiKeySource="settings"', async () => {
    const fetchMock = vi.fn(async (_url: string | URL): Promise<Response> => {
      const url = String(_url);
      if (url.endsWith('/api/v1/ping')) return makeResponse(200, 'pong');
      if (url.endsWith('/api/v1/chatflows')) return makeResponse(200, [{ id: 'a' }, { id: 'b' }]);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeFlowiseReadiness(undefined, {
      baseUrl: 'https://settings.test',
      apiKey: 'settings-key',
    });

    expect(result.baseUrl).toBe('https://settings.test');
    expect(result.hasApiKey).toBe(true);
    expect(result.apiKeySource).toBe('settings');
    expect(result.pingOk).toBe(true);
    expect(result.authOk).toBe(true);
    expect(result.flowCount).toBe(2);
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

  it('respects config precedence: args override settings in readiness probe', async () => {
    const fetchMock = vi.fn(async (_url: string | URL): Promise<Response> => {
      const url = String(_url);
      if (url.endsWith('/api/v1/ping')) return makeResponse(200, 'pong');
      if (url.endsWith('/api/v1/chatflows')) return makeResponse(200, [{ id: 'a' }]);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeFlowiseReadiness(
      { baseUrl: 'https://arg.test', apiKey: 'arg-key' },
      { baseUrl: 'https://settings.test', apiKey: 'settings-key' }
    );

    expect(result.baseUrl).toBe('https://arg.test');
    expect(result.apiKeySource).toBe('arg');
    expect(result.pingOk).toBe(true);
    expect(result.authOk).toBe(true);
  });

  it('respects config precedence: settings override env in readiness probe', async () => {
    process.env[FLOWISE_ENV.baseUrl] = 'https://env.test';
    process.env[FLOWISE_ENV.apiKey] = 'env-key';

    const fetchMock = vi.fn(async (_url: string | URL): Promise<Response> => {
      const url = String(_url);
      if (url.endsWith('/api/v1/ping')) return makeResponse(200, 'pong');
      if (url.endsWith('/api/v1/chatflows')) return makeResponse(200, [{ id: 'a' }]);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeFlowiseReadiness(undefined, {
      baseUrl: 'https://settings.test',
      apiKey: 'settings-key',
    });

    expect(result.baseUrl).toBe('https://settings.test');
    expect(result.apiKeySource).toBe('settings');
    expect(result.pingOk).toBe(true);
    expect(result.authOk).toBe(true);
  });
});
