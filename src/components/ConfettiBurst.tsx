import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

const COLORS = ['#E7653B', '#386641', '#F4B942', '#C45E3A', '#6E7B4A', '#E5A26F', '#FFFFFF'];
const PIECE_COUNT = 60;

type Piece = {
  id: number;
  originX: number;
  originY: number;
  targetX: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle';
  delay: number;
  duration: number;
  spins: number;
};

function makePieces(width: number, height: number): Piece[] {
  const originX = width / 2;
  const originY = height * 0.4;

  return Array.from({ length: PIECE_COUNT }).map((_, i) => ({
    id: i,
    originX,
    originY,
    // Spread targets across the full screen width so the burst reads as
    // covering the whole screen, not just a small area around the origin.
    targetX: Math.random() * width,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    delay: Math.random() * 200,
    duration: 1800 + Math.random() * 1400,
    spins: 2 + Math.random() * 4,
  }));
}

function ConfettiPiece({ piece, screenHeight }: { piece: Piece; screenHeight: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: piece.duration,
      delay: piece.delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallDistance = screenHeight - piece.originY + 60;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, fallDistance] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, piece.targetX - piece.originX] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spins * 360}deg`] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.originX,
        top: piece.originY,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    >
      <Svg width={piece.size} height={piece.size}>
        {piece.shape === 'rect' ? (
          <Rect width={piece.size} height={piece.size * 0.45} fill={piece.color} rx={1} />
        ) : (
          <Circle cx={piece.size / 2} cy={piece.size / 2} r={piece.size / 2} fill={piece.color} />
        )}
      </Svg>
    </Animated.View>
  );
}

/**
 * Full-screen confetti burst — mount with a fresh `key` each time it should
 * replay (piece trajectories are only randomized once, on mount).
 */
export default function ConfettiBurst() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(width, height), [width, height]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} piece={p} screenHeight={height} />
      ))}
    </View>
  );
}
