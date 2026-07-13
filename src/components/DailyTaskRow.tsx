import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
  label: string;
  done: boolean;
  xp: number;
  onPress?: () => void;
  isLast?: boolean;
};

/** A single Daily Tasks row — pill pops and haptic fires the moment `done` flips to true. */
export default function DailyTaskRow({ label, done, xp, onPress, isLast }: Props) {
  const pillScale = useRef(new Animated.Value(1)).current;
  const wasDone = useRef(done);

  useEffect(() => {
    if (done && !wasDone.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.spring(pillScale, { toValue: 1.25, useNativeDriver: true, speed: 40, bounciness: 14 }),
        Animated.spring(pillScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    }
    wasDone.current = done;
  }, [done, pillScale]);

  return (
    <Pressable
      onPress={done ? undefined : onPress}
      className={`flex-row justify-between items-center px-4 py-3 ${
        isLast ? '' : 'border-b border-cream-200'
      } ${!done ? 'active:bg-cream-50' : ''}`}
    >
      <Text className={`text-xs flex-1 ${done ? 'text-ink-soft line-through' : 'text-ink'}`}>
        {label}
      </Text>
      <Animated.View
        style={{ transform: [{ scale: pillScale }] }}
        className={`rounded-full px-2.5 py-0.5 ml-2 ${done ? 'bg-cream-200' : 'bg-gold-50'}`}
      >
        <Text className={`text-xs font-semibold ${done ? 'text-olive-500' : 'text-gold-600'}`}>
          {done ? `✓ +${xp} XP` : `+${xp} XP`}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
