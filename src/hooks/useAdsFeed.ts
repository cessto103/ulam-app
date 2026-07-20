import client from '@/src/api/client';
import { type AdPlacement, type SponsoredAd } from '@/src/types/ad';
import { useMutation, useQuery } from '@tanstack/react-query';

/** Free/Premium audience filtering happens server-side against the
 * requesting user's real plan -- the client just renders whatever comes
 * back, no local re-filtering. */
export function useAdsFeed(placement: AdPlacement) {
  const { data } = useQuery({
    queryKey: ['ads-feed', placement],
    queryFn: async () => {
      const { data } = await client.get<{ ads: SponsoredAd[] }>('/ads/feed', {
        params: { placement },
      });
      return data.ads;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return data ?? []; // a feed screen must never block or error over ads specifically
}

export function useRecordAdImpression() {
  return useMutation({
    mutationFn: (adId: number) => client.post(`/ads/${adId}/impression`),
  });
}

export function useRecordAdClick() {
  return useMutation({
    mutationFn: (adId: number) => client.post(`/ads/${adId}/click`),
  });
}
