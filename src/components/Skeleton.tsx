import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { ViewStyle } from 'react-native';

// Base animated pulse box
export function Skeleton({ style, radius = 8 }: { style?: ViewStyle; radius?: number }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,    duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ backgroundColor: '#F0DEBB', borderRadius: radius }, style, { opacity }]}
    />
  );
}

// Row of skeletons
export function SkeletonRow({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', gap }}>{children}</View>;
}

// ─── Page-level skeleton screens ─────────────────────────────────────────────

export function SkeletonBudgetCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', borderLeftWidth: 3, borderLeftColor: '#D1FAE5', padding: 16, marginBottom: 12 }}>
      <Skeleton style={{ height: 11, width: 100, marginBottom: 8 }} />
      <Skeleton style={{ height: 34, width: 140, marginBottom: 4 }} />
      <Skeleton style={{ height: 10, width: 70, marginBottom: 14 }} />
      <Skeleton style={{ height: 6, borderRadius: 3, marginBottom: 8 }} />
      <SkeletonRow>
        <Skeleton style={{ height: 10, width: 100 }} />
        <Skeleton style={{ height: 24, width: 70, marginLeft: 'auto', borderRadius: 20 }} />
      </SkeletonRow>
    </View>
  );
}

export function SkeletonStatsRow() {
  return (
    <SkeletonRow gap={12}>
      {[0,1,2].map(i => (
        <View key={i} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#F0DEBB', padding: 12 }}>
          <Skeleton style={{ height: 10, width: 40, marginBottom: 6 }} />
          <Skeleton style={{ height: 22, width: 60 }} />
        </View>
      ))}
    </SkeletonRow>
  );
}

export function SkeletonStreakCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', padding: 12, marginBottom: 12 }}>
      <SkeletonRow gap={6}>
        {[0,1,2,3,4,5,6].map(i => (
          <Skeleton key={i} style={{ flex: 1, height: 32, borderRadius: 6 }} />
        ))}
      </SkeletonRow>
    </View>
  );
}

export function SkeletonRecipeCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden', marginBottom: 12, marginHorizontal: 16 }}>
      <Skeleton style={{ height: 160, borderRadius: 0 }} />
      <View style={{ padding: 14 }}>
        <SkeletonRow gap={6}>
          <Skeleton style={{ height: 20, width: 55, borderRadius: 20 }} />
          <Skeleton style={{ height: 20, width: 45, borderRadius: 20 }} />
        </SkeletonRow>
        <Skeleton style={{ height: 20, width: '80%', marginTop: 10, marginBottom: 6 }} />
        <Skeleton style={{ height: 14, marginBottom: 4 }} />
        <Skeleton style={{ height: 14, width: '60%', marginBottom: 12 }} />
        <Skeleton style={{ height: 38, borderRadius: 12 }} />
      </View>
    </View>
  );
}

export function SkeletonPriceCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden', marginBottom: 12 }}>
      {[0,1,2,3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#FFFCF5' }}>
          <View style={{ flex: 1 }}>
            <Skeleton style={{ height: 13, width: '60%', marginBottom: 5 }} />
            <Skeleton style={{ height: 10, width: '40%' }} />
          </View>
          <Skeleton style={{ height: 18, width: 55 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonMealCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', overflow: 'hidden', marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
        <Skeleton style={{ width: 36, height: 36, borderRadius: 10 }} />
        <View style={{ flex: 1 }}>
          <Skeleton style={{ height: 10, width: 80, marginBottom: 5 }} />
          <Skeleton style={{ height: 14, width: '70%' }} />
        </View>
        <Skeleton style={{ height: 14, width: 40 }} />
      </View>
    </View>
  );
}

export function SkeletonMarketCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', padding: 16, marginBottom: 10, width: 180 }}>
      <SkeletonRow gap={10}>
        <View style={{ flex: 1 }}>
          <Skeleton style={{ height: 16, width: '60%', marginBottom: 6 }} />
          <Skeleton style={{ height: 11, width: '40%', marginBottom: 4 }} />
          <Skeleton style={{ height: 11, width: '30%' }} />
        </View>
        <Skeleton style={{ width: 52, height: 52, borderRadius: 14 }} />
      </SkeletonRow>
    </View>
  );
}

export function SkeletonListItem() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#FFFCF5' }}>
      <Skeleton style={{ width: 20, height: 20, borderRadius: 4 }} />
      <View style={{ flex: 1 }}>
        <Skeleton style={{ height: 14, width: '70%', marginBottom: 5 }} />
        <Skeleton style={{ height: 10, width: '45%' }} />
      </View>
      <Skeleton style={{ height: 14, width: 36 }} />
    </View>
  );
}

/** Feed / post-detail placeholder card. */
export function SkeletonPostCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#F0DEBB', padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Skeleton style={{ width: 48, height: 48 }} radius={24} />
        <View style={{ flex: 1 }}>
          <Skeleton style={{ height: 12, width: '50%', marginBottom: 6 }} />
          <Skeleton style={{ height: 10, width: '30%' }} />
        </View>
      </View>
      <Skeleton style={{ height: 12, width: '92%', marginBottom: 6 }} />
      <Skeleton style={{ height: 12, width: '70%', marginBottom: 12 }} />
      <Skeleton style={{ height: 140 }} radius={12} />
    </View>
  );
}
