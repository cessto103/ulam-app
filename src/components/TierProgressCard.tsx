import { useLanguage } from '@/src/context/LanguageContext';
import { Text, View } from 'react-native';

export type Tier = 'bronze' | 'silver' | 'gold' | 'diamond';

export type TierRow = {
  tier: Tier;
  target_count: number;
  xp_reward: number;
  is_earned: boolean;
  earned_at: string | null;
};

export type TierGroup = {
  tier_group: string;
  title: string;
  title_en: string | null;
  icon: string | null;
  actual_count: number;
  current_tier: Tier | null;
  tiers: TierRow[];
};

export const TIER_STYLE: Record<Tier, { bg: string; text: string; label: string }> = {
  bronze:  { bg: '#F1DFC8', text: '#8A5A2B', label: 'Bronze' },
  silver:  { bg: '#E4E4E7', text: '#52525B', label: 'Silver' },
  gold:    { bg: '#FBEACB', text: '#8A5A05', label: 'Gold' },
  diamond: { bg: '#D3F3F7', text: '#0E7C86', label: 'Diamond' },
};

/** One progressive badge per tier group (bronze -> diamond) instead of 4
 * separate locked/unlocked rows -- shows the current tier and how far to
 * the next one. */
export default function TierProgressCard({ group }: { group: TierGroup }) {
  const { lang } = useLanguage();
  const title = lang === 'en' ? (group.title_en || group.title) : group.title;
  const nextTier = group.tiers.find((t) => !t.is_earned);
  const currentStyle = group.current_tier ? TIER_STYLE[group.current_tier] : null;

  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: currentStyle ? currentStyle.bg : '#F9EDD3' }}
      >
        <Text style={{ fontSize: 18 }}>{group.icon || '🏅'}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-medium text-ink">{title}</Text>
          {currentStyle && (
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: currentStyle.bg }}>
              <Text className="text-[10px] font-bold" style={{ color: currentStyle.text }}>
                {currentStyle.label.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-ink-soft">
          {nextTier
            ? `${group.actual_count}/${nextTier.target_count} ${lang === 'en' ? 'to' : 'papunta sa'} ${TIER_STYLE[nextTier.tier].label}`
            : (lang === 'en' ? 'Maxed out 💎' : 'Pinakamataas na 💎')}
        </Text>
      </View>
      {nextTier && (
        <Text className="text-xs text-gold-500 font-medium">+{nextTier.xp_reward} XP</Text>
      )}
    </View>
  );
}
