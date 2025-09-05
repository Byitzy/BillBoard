import { describe, it, expect } from 'vitest';
import { generateOccurrences, Bill } from './occurrences';

describe('generateOccurrences', () => {
  it('handles one-off bill', () => {
    const bill: Bill = {
      id: 'b1',
      org_id: 'o1',
      title: 'One-off',
      amount_total: 1200,
      due_date: '2025-06-24'
    };
    const occ = generateOccurrences(bill);
    expect(occ.length).toBe(1);
    expect(occ[0].due_date).toBe('2025-06-24');
  });

  it('generates monthly schedule with byMonthDay and installments', () => {
    const bill: Bill = {
      id: 'b2',
      org_id: 'o1',
      title: 'Insurance',
      amount_total: 1200,
      installments_total: 3,
      recurring_rule: {
        frequency: 'monthly',
        interval: 1,
        byMonthDay: 15,
        start_date: '2025-01-15',
        horizon_months: 6
      }
    };
    const occ = generateOccurrences(bill);
    expect(occ.length).toBe(3); // limited by installments
    expect(occ[0].sequence).toBe(1);
    expect(occ[0].amount_due).toBeCloseTo(400, 2);
    expect(occ[1].amount_due).toBeCloseTo(400, 2);
    expect(occ[2].amount_due).toBeCloseTo(400, 2);
    expect(occ[0].due_date).toBe('2025-01-15');
    expect(occ[1].due_date).toBe('2025-02-15');
    expect(occ[2].due_date).toBe('2025-03-15');
  });
});
