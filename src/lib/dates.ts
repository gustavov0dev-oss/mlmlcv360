// Instants are stored in UTC; display uses the browser's region and time zone.
// A calendar-only date is not an instant and must never shift to another day.
export function localDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + 'T00:00:00');
  const timestamp = value.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(/^\d{4}-\d{2}-\d{2}T/.test(timestamp) && !/(Z|[+-]\d{2}(:?\d{2})?)$/i.test(timestamp) ? timestamp + 'Z' : timestamp);
}
export function displayDate(value: string | number | Date, options: Intl.DateTimeFormatOptions = {}): string {
  const date = localDate(value);
  const calendarOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, {...options, timeZone: calendarOnly ? Intl.DateTimeFormat().resolvedOptions().timeZone : userTimeZone()}).format(date);
}

export function userTimeZone(): string {
  try {
    const id = JSON.parse(localStorage.getItem('mlm360-user') || '{}').id;
    const zone = localStorage.getItem(`mlm360-timezone-${id}`);
    if (zone) { new Intl.DateTimeFormat(undefined,{timeZone:zone}); return zone; }
  } catch { /* Browser or stored preference unavailable. */ }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
export function displayDateTime(value: string | number | Date, options: Intl.DateTimeFormatOptions = {}) {
  return displayDate(value,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',...options});
}

/** Calendar key in the viewer's zone; never slice a UTC timestamp for a local day. */
export function dateKey(value: string | number | Date = new Date(), timeZone = userTimeZone()): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(localDate(value));
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
}

export function monthKey(offset = 0, value: Date = new Date()): string {
  const [year, month] = dateKey(value).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

/** Convert a local calendar boundary to UTC, accounting for seasonal offsets. */
export function dayBoundaryUtc(day: string, nextDay = false, timeZone = userTimeZone()): Date {
  const [year, month, date] = day.split('-').map(Number);
  const target = Date.UTC(year, month - 1, date + (nextDay ? 1 : 0));
  const key = new Date(target).toISOString().slice(0, 10);
  // Search for the first instant of the calendar day. Some regions skip midnight
  // when daylight saving starts, so assuming 00:00 exists can select yesterday.
  let low = target - 36 * 3600000, high = target + 36 * 3600000;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (dateKey(middle, timeZone) < key) low = middle + 1;
    else high = middle;
  }
  return new Date(low);
}
