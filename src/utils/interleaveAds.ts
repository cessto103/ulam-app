import { type SponsoredAd } from '@/src/types/ad';

// Hardcoded for v1 -- an admin-configurable frequency setting is explicitly
// out of scope until there's enough concurrent ad volume for it to matter.
export const SPONSORED_AD_INTERVAL = 8;

export type AdSlot = { __type: 'ad'; key: string; ad: SponsoredAd };
export type FeedEntry<T> = T | AdSlot;

export function isAdSlot<T>(entry: FeedEntry<T>): entry is AdSlot {
  return typeof entry === 'object' && entry !== null && '__type' in entry && entry.__type === 'ad';
}

/**
 * Injects a synthetic ad item after every `interval`-th organic item, cycling
 * through `ads` via modulo so a small active pool still repeats sensibly down
 * a long feed. Call once per independent list: the whole array for a flat
 * feed (Community), or once per section for a SectionList (recipe browse) --
 * SectionList has no single flat "every Nth item across all sections" hook,
 * so each section gets its own light sprinkle instead of one shared counter.
 */
export function interleaveAds<T>(
  items: T[],
  ads: SponsoredAd[],
  interval: number = SPONSORED_AD_INTERVAL
): FeedEntry<T>[] {
  if (ads.length === 0 || items.length === 0) return items;

  const result: FeedEntry<T>[] = [];
  let organicCount = 0;
  let adCursor = 0;

  for (const item of items) {
    result.push(item);
    organicCount++;
    if (organicCount % interval === 0) {
      const ad = ads[adCursor % ads.length];
      adCursor++;
      result.push({ __type: 'ad', key: `ad-${ad.id}-${organicCount}`, ad });
    }
  }

  return result;
}
