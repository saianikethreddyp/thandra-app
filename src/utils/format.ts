export const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const DATE_TIME: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };

export const dateTime = (iso: string | Date) => new Date(iso).toLocaleString('en-IN', DATE_TIME);
export const dateOnly = (iso: string | Date) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
