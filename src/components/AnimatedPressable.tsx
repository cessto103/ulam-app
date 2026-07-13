import { useRef } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

type HapticKind = 'light' | 'medium' | 'heavy' | 'selection' | 'none';

type AnimatedPressableProps = Omit<PressableProps, 'style'> & {
  /** How far it shrinks on press-in (1 = no shrink). Default 0.94 — a subtle tap-back. */
  scaleTo?: number;
  haptic?: HapticKind;
  // Unlike plain Pressable, this can't take the (state) => style function
  // form — the transform is driven by an Animated.Value in this same slot.
  style?: StyleProp<ViewStyle>;
};

function fireHaptic(kind: HapticKind) {
  if (kind === 'none') return;
  if (kind === 'selection') {
    Haptics.selectionAsync();
    return;
  }
  const impactStyle = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  }[kind];
  Haptics.impactAsync(impactStyle);
}

// A single animatable element (not a wrapping View + inner Pressable) so
// `style` behaves exactly like a plain Pressable's — critical when the
// caller relies on it (e.g. `flex: 1` to size correctly inside a tab bar
// row). A two-box wrapper silently drops layout-affecting style passed to
// the outer box, which is what caused the center tab button to misalign.
const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);

/**
 * Drop-in Pressable replacement: adds a spring scale-down on press and a
 * haptic tick, using the same Animated API already used elsewhere in this
 * app (onboarding, recipe gallery) rather than introducing Reanimated as a
 * second animation system.
 */
export default function AnimatedPressable({
  scaleTo = 0.94,
  haptic = 'light',
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedTouchable
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e: any) => {
        Animated.spring(scale, {
          toValue: scaleTo,
          useNativeDriver: true,
          speed: 50,
          bounciness: 6,
        }).start();
        fireHaptic(haptic);
        onPressIn?.(e);
      }}
      onPressOut={(e: any) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 6,
        }).start();
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedTouchable>
  );
}
