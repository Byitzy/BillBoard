// Quebec banking business day helpers (CA-QC)
// - Weekend: Saturday/Sunday are non-business days
// - Holidays: subset of common QC/Canada banking holidays
//   New Year's Day, Good Friday, National Patriots' Day (Mon before May 25),
//   Saint-Jean-Baptiste (Jun 24), Canada Day (Jul 1), Labour Day (1st Mon Sep),
//   Thanksgiving (2nd Mon Oct), Christmas Day (Dec 25).

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6; // Sun or Sat
}

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  n: number
): Date {
  // weekday: 0=Sun..6=Sat, monthIndex: 0..11
  const first = new Date(year, monthIndex, 1);
  const shift = (7 + weekday - first.getDay()) % 7;
  const day = 1 + shift + (n - 1) * 7;
  return new Date(year, monthIndex, day);
}

function mondayBeforeDate(
  year: number,
  monthIndex: number,
  dayOfMonth: number
): Date {
  // Find Monday on or before (dayOfMonth - 1), i.e., Monday before given date
  const target = new Date(year, monthIndex, dayOfMonth);
  // Step back 1 day to ensure strictly before the target date
  target.setDate(target.getDate() - 1);
  // Move back to Monday
  while (target.getDay() !== 1) {
    target.setDate(target.getDate() - 1);
  }
  return startOfDay(target);
}

function observedIfWeekend(d: Date): Date {
  // For some holidays banks may observe on next Monday if Sunday
  // Keep simple: if Sunday -> Monday; if Saturday -> Friday (Canada Day often Fri if Sat)
  const day = d.getDay();
  const res = new Date(d);
  if (day === 0)
    res.setDate(res.getDate() + 1); // Sunday -> Monday
  else if (day === 6) res.setDate(res.getDate() - 1); // Saturday -> Friday
  return startOfDay(res);
}

function quebecBankHolidays(year: number): Date[] {
  const dates: Date[] = [];

  // New Year's Day (Jan 1) observed
  dates.push(observedIfWeekend(new Date(year, 0, 1)));

  // Good Friday (Friday before Easter Sunday)
  const easter = easterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  dates.push(startOfDay(goodFriday));

  // National Patriots' Day (QC) - Monday preceding May 25
  dates.push(mondayBeforeDate(year, 4, 25));

  // Saint-Jean-Baptiste Day (Jun 24) - if on weekend, usually observed on Monday; keep simple
  dates.push(observedIfWeekend(new Date(year, 5, 24)));

  // Canada Day (Jul 1) observed
  dates.push(observedIfWeekend(new Date(year, 6, 1)));

  // Labour Day - 1st Monday of September
  dates.push(nthWeekdayOfMonth(year, 8, 1, 1));

  // Thanksgiving - 2nd Monday of October
  dates.push(nthWeekdayOfMonth(year, 9, 1, 2));

  // Christmas Day (Dec 25) observed
  dates.push(observedIfWeekend(new Date(year, 11, 25)));

  return dates.map(startOfDay);
}

export function isQuebecBankHoliday(date: Date): boolean {
  const d = startOfDay(date);
  const holidays = quebecBankHolidays(d.getFullYear());
  return holidays.some((h) => h.getTime() === d.getTime());
}

export function getQuebecBankHolidayName(date: Date): string | null {
  const d = startOfDay(date);
  const year = d.getFullYear();
  
  // New Year's Day (Jan 1) observed
  const newYear = observedIfWeekend(new Date(year, 0, 1));
  if (d.getTime() === newYear.getTime()) return "New Year's Day";

  // Good Friday (Friday before Easter Sunday)
  const easter = easterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  if (d.getTime() === startOfDay(goodFriday).getTime()) return "Good Friday";

  // National Patriots' Day (QC) - Monday preceding May 25
  const patriotsDay = mondayBeforeDate(year, 4, 25);
  if (d.getTime() === patriotsDay.getTime()) return "National Patriots' Day";

  // Saint-Jean-Baptiste Day (Jun 24)
  const stJean = observedIfWeekend(new Date(year, 5, 24));
  if (d.getTime() === stJean.getTime()) return "Saint-Jean-Baptiste Day";

  // Canada Day (Jul 1) observed
  const canadaDay = observedIfWeekend(new Date(year, 6, 1));
  if (d.getTime() === canadaDay.getTime()) return "Canada Day";

  // Labour Day - 1st Monday of September
  const labourDay = nthWeekdayOfMonth(year, 8, 1, 1);
  if (d.getTime() === labourDay.getTime()) return "Labour Day";

  // Thanksgiving - 2nd Monday of October
  const thanksgiving = nthWeekdayOfMonth(year, 9, 1, 2);
  if (d.getTime() === thanksgiving.getTime()) return "Thanksgiving";

  // Christmas Day (Dec 25) observed
  const christmas = observedIfWeekend(new Date(year, 11, 25));
  if (d.getTime() === christmas.getTime()) return "Christmas Day";

  return null;
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isQuebecBankHoliday(date);
}

export function previousBusinessDay(date: Date): Date {
  // Returns the most recent business day on or before the given date
  let d = startOfDay(date);
  while (!isBusinessDay(d)) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  }
  return d;
}

export function nextBusinessDay(date: Date): Date {
  let d = startOfDay(date);
  while (!isBusinessDay(d)) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  }
  return d;
}

export function formatISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
