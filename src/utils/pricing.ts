const DAY_MS = 24 * 60 * 60 * 1000;

/** Mirrors the API: the duration is rounded up to whole days, minimum one. */
export function billableDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / DAY_MS));
}

export const estimateTotal = (pricePerDay: number, start: Date, end: Date) => pricePerDay * billableDays(start, end);

// Limits enforced by the API; checked here so people see the problem before sending.
export const MIN_HOURS = 1;
export const MAX_DAYS = 30;
export const MAX_ADVANCE_DAYS = 90;
export const START_GRACE_MS = 5 * 60 * 1000;

/** Returns a message when the window is invalid, otherwise null. */
export function validateWindow(start: Date, end: Date, now = new Date()): string | null {
  if (start.getTime() < now.getTime() - START_GRACE_MS) return 'Pick-up time cannot be in the past.';
  if (start.getTime() > now.getTime() + MAX_ADVANCE_DAYS * DAY_MS) return `You can book up to ${MAX_ADVANCE_DAYS} days ahead.`;
  if (end.getTime() <= start.getTime()) return 'Return time must be after pick-up.';
  if (end.getTime() - start.getTime() < MIN_HOURS * 60 * 60 * 1000) return 'A booking must be at least 1 hour.';
  if (end.getTime() - start.getTime() > MAX_DAYS * DAY_MS) return `A booking can be at most ${MAX_DAYS} days.`;
  return null;
}

/** Next whole hour, a sensible default pick-up. */
export function nextHour(from = new Date()): Date {
  const d = new Date(from);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}
