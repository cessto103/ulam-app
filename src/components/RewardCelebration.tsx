import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/src/context/LanguageContext';

export type UnlockedAchievement = {
  id: number;
  name: string;
  icon: string | null;
  xp_reward: number;
};

export type Reward = {
  xpEarned: number;
  leveledUp?: boolean;
  newLevel?: number | null;
  newAchievements?: UnlockedAchievement[];
};

type Props = {
  reward: Reward | null;
  /** Called once the whole sequence (XP -> level-up -> achievements) has played and faded out. */
  onDismiss: () => void;
};

/**
 * Self-contained celebration overlay for XP-earning moments: an XP pill that
 * pops in with a count-up, then (if applicable) a level-up burst, then
 * (if applicable) achievement-unlocked cards, staggered one after another.
 * Mount once near a screen's root and pass `reward` — it plays automatically
 * on every non-null value and calls onDismiss when done.
 */
export default function RewardCelebration({ reward, onDismiss }: Props) {
  const { lang } = useLanguage();
  const [displayXp, setDisplayXp] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [achievementIndex, setAchievementIndex] = useState(-1);

  const pillScale = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reward) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const achievements = reward.newAchievements ?? [];

    // Reset
    setDisplayXp(0);
    setShowLevelUp(false);
    setAchievementIndex(-1);
    pillScale.setValue(0);
    pillOpacity.setValue(0);
    levelUpScale.setValue(0);
    cardScale.setValue(0);
    overlayOpacity.setValue(0);

    Animated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    // Stage 1 — XP pill pop + count-up
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(pillScale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10 }),
      Animated.timing(pillOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    const countDuration = 500;
    const countStart = Date.now();
    const countStep = () => {
      if (cancelled) return;
      const t = Math.min(1, (Date.now() - countStart) / countDuration);
      setDisplayXp(Math.round(reward.xpEarned * (1 - Math.pow(1 - t, 3)))); // ease-out cubic
      if (t < 1) requestAnimationFrame(countStep);
    };
    requestAnimationFrame(countStep);

    let elapsed = 900;

    // Stage 2 — level up burst
    if (reward.leveledUp) {
      timers.push(setTimeout(() => {
        setShowLevelUp(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.spring(levelUpScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
      }, elapsed));
      elapsed += 1100;
    }

    // Stage 3 — achievement cards, one at a time
    achievements.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setAchievementIndex(i);
        cardScale.setValue(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
      }, elapsed));
      elapsed += 1300;
    });

    // Final — fade out and dismiss
    timers.push(setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, elapsed + 400));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward]);

  if (!reward) return null;

  const achievements = reward.newAchievements ?? [];
  const currentAchievement = achievementIndex >= 0 ? achievements[achievementIndex] : null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: overlayOpacity,
      }}
    >
      {/* XP pill */}
      {reward.xpEarned > 0 && !showLevelUp && !currentAchievement && (
        <Animated.View
          style={{
            transform: [{ scale: pillScale }],
            opacity: pillOpacity,
            backgroundColor: '#F4B942',
            borderRadius: 999,
            paddingHorizontal: 20,
            paddingVertical: 10,
            shadowColor: '#C4881C',
            shadowOpacity: 0.4,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <Text style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: 20, color: '#000000' }}>
            +{displayXp} XP
          </Text>
        </Animated.View>
      )}

      {/* Level up burst */}
      {showLevelUp && (
        <Animated.View
          style={{
            transform: [{ scale: levelUpScale }],
            alignItems: 'center',
            backgroundColor: '#386641',
            borderRadius: 24,
            paddingHorizontal: 28,
            paddingVertical: 18,
            shadowColor: '#203C26',
            shadowOpacity: 0.4,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          }}
        >
          <Text style={{ fontSize: 34, marginBottom: 4 }}>🎉</Text>
          <Text style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: 22, color: '#fff' }}>
            {lang === 'en' ? 'LEVEL UP!' : 'LEVEL UP!'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#DCE8D6' }}>
            {lang === 'en' ? `You reached Level ${reward.newLevel}` : `Level ${reward.newLevel} ka na!`}
          </Text>
        </Animated.View>
      )}

      {/* Achievement unlocked card */}
      {currentAchievement && (
        <Animated.View
          style={{
            transform: [{ scale: cardScale }],
            alignItems: 'center',
            backgroundColor: '#FFFCF5',
            borderRadius: 20,
            borderWidth: 2,
            borderColor: '#F4B942',
            paddingHorizontal: 24,
            paddingVertical: 18,
            maxWidth: 280,
            shadowColor: '#C4881C',
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 9,
          }}
        >
          <Text style={{ fontSize: 36, marginBottom: 6 }}>{currentAchievement.icon || '🏆'}</Text>
          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#C4881C', letterSpacing: 1, marginBottom: 2 }}>
            {lang === 'en' ? 'ACHIEVEMENT UNLOCKED' : 'NA-UNLOCK NA ACHIEVEMENT'}
          </Text>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#000000', textAlign: 'center' }}>
            {currentAchievement.name}
          </Text>
          {currentAchievement.xp_reward > 0 && (
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#9A6A12', marginTop: 4 }}>
              +{currentAchievement.xp_reward} XP
            </Text>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}
