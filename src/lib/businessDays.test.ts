import { describe, it, expect } from 'vitest';
import { isBusinessDay, previousBusinessDay, isQuebecBankHoliday, formatISODate } from './businessDays';

describe('businessDays (QC)', () => {
  it('detects weekends as non-business days', () => {
    const sat = new Date(2025, 8, 6); // Sep 6, 2025 (local)
    const sun = new Date(2025, 8, 7); // Sep 7, 2025
    expect(isBusinessDay(sat)).toBe(false);
    expect(isBusinessDay(sun)).toBe(false);
  });

  it('computes Good Friday and other holidays', () => {
    // 2025 Good Friday is 2025-04-18
    const gf = new Date(2025, 3, 18);
    expect(isQuebecBankHoliday(gf)).toBe(true);
    // Saint-Jean-Baptiste 2025-06-24
    expect(isQuebecBankHoliday(new Date(2025, 5, 24))).toBe(true);
  });

  it('previousBusinessDay backs off from weekend/holiday to prior business day', () => {
    // Saturday -> Friday
    const sat = new Date(2025, 8, 6);
    expect(formatISODate(previousBusinessDay(sat))).toBe('2025-09-05');

    // 2025-07-01 Canada Day (observed) -> previous business day 2025-06-30
    expect(formatISODate(previousBusinessDay(new Date(2025, 6, 1)))).toBe('2025-06-30');
  });
});
