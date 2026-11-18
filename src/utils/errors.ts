import { ApiError } from '@/api/client';

/** A message that is safe and useful to show to the person using the app. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.details?.length) return e.details.map((d) => d.message).join('\n');
    return e.message;
  }
  return 'Something went wrong. Please try again.';
}

export const isApiError = (e: unknown, status?: number, code?: string): e is ApiError =>
  e instanceof ApiError && (status === undefined || e.status === status) && (code === undefined || e.code === code);
