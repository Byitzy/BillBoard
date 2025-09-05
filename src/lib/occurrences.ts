export type RecurringRule = {
  frequency: 'monthly' | 'weekly' | 'yearly';
  interval?: number; // default 1
  byMonthDay?: number; // for monthly: day of month (1..31)
  start_date: string; // ISO YYYY-MM-DD
  end_date?: string; // ISO YYYY-MM-DD
  horizon_months?: number; // cap generation
};

export type Bill = {
  id: string;
  org_id: string;
  project_id?: string | null;
  vendor_id?: string | null;
  title: string;
  amount_total: number; // cents or dollars; assume dollars here
  due_date?: string | null; // ISO, for one-off
  recurring_rule?: RecurringRule | null;
  installments_total?: number | null;
};

export type Occurrence = {
  bill_id: string;
  sequence: number;
  amount_due: number;
  due_date: string; // ISO
  suggested_submission_date: string; // ISO
};

import { previousBusinessDay, formatISODate } from './businessDays';

function parseISODateLocal(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return new Date(iso);
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function clampHorizon(start: Date, end?: Date | null, months = 18): Date {
  const cap = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
  if (!end) return cap;
  return end < cap ? end : cap;
}

function datesEqualISO(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addMonthsClamp(d: Date, months: number, byMonthDay?: number): Date {
  const year = d.getFullYear();
  const month = d.getMonth();
  const targetMonth = month + months;
  const day = byMonthDay ?? d.getDate();
  return new Date(new Date(year, targetMonth, 1).getFullYear(), new Date(year, targetMonth, 1).getMonth(), Math.min(day, daysInMonth(new Date(year, targetMonth, 1))));
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function generateOccurrences(bill: Bill): Occurrence[] {
  const out: Occurrence[] = [];
  const installments = bill.installments_total ?? undefined;

  const addOccurrence = (due: Date, seq: number) => {
    const suggestion = previousBusinessDay(due);
    out.push({
      bill_id: bill.id,
      sequence: seq,
      amount_due: computeInstallmentAmount(bill.amount_total, installments, seq),
      due_date: formatISODate(due),
      suggested_submission_date: formatISODate(suggestion)
    });
  };

  // One-off
  if (!bill.recurring_rule) {
    if (!bill.due_date) return out;
    const due = parseISODateLocal(bill.due_date);
    addOccurrence(due, 1);
    return out;
  }

  // Recurring
  const rule = bill.recurring_rule;
  const interval = Math.max(1, rule.interval ?? 1);
  const start = parseISODateLocal(rule.start_date);
  const end = rule.end_date ? parseISODateLocal(rule.end_date) : null;
  const horizon = clampHorizon(start, end, rule.horizon_months ?? 18);

  let seq = 1;
  let cursor = new Date(start);

  if (rule.frequency === 'monthly') {
    const byDay = rule.byMonthDay ?? start.getDate();
    // Normalize cursor to the first target day
    cursor = new Date(start.getFullYear(), start.getMonth(), Math.min(byDay, daysInMonth(start)));
    while (cursor <= horizon) {
      addOccurrence(cursor, seq++);
      cursor = addMonthsClamp(cursor, interval, byDay);
    }
  } else if (rule.frequency === 'weekly') {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    while (cursor <= horizon) {
      addOccurrence(cursor, seq++);
      cursor = new Date(cursor.getTime() + interval * oneWeekMs);
    }
  } else if (rule.frequency === 'yearly') {
    while (cursor <= horizon) {
      addOccurrence(cursor, seq++);
      cursor = new Date(cursor.getFullYear() + interval, cursor.getMonth(), cursor.getDate());
    }
  }

  // Trim if installments limit present
  if (installments && out.length > installments) {
    return out.slice(0, installments).map((occ, i) => ({ ...occ, sequence: i + 1 }));
  }

  return out;
}

function computeInstallmentAmount(total: number, installments: number | undefined, seq: number): number {
  if (!installments || installments < 2) return round2(total);
  const base = Math.floor((total * 100) / installments);
  const remainder = Math.round(total * 100) - base * installments;
  const cents = seq === 1 ? base + remainder : base;
  return round2(cents / 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
