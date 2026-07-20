import SponsoredBadge from '@/src/components/SponsoredBadge';
import { useRecordAdClick, useRecordAdImpression } from '@/src/hooks/useAdsFeed';
import { type SponsoredAd } from '@/src/types/ad';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

/** Native ad card interleaved into the Community and Recipe feeds (see
 * interleaveAds.ts). Visually matches this app's existing card language
 * (RecipeCard/PostCard: white, rounded-16, thin cream border, 16px side
 * margin) so it reads as part of the feed rather than a foreign banner --
 * the SponsoredBadge is what marks it as paid, not the card shape itself. */
export default function SponsoredAdCard({ ad }: { ad: SponsoredAd }) {
  const { mutate: recordImpression } = useRecordAdImpression();
  const { mutate: recordClick } = useRecordAdClick();
  const firedImpression = useRef(false);

  useEffect(() => {
    if (firedImpression.current) return;
    firedImpression.current = true;
    recordImpression(ad.id);
  }, [ad.id, recordImpression]);

  const handlePress = () => {
    recordClick(ad.id);
    if (ad.link_url) Linking.openURL(ad.link_url).catch(() => {});
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!ad.link_url}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: '#F0DEBB',
        marginBottom: 12,
        marginHorizontal: 16,
        overflow: 'hidden',
      }}
      className="active:opacity-80"
    >
      {ad.image_url && (
        <Image source={{ uri: ad.image_url }} style={{ width: '100%', height: 160 }} contentFit="cover" />
      )}
      <View style={{ padding: 14 }}>
        <View style={{ marginBottom: 8 }}>
          <SponsoredBadge />
        </View>
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 2 }}>
          {ad.product_name}
        </Text>
        <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginBottom: 6 }}>
          {ad.company_name}
        </Text>
        {ad.tagline && (
          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#000000', marginBottom: 2 }}>
            {ad.tagline}
          </Text>
        )}
        {ad.description && (
          <Text
            style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', lineHeight: 18, marginBottom: 10 }}
            numberOfLines={3}
          >
            {ad.description}
          </Text>
        )}
        {ad.link_url && (
          <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#C45E3A', paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>
              {ad.cta_label}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
