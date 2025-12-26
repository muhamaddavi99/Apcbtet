// WIB/Indonesia time helpers (client-safe)
// Uses Intl.DateTimeFormat with explicit timeZone to avoid device timezone drift.

const WIB_TZ = 'Asia/Jakarta';

function formatParts(date: Date, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: WIB_TZ, ...options }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return map;
}

export function getWibDate(date: Date = new Date()): string {
  // YYYY-MM-DD
  const p = formatParts(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

export function getWibTimeHM(date: Date = new Date()): string {
  const p = formatParts(date, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.hour}:${p.minute}`;
}

export function formatWibClock(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function formatWibLongDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getWibWeekdayFromDateString(dateStr: string): string {
  // dateStr: YYYY-MM-DD
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  return new Intl.DateTimeFormat('id-ID', { timeZone: WIB_TZ, weekday: 'long' }).format(d);
}

export function getWibDateFromIso(iso: string): string {
  return getWibDate(new Date(iso));
}
