import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { FONT_DEFS, GRADIENT_DEFS, type CollageStyle, type FontKey, type GradientKey } from '@/src/types/recipe';

const COVER_HEIGHT = 200;

interface Props {
  photos: string[];
  collageStyle: CollageStyle;
  gradientKey: GradientKey;
  fontKey?: FontKey;
  title: string;
  /** Override the default 200px cover height (e.g. compact horizontal cards). */
  height?: number;
}

function GradientCover({ gradientKey, fontKey = 'baloo', title, height }: { gradientKey: GradientKey; fontKey?: FontKey; title: string; height?: number }) {
  const { colors } = GRADIENT_DEFS[gradientKey];
  const { family } = FONT_DEFS[fontKey];
  const compact = height != null && height < 150;
  return (
    <LinearGradient
      colors={colors as LinearGradientProps['colors']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.coverBase, styles.gradientCover, height != null ? { height } : null]}
    >
      <Text
        style={[
          styles.gradientTitle,
          { fontFamily: family, fontStyle: fontKey === 'baloo' ? 'italic' : 'normal' },
          compact ? { fontSize: 14, paddingHorizontal: 8 } : null,
        ]}
        numberOfLines={compact ? 2 : 3}
      >
        {title || 'Recipe'}
      </Text>
    </LinearGradient>
  );
}

export default function RecipeCoverPhoto({ photos, collageStyle, gradientKey, fontKey = 'baloo', title, height }: Props) {
  const hStyle = height != null ? { height } : null;
  const hasPhotos = photos.length > 0;
  const effective: CollageStyle = !hasPhotos || collageStyle === 'gradient' ? 'gradient' : collageStyle;

  if (effective === 'gradient') {
    return <GradientCover gradientKey={gradientKey} fontKey={fontKey} title={title} height={height} />;
  }

  if (effective === 'split' && photos.length >= 2) {
    return (
      <View style={[styles.coverBase, hStyle]}>
        <View style={[styles.flexHalf, { borderRightWidth: 3, borderRightColor: '#fff' }]}>
          <Image source={{ uri: photos[0] }} style={styles.fillImage} resizeMode="cover" />
        </View>
        <View style={styles.flexHalf}>
          <Image source={{ uri: photos[1] }} style={styles.fillImage} resizeMode="cover" />
        </View>
      </View>
    );
  }

  if (effective === 'circle_right' && photos.length >= 2) {
    return (
      <View style={[styles.coverBase, { overflow: 'hidden' }, hStyle]}>
        <Image source={{ uri: photos[1] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={styles.circleMask}>
          <Image source={{ uri: photos[0] }} style={styles.fillImage} resizeMode="cover" />
        </View>
      </View>
    );
  }

  if (effective === 'three_col' && photos.length >= 3) {
    return (
      <View style={[styles.coverBase, hStyle]}>
        <View style={styles.flexHalf}>
          <Image source={{ uri: photos[0] }} style={styles.fillImage} resizeMode="cover" />
        </View>
        <View style={[styles.flexHalf, { marginHorizontal: 1.5 }]}>
          <Image source={{ uri: photos[1] }} style={styles.fillImage} resizeMode="cover" />
        </View>
        <View style={styles.flexHalf}>
          <Image source={{ uri: photos[2] }} style={styles.fillImage} resizeMode="cover" />
        </View>
      </View>
    );
  }

  if (effective === 'top_bottom' && photos.length >= 2) {
    return (
      <View style={[styles.coverBase, { flexDirection: 'column' }, hStyle]}>
        <View style={[styles.flexHalf, { marginBottom: 1.5 }]}>
          <Image source={{ uri: photos[0] }} style={styles.fillImage} resizeMode="cover" />
        </View>
        <View style={styles.flexHalf}>
          <Image source={{ uri: photos[1] }} style={styles.fillImage} resizeMode="cover" />
        </View>
      </View>
    );
  }

  // Fallback: single full-bleed photo or gradient
  if (photos.length > 0) {
    return (
      <View style={[styles.coverBase, hStyle]}>
        <Image source={{ uri: photos[0] }} style={styles.fillImage} resizeMode="cover" />
      </View>
    );
  }

  return <GradientCover gradientKey={gradientKey} fontKey={fontKey} title={title} height={height} />;
}

const styles = StyleSheet.create({
  coverBase: {
    width: '100%',
    height: COVER_HEIGHT,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gradientCover: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexHalf: {
    flex: 1,
    overflow: 'hidden',
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
  circleMask: {
    position: 'absolute',
    left: -20,
    top: 20, // (200 - 160) / 2
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  gradientTitle: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 34,
    alignSelf: 'stretch',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
});
