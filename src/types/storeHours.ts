export type DayKey =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type DayHours = {
  closed: boolean;
  open?: string;  // 24h "HH:mm", e.g. "08:00"
  close?: string; // 24h "HH:mm", e.g. "21:30"
};

export type StoreHoursValue = Partial<Record<DayKey, DayHours>>;

export const DAY_ORDER: DayKey[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

export const DAY_LABELS: Record<DayKey, { en: string; tl: string }> = {
  monday: { en: 'Monday', tl: 'Lunes' },
  tuesday: { en: 'Tuesday', tl: 'Martes' },
  wednesday: { en: 'Wednesday', tl: 'Miyerkules' },
  thursday: { en: 'Thursday', tl: 'Huwebes' },
  friday: { en: 'Friday', tl: 'Biyernes' },
  saturday: { en: 'Saturday', tl: 'Sabado' },
  sunday: { en: 'Sunday', tl: 'Linggo' },
};

export function defaultStoreHours(): StoreHoursValue {
  const value: StoreHoursValue = {};
  for (const day of DAY_ORDER) {
    value[day] = { closed: false, open: '08:00', close: '18:00' };
  }
  return value;
}

export function formatTime12h(time24?: string): string {
  if (!time24) return '--:--';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Returns true/false, or null if no hours have been set at all (unknown).
export function isStoreOpenNow(hours: StoreHoursValue | null | undefined): boolean | null {
  if (!hours || Object.keys(hours).length === 0) return null;

  const dayByJsIndex: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const today = dayByJsIndex[now.getDay()];
  const day = hours[today];

  if (!day || day.closed || !day.open || !day.close) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = toMinutes(day.open);
  const closeMin = toMinutes(day.close);

  if (closeMin > openMin) {
    return nowMin >= openMin && nowMin < closeMin;
  }
  // Overnight range (e.g. 10:00 PM–2:00 AM)
  return nowMin >= openMin || nowMin < closeMin;
}
