import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Returns an Animated.Value that pops (spring up then settle) the moment
 * `active` transitions from false to true, plus a haptic tick. Used for
 * reaction-style toggles (thumbs up, heart, star ratings) where selecting
 * should feel celebratory but deselecting shouldn't replay the same beat.
 */
export function usePopOnActivate(
  active: boolean,
  haptic: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium,
) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current) {
      Haptics.impactAsync(haptic);
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 40, bounciness: 14 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    }
    wasActive.current = active;
  }, [active, haptic, scale]);

  return scale;
}
