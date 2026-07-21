import client, { API_URL } from '@/src/api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { ImageBackground, View } from 'react-native';

type SectionConfig = {
  image?: string | null;
  focal_x?: number;
  focal_y?: number;
  fit?: 'cover' | 'contain';
  overlay_colors?: string[];
  overlay_opacity?: number;
};

type ThemeResponse = { sections: Record<string, SectionConfig> };

function hexToRgba(color: string, opacity: number): string {
  if (opacity >= 1 || !color.startsWith('#')) return color;
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/**
 * Color-only variant for boxes with no background image (e.g. Awards stat tiles).
 * `overlay_colors` is reused as [backgroundColor, textColor] for these sections.
 */
export function useSectionColors(sectionKey: string, fallback: [string, string]): [string, string] {
  const { data } = useQuery({
    queryKey: ['theme'],
    queryFn: async () => (await client.get<ThemeResponse>('/theme')).data,
    // Admin-controlled and expected to reflect promptly when changed --
    // 30 minutes made a fresh theme change look broken to anyone testing it
    // via a normal background/foreground cycle (the AppState-driven
    // refetch-on-focus in app/_layout.tsx only refetches when the cached
    // data is actually stale, so it silently did nothing inside that
    // window). The endpoint itself is a single indexed query with no
    // server-side caching, so a short staleTime here is cheap.
    staleTime: 2 * 60_000,
    retry: 1,
  });

  const colors = data?.sections?.[sectionKey]?.overlay_colors;
  if (colors?.length === 2) return [colors[0], colors[1]];
  return fallback;
}

/**
 * Admin-controlled background (image + focal point + fit + gradient/color overlay)
 * for the header, Home dashboard boxes, and Awards stat boxes. Falls back to the
 * compiled-in image/colors when the admin hasn't configured that section — same
 * pattern as BrandLogo for the app logo.
 */
type RadiusStyle = Pick<ViewStyle,
  'borderRadius' | 'borderTopLeftRadius' | 'borderTopRightRadius' | 'borderBottomLeftRadius' | 'borderBottomRightRadius'
>;

export default function ThemedSection({
  sectionKey,
  compiledImage,
  compiledOverlayColors,
  compiledFit = 'cover',
  compiledFocal = { x: 50, y: 50 },
  borderRadius = 0,
  style,
  children,
}: {
  sectionKey: string;
  compiledImage: ImageSourcePropType;
  compiledOverlayColors: string[];
  compiledFit?: 'cover' | 'contain';
  compiledFocal?: { x: number; y: number };
  borderRadius?: number | RadiusStyle;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const { data } = useQuery({
    queryKey: ['theme'],
    queryFn: async () => (await client.get<ThemeResponse>('/theme')).data,
    // Admin-controlled and expected to reflect promptly when changed --
    // 30 minutes made a fresh theme change look broken to anyone testing it
    // via a normal background/foreground cycle (the AppState-driven
    // refetch-on-focus in app/_layout.tsx only refetches when the cached
    // data is actually stale, so it silently did nothing inside that
    // window). The endpoint itself is a single indexed query with no
    // server-side caching, so a short staleTime here is cheap.
    staleTime: 2 * 60_000,
    retry: 1,
  });

  const cfg = data?.sections?.[sectionKey];
  const imageSource: ImageSourcePropType = cfg?.image ? { uri: `${API_URL}${cfg.image}` } : compiledImage;
  const fit = cfg?.fit ?? compiledFit;
  const focalX = cfg?.focal_x ?? compiledFocal.x;
  const focalY = cfg?.focal_y ?? compiledFocal.y;
  const opacity = cfg?.overlay_opacity ?? 1;
  const colors = (cfg?.overlay_colors?.length ? cfg.overlay_colors : compiledOverlayColors)
    .map((c) => hexToRgba(c, opacity));
  const radiusStyle: RadiusStyle = typeof borderRadius === 'number' ? { borderRadius } : borderRadius;

  return (
    <ImageBackground
      source={imageSource}
      resizeMode={fit}
      style={[{ overflow: 'hidden' }, radiusStyle, style]}
      imageStyle={fit === 'cover' ? {
        ...radiusStyle,
        width: '140%',
        height: '140%',
        left: `${-40 * (focalX / 100)}%`,
        top: `${-40 * (focalY / 100)}%`,
      } as any : radiusStyle}
    >
      {colors.length >= 2 ? (
        <LinearGradient
          colors={colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : colors.length === 1 ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors[0] }} />
      ) : null}
      {children}
    </ImageBackground>
  );
}
