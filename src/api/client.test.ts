import { ApiError, createClient, type TokenStore } from './client';
import type { TokenPair } from './types';

const pair = (n: number): TokenPair => ({
  access_token: `access-${n}`,
  access_expires_at: '2030-01-01T00:00:00Z',
  refresh_token: `refresh-${n}`,
  refresh_expires_at: '2030-02-01T00:00:00Z',
});

function memoryStore(initial: string | null = 'refresh-0'): TokenStore & { value: string | null } {
  const s = {
    value: initial,
    async getRefresh() {
      return s.value;
    },
    async setRefresh(t: string | null) {
      s.value = t;
    },
  };
  return s;
}

function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

/**
 * A fake server: /v1/customer/auth/refresh accepts each refresh token once (like the
 * real API) and answers 401 for anything already used. Other paths need the
 * newest access token.
 */
function fakeServer() {
  let current = 0;
  const used = new Set<string>();
  const calls: { path: string; auth?: string }[] = [];
  const fetchFn = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const path = String(url).replace('https://api.test', '');
    const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
    calls.push({ path, auth });
    if (path === '/v1/customer/auth/refresh') {
      const body = JSON.parse(String(init?.body));
      if (used.has(body.refresh_token) || body.refresh_token !== `refresh-${current}`) {
        return json(401, { error: { code: 'unauthorized', message: 'invalid refresh token' } });
      }
      used.add(body.refresh_token);
      current += 1;
      await new Promise((r) => setTimeout(r, 15)); // make overlap realistic
      return json(200, pair(current));
    }
    if (auth === `Bearer access-${current}` && current > 0) return json(200, { ok: true, path });
    return json(401, { error: { code: 'unauthorized', message: 'expired' } });
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls, refreshCalls: () => calls.filter((c) => c.path === '/v1/customer/auth/refresh').length };
}

function makeClient(server: ReturnType<typeof fakeServer>, store = memoryStore()) {
  return { store, client: createClient({ refreshPath: '/v1/customer/auth/refresh', baseUrl: 'https://api.test', store, fetchFn: server.fetchFn, timeoutMs: 1000 }) };
}

describe('api client', () => {
  it('refreshes once on 401 and retries with the new access token', async () => {
    const server = fakeServer();
    const { client, store } = makeClient(server);
    const res = await client.request<{ ok: boolean }>('/v1/dashboard');
    expect(res.ok).toBe(true);
    expect(server.refreshCalls()).toBe(1);
    expect(store.value).toBe('refresh-1'); // rotated token persisted
  });

  it('shares ONE refresh between concurrent requests (refresh tokens are single use)', async () => {
    const server = fakeServer();
    const { client, store } = makeClient(server);
    const results = await Promise.all([
      client.request('/v1/a'),
      client.request('/v1/b'),
      client.request('/v1/c'),
      client.request('/v1/d'),
      client.request('/v1/e'),
    ]);
    expect(results).toHaveLength(5);
    expect(server.refreshCalls()).toBe(1);
    expect(store.value).toBe('refresh-1');
  });

  it('retries without refreshing if another request already refreshed', async () => {
    const server = fakeServer();
    const { client } = makeClient(server);
    await client.request('/v1/first'); // refreshes; access-1 now valid
    const before = server.refreshCalls();
    await client.request('/v1/second');
    expect(server.refreshCalls()).toBe(before); // still valid, no extra refresh
  });

  it('signs out when the refresh token is rejected', async () => {
    const server = fakeServer();
    const { client, store } = makeClient(server, memoryStore('stolen-or-old'));
    const expired = jest.fn();
    client.setSessionExpiredHandler(expired);
    await expect(client.request('/v1/dashboard')).rejects.toMatchObject({ status: 401, code: 'session_expired' });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(store.value).toBeNull();
  });

  it('keeps the session when the network is down during refresh', async () => {
    const store = memoryStore('refresh-0');
    const fetchFn = jest.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/v1/customer/auth/refresh')) throw new TypeError('Network request failed');
      return json(401, { error: { code: 'unauthorized', message: 'expired' } });
    }) as unknown as typeof fetch;
    const client = createClient({ refreshPath: '/v1/customer/auth/refresh', baseUrl: 'https://api.test', store, fetchFn });
    const expired = jest.fn();
    client.setSessionExpiredHandler(expired);
    await expect(client.request('/v1/dashboard')).rejects.toMatchObject({ status: 0 });
    expect(expired).not.toHaveBeenCalled();
    expect(store.value).toBe('refresh-0'); // token kept so we can try again later
  });

  it('turns API error bodies into ApiError with field details', async () => {
    const fetchFn = jest.fn(async () =>
      json(422, { error: { code: 'validation_failed', message: 'request validation failed', details: [{ field: 'plate', message: 'is invalid' }], request_id: 'r1' } }),
    ) as unknown as typeof fetch;
    const client = createClient({ refreshPath: '/v1/customer/auth/refresh', baseUrl: 'https://api.test', store: memoryStore(), fetchFn });
    const err = (await client.request('/v1/cars', { method: 'POST', body: {}, auth: false }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.details).toEqual([{ field: 'plate', message: 'is invalid' }]);
    expect(err.requestId).toBe('r1');
  });

  it('handles 204 responses and builds query strings', async () => {
    const seen: string[] = [];
    const fetchFn = jest.fn(async (url: RequestInfo | URL) => {
      seen.push(String(url));
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    const client = createClient({ refreshPath: '/v1/customer/auth/refresh', baseUrl: 'https://api.test', store: memoryStore(), fetchFn });
    const res = await client.request('/v1/bookings', { query: { status: 'active', q: 'a b&c', empty: '', none: undefined, limit: 20 }, auth: false });
    expect(res).toBeUndefined();
    expect(seen[0]).toBe('https://api.test/v1/bookings?status=active&q=a%20b%26c&limit=20');
  });

  it('reports a friendly message when the server is unreachable', async () => {
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const client = createClient({ refreshPath: '/v1/customer/auth/refresh', baseUrl: 'https://api.test', store: memoryStore(), fetchFn });
    const err = (await client.request('/v1/dashboard', { auth: false }).catch((e) => e)) as ApiError;
    expect(err.isNetwork).toBe(true);
    expect(err.message).toMatch(/Can't reach the server/);
  });
});
