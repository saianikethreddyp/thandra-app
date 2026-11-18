/** Base URL of the Thandra API, without a trailing slash. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://go-backend-0yk0.onrender.com').replace(/\/+$/, '');

/** Requests give up after this long. Render's free tier can take ~1 minute to wake up. */
export const REQUEST_TIMEOUT_MS = 60_000;

export const PAGE_SIZE = 20;

export const PRIVACY_POLICY_URL = 'https://saianikethreddyp.github.io/thandra-app/privacy-policy.html';
export const SUPPORT_PHONE = '';
