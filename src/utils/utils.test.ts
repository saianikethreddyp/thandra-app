import { layoutFor } from '@/hooks/useResponsive';
import { isValidIndianMobile, maskPhone, toLocalNumber } from './phone';
import { emptyGuest, formatAadhaar, toGuestBody, validateGuest } from './guest';
import { billableDays, estimateTotal, nextHour, validateWindow } from './pricing';

const H = 3600 * 1000;
const now = new Date('2026-12-01T10:00:00Z');

describe('pricing', () => {
  it('rounds up to whole days with a minimum of one', () => {
    const s = new Date('2026-12-02T10:00:00Z');
    expect(billableDays(s, new Date(s.getTime() + 2 * H))).toBe(1);
    expect(billableDays(s, new Date(s.getTime() + 24 * H))).toBe(1);
    expect(billableDays(s, new Date(s.getTime() + 25 * H))).toBe(2);
    expect(billableDays(s, new Date(s.getTime() - H))).toBe(0);
  });
  it('estimates the total like the API', () => {
    const s = new Date('2026-12-02T10:00:00Z');
    expect(estimateTotal(1800, s, new Date(s.getTime() + 49 * H))).toBe(5400);
  });
  it('validates the booking window', () => {
    const s = new Date(now.getTime() + 2 * H);
    expect(validateWindow(s, new Date(s.getTime() + 5 * H), now)).toBeNull();
    expect(validateWindow(new Date(now.getTime() - H), new Date(now.getTime() + H), now)).toMatch(/past/);
    expect(validateWindow(s, new Date(s.getTime() + 30 * 60 * 1000), now)).toMatch(/at least 1 hour/);
    expect(validateWindow(s, new Date(s.getTime() + 31 * 24 * H), now)).toMatch(/at most 30/);
    expect(validateWindow(s, s, now)).toMatch(/after pick-up/);
    expect(validateWindow(new Date(now.getTime() + 91 * 24 * H), new Date(now.getTime() + 92 * 24 * H), now)).toMatch(/90 days/);
  });
  it('picks the next whole hour', () => {
    const n = nextHour(new Date('2026-12-01T10:20:00'));
    expect(n.getMinutes()).toBe(0);
    expect(n.getHours()).toBe(11);
  });
});

describe('phone', () => {
  it('reduces input to the 10-digit number', () => {
    expect(toLocalNumber('+91 98765 43210')).toBe('9876543210');
    expect(toLocalNumber('09876543210')).toBe('9876543210');
    expect(toLocalNumber('98765-43210')).toBe('9876543210');
  });
  it('validates Indian mobiles', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('1234567890')).toBe(false);
    expect(isValidIndianMobile('98765')).toBe(false);
  });
  it('masks the number', () => expect(maskPhone('9876543210')).toBe('+91 98•••••210'));
});

describe('responsive layout', () => {
  it('chooses columns and caps the content width', () => {
    expect(layoutFor(390)).toMatchObject({ size: 'phone', columns: 1, contentWidth: 390, gutter: 16 });
    expect(layoutFor(768)).toMatchObject({ size: 'tablet', columns: 2, contentWidth: 720 });
    expect(layoutFor(1280)).toMatchObject({ size: 'large', columns: 3, contentWidth: 720 });
  });
});

describe('guest details', () => {
  const good = { fullName: ' Asha  Rao ', phone: '98765 43210', address: '12-3 Road No 4, Madhapur, Hyderabad', aadhaar: '2345 6789 0123', licence: 'ts09 2011-0012345' };

  it('accepts good details and builds the API body', () => {
    expect(validateGuest(good)).toEqual({});
    expect(toGuestBody(good)).toEqual({
      full_name: 'Asha Rao',
      phone: '9876543210',
      address: '12-3 Road No 4, Madhapur, Hyderabad',
      aadhaar: '234567890123',
      driving_licence: 'TS0920110012345',
    });
  });

  it('flags every bad field', () => {
    expect(Object.keys(validateGuest(emptyGuest)).sort()).toEqual(['aadhaar', 'address', 'fullName', 'licence', 'phone']);
    expect(validateGuest({ ...good, aadhaar: '1234 5678 9012' }).aadhaar).toBeTruthy(); // cannot start with 0 or 1
    expect(validateGuest({ ...good, phone: '12345' }).phone).toBeTruthy();
  });

  it('formats Aadhaar in groups of four', () => {
    expect(formatAadhaar('234567890123')).toBe('2345 6789 0123');
    expect(formatAadhaar('2345 67')).toBe('2345 67');
  });
});
