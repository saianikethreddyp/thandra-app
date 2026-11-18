import * as SecureStore from 'expo-secure-store';

import { API_URL, REQUEST_TIMEOUT_MS } from '@/config';
import { createClient, type TokenStore } from './client';

const REFRESH_KEY = 'thandra_customer_refresh_token';

const secureStore: TokenStore = {
  async getRefresh() {
    try {
      return await SecureStore.getItemAsync(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  async setRefresh(token) {
    if (token === null) await SecureStore.deleteItemAsync(REFRESH_KEY);
    else await SecureStore.setItemAsync(REFRESH_KEY, token);
  },
};

/** The app-wide API client. */
export const api = createClient({ baseUrl: API_URL, store: secureStore, refreshPath: '/v1/customer/auth/refresh', timeoutMs: REQUEST_TIMEOUT_MS });
export { ApiError } from './client';
