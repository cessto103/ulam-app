/** Decline reasons for community price reports. The key is stored server-side. */
export const DECLINE_REASONS = [
  { key: 'wrong_price',    en: 'Wrong price',             tl: 'Maling presyo' },
  { key: 'wrong_item',     en: 'Wrong item',              tl: 'Maling item' },
  { key: 'no_such_item',   en: "I don't have this item",  tl: 'Wala akong ganitong item' },
  { key: 'outdated_price', en: 'Outdated price',          tl: 'Luma nang presyo' },
  { key: 'duplicate',      en: 'Duplicate report',        tl: 'Duplicate na report' },
  { key: 'spam',           en: 'Spam or fake report',     tl: 'Spam o pekeng report' },
] as const;

export function declineReasonLabel(key: string | null | undefined, lang: 'en' | 'tl'): string {
  if (!key) return '';
  const r = DECLINE_REASONS.find((r) => r.key === key);
  return r ? r[lang] : key;
}
