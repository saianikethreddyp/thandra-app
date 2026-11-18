export const colors = {
  primary: '#0F172A',
  primaryLight: '#334155',
  gold: '#D4AF37',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
  green: '#059669',
  red: '#DC2626',
  blue: '#2563EB',
  amber: '#D97706',
  slate: '#475569',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16 };

export const statusStyle = {
  confirmed: { label: 'Confirmed', color: colors.blue, bg: '#DBEAFE' },
  active: { label: 'On ride', color: colors.green, bg: '#D1FAE5' },
  completed: { label: 'Completed', color: colors.slate, bg: '#E2E8F0' },
  cancelled: { label: 'Cancelled', color: colors.red, bg: '#FEE2E2' },
} as const;
