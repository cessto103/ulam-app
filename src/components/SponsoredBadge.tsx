import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

/** Deliberately its own file, unlike BoostBadge (which lives inside
 * BoostButton.tsx) so it reads as a standalone, distinct concept: a paid
 * third-party placement, never to be confused with a creator boosting their
 * own content. Muted neutral pill -- the structural opposite of BoostBadge's
 * gold rocket pill -- so the two can never be visually mistaken for each
 * other even when they might appear near one another in the recipe feed. */
export default function SponsoredBadge() {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-cream-200 px-2.5 py-1 self-start">
      <Ionicons name="megaphone-outline" size={12} color="#6F655A" />
      <Text className="text-[12px] font-bold text-ink-soft">Sponsored</Text>
    </View>
  );
}
