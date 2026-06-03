export type EventScheduleStatus = 'upcoming' | 'live' | 'past';

/** Jordan — matches public site event time display. */
export const EVENT_DISPLAY_TIME_ZONE = 'Asia/Amman';

/** Classify event by start/end; falls back to legacy 24h window when end is missing. */
export function deriveEventStatus(
  startIso: string,
  endIso?: string | null,
): EventScheduleStatus {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return 'upcoming';

  if (endIso) {
    const end = new Date(endIso).getTime();
    if (!Number.isNaN(end)) {
      if (now < start) return 'upcoming';
      if (now > end) return 'past';
      return 'live';
    }
  }

  const diff = start - now;
  if (diff < 0) return 'past';
  if (diff < 24 * 60 * 60 * 1000) return 'live';
  return 'upcoming';
}

/** UTC ISO from API → value for `<input type="datetime-local">` in the browser's local timezone. */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local string → UTC ISO for the API / database. */
export function fromDatetimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date and time');
  }
  return d.toISOString();
}
