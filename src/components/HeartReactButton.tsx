import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, type GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
  reacted: boolean;
  count: number;
  onPress: (e: GestureResponderEvent) => void;
  size?: number;
};

/** Heart/puso reaction toggle: pops on like (not on unlike), light haptic on every tap. */
export default function HeartReactButton({ reacted, count, onPress, size = 16 }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasReacted = useRef(reacted);

  useEffect(() => {
    // Only burst going FROM unliked TO liked — un-liking shouldn't celebrate.
    if (reacted && !wasReacted.current) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 40, bounciness: 14 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    }
    wasReacted.current = reacted;
  }, [reacted, scale]);

  return (
    <Pressable
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(e);
      }}
      hitSlop={6}
      className="flex-row items-center gap-1.5 active:opacity-70"
    >
      <Animated.Text style={{ fontSize: size, transform: [{ scale }] }}>
        {reacted ? '❤️' : '🤍'}
      </Animated.Text>
      <Text className={`text-xs font-medium ${reacted ? 'text-red-500' : 'text-ink-soft'}`}>
        {count}
      </Text>
    </Pressable>
  );
}
