import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

export default function StarRating({ myRating, avgRating, count, onRate, noRatingsLabel }: {
  myRating: number | null; avgRating: number; count: number; onRate: (r: number) => void;
  noRatingsLabel?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? myRating ?? 0;
  const scale = useRef(new Animated.Value(1)).current;
  const lastRating = useRef(myRating);

  useEffect(() => {
    if (myRating !== null && myRating !== lastRating.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 30, bounciness: 16 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
      ]).start();
    }
    lastRating.current = myRating;
  }, [myRating]);

  return (
    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => onRate(star)} hitSlop={6}>
            <Animated.Text
              style={{
                fontSize: 28,
                color: star <= display ? '#F4B942' : '#D3C5AB',
                transform: [{ scale: star <= (myRating ?? 0) ? scale : 1 }],
              }}
            >
              ★
            </Animated.Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
        {myRating ? `Your rating: ${myRating}/5 · ` : ''}
        {count > 0 ? `${avgRating.toFixed(1)} avg (${count} rating${count !== 1 ? 's' : ''})` : (noRatingsLabel ?? 'No ratings yet')}
      </Text>
    </View>
  );
}
