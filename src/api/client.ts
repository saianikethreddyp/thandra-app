import type { TokenPair } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[],
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the device could not reach the server at all. */
  get isNetwork() {
    return this.status === 0;
  }
}

export type TokenStore = {
  getRefresh(): Promise<string | null>;
  setRefresh(token: string | null): Promise<void>;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Set false for endpoints that need no login (login, refresh). */
  auth?: boolean;
};

type RefreshOutcome = 'ok' | 'invalid' | 'network';

export type ClientOptions = {
  /** Path that rotates a refresh token, e.g. /v1/customer/auth/refresh. */
  refreshPath: string;
  baseUrl: string;
  store: TokenStore;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
};

/**
 * HTTP client for the Thandra API.
 *
 * Access tokens live in memory, the refresh token in secure storage. Refresh
 * tokens are single-use on the server, so concurrent 401s must share ONE
 * refresh call: a second parallel refresh would present an already-used token,
 * which the server treats as theft and revokes the whole session.
 */
export function createClient({ baseUrl, store, refreshPath, fetchFn, timeoutMs = 60_000 }: ClientOptions) {
  const doFetch: typeof fetch = fetchFn ?? ((...a) => fetch(...a));
  let access: string | null = null;
  let refreshing: Promise<RefreshOutcome> | null = null;
  let onSessionExpired: (() => void) | null = null;

  function buildUrl(path: string, query?: RequestOptions['query']) {
    const qs = Object.entries(query ?? {})
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `${baseUrl}${path}${qs ? `?${qs}` : ''}`;
  }

  async function send(path: string, o: RequestOptions, token: string | null): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    let body: BodyInit | undefined;
    if (o.form) {
      body = o.form; // fetch sets the multipart boundary itself
    } else if (o.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(o.body);
    }
    if (o.auth !== false && token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await doFetch(buildUrl(path, o.query), { method: o.method ?? 'GET', headers, body, signal: controller.signal });
    } catch (e) {
      const timedOut = (e as Error)?.name === 'AbortError';
      throw new ApiError(
        0,
        timedOut ? 'timeout' : 'network',
        timedOut ? 'The server took too long to respond. Please try again.' : "Can't reach the server. Check your internet connection.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async function parse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    if (!res.ok) {
      const e = json?.error;
      throw new ApiError(res.status, e?.code ?? 'error', e?.message ?? `Request failed (${res.status})`, e?.details, e?.request_id);
    }
    return json as T;
  }

  async function setTokens(pair: TokenPair) {
    access = pair.access_token;
    await store.setRefresh(pair.refresh_token);
  }

  async function clearSession() {
    access = null;
    await store.setRefresh(null);
  }

  function refresh(): Promise<RefreshOutcome> {
    if (refreshing) return refreshing;
    refreshing = (async (): Promise<RefreshOutcome> => {
      const token = await store.getRefresh();
      if (!token) return 'invalid';
      try {
        const res = await send(refreshPath, { method: 'POST', body: { refresh_token: token }, auth: false }, null);
        await setTokens(await parse<TokenPair>(res));
        return 'ok';
      } catch (e) {
        if (e instanceof ApiError && e.isNetwork) return 'network'; // keep the token, try again later
        await clearSession();
        return 'invalid';
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function request<T>(path: string, o: RequestOptions = {}): Promise<T> {
    const sentWith = access;
    let res = await send(path, o, sentWith);

    if (res.status === 401 && o.auth !== false) {
      // Another request may already have refreshed while this one was in flight.
      let outcome: RefreshOutcome = access !== sentWith && access !== null ? 'ok' : await refresh();
      if (outcome === 'ok') {
        res = await send(path, o, access);
      } else if (outcome === 'invalid') {
        onSessionExpired?.();
        throw new ApiError(401, 'session_expired', 'Your session has expired. Please sign in again.');
      } else {
        throw new ApiError(0, 'network', "Can't reach the server. Check your internet connection.");
      }
    }
    return parse<T>(res);
  }

  return {
    request,
    setTokens,
    clearSession,
    refresh,
    hasAccessToken: () => access !== null,
    getRefreshToken: () => store.getRefresh(),
    setSessionExpiredHandler(fn: (() => void) | null) {
      onSessionExpired = fn;
    },
  };
}

export type ApiClient = ReturnType<typeof createClient>;
