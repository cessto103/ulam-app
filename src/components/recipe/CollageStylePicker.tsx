import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FONT_DEFS, FONT_KEYS, GRADIENT_DEFS, GRADIENT_KEYS, type CollageStyle, type FontKey, type GradientKey } from '@/src/types/recipe';

interface Props {
  visible: boolean;
  currentStyle: CollageStyle;
  currentGradient: GradientKey;
  currentFont: FontKey;
  photoCount: number;
  onApply: (style: CollageStyle, gradient: GradientKey, font: FontKey) => void;
  onCancel: () => void;
}

type LayoutOption = { key: CollageStyle; label: string; minPhotos: number };

const LAYOUT_OPTIONS: LayoutOption[] = [
  { key: 'split',        label: 'Side by side',  minPhotos: 2 },
  { key: 'circle_right', label: 'Circle + right', minPhotos: 2 },
  { key: 'full',         label: 'Full bleed',     minPhotos: 1 },
  { key: 'three_col',    label: '3 columns',      minPhotos: 3 },
  { key: 'top_bottom',   label: 'Top + bottom',   minPhotos: 2 },
  { key: 'gradient',     label: 'Gradient only',  minPhotos: 0 },
];

// ── Mini preview renderers ────────────────────────────────────────────────────

function MiniSplit() {
  return (
    <View style={styles.miniWrap}>
      <View style={[styles.miniHalf, { borderRightWidth: 2, borderRightColor: '#fff', backgroundColor: '#B9D0AE' }]} />
      <View style={[styles.miniHalf, { backgroundColor: '#94B389' }]} />
    </View>
  );
}

function MiniCircleRight() {
  return (
    <View style={[styles.miniWrap, { backgroundColor: '#94B389', overflow: 'hidden' }]}>
      <View style={{
        position: 'absolute', left: -6, top: 14,
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#B9D0AE', borderWidth: 2, borderColor: '#fff',
      }} />
    </View>
  );
}

function MiniFull() {
  return <View style={[styles.miniWrap, { backgroundColor: '#B9D0AE' }]} />;
}

function MiniThreeCol() {
  return (
    <View style={[styles.miniWrap, { flexDirection: 'row' }]}>
      <View style={{ flex: 1, backgroundColor: '#B9D0AE' }} />
      <View style={{ flex: 1, backgroundColor: '#8FC4A8', marginHorizontal: 1.5 }} />
      <View style={{ flex: 1, backgroundColor: '#94B389' }} />
    </View>
  );
}

function MiniTopBottom() {
  return (
    <View style={[styles.miniWrap, { flexDirection: 'column' }]}>
      <View style={{ flex: 1, backgroundColor: '#B9D0AE', marginBottom: 1.5 }} />
      <View style={{ flex: 1, backgroundColor: '#94B389' }} />
    </View>
  );
}

function MiniGradient({ gradientKey }: { gradientKey: GradientKey }) {
  const { colors } = GRADIENT_DEFS[gradientKey];
  return (
    <LinearGradient colors={colors as LinearGradientProps['colors']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.miniWrap, { borderRadius: 7 }]} />
  );
}

function MiniPreview({ optKey, gradientKey }: { optKey: CollageStyle; gradientKey: GradientKey }) {
  switch (optKey) {
    case 'split':        return <MiniSplit />;
    case 'circle_right': return <MiniCircleRight />;
    case 'full':         return <MiniFull />;
    case 'three_col':    return <MiniThreeCol />;
    case 'top_bottom':   return <MiniTopBottom />;
    case 'gradient':     return <MiniGradient gradientKey={gradientKey} />;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CollageStylePicker({
  visible, currentStyle, currentGradient, currentFont, photoCount, onApply, onCancel,
}: Props) {
  const [style, setStyle]       = useState<CollageStyle>(currentStyle);
  const [gradient, setGradient] = useState<GradientKey>(currentGradient);
  const [font, setFont]         = useState<FontKey>(currentFont);

  useEffect(() => {
    if (visible) {
      setStyle(currentStyle);
      setGradient(currentGradient);
      setFont(currentFont);
    }
  }, [visible, currentStyle, currentGradient, currentFont]);

  const showGradientSection = style === 'gradient' || photoCount === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onCancel} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>Cover & Photo Style</Text>
          <Text style={styles.sheetSub}>How should your recipe look on the feed?</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            {/* Section 1: Layout */}
            <Text style={styles.secLabel}>PHOTO COLLAGE LAYOUT</Text>
            <View style={styles.layoutGrid}>
              {LAYOUT_OPTIONS.map((opt) => {
                const active    = style === opt.key;
                const available = photoCount >= opt.minPhotos;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => available && setStyle(opt.key)}
                    style={[
                      styles.layoutOpt,
                      active     && styles.layoutOptActive,
                      !available && styles.layoutOptDim,
                    ]}
                  >
                    <MiniPreview optKey={opt.key} gradientKey={gradient} />
                    {active && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                    <View style={styles.optLabelWrap}>
                      <Text style={styles.optLabelText} numberOfLines={1}>{opt.label}</Text>
                    </View>
                    {!available && opt.minPhotos > 0 && (
                      <View style={styles.optLabelWrap}>
                        <Text style={[styles.optLabelText, { color: '#F0DEBB' }]}>
                          {opt.minPhotos}+ photos
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Section 2: Gradient + Font */}
            {showGradientSection && (
              <>
                <Text style={[styles.secLabel, { marginTop: 4 }]}>GRADIENT COLOR</Text>
                <View style={styles.gradGrid}>
                  {GRADIENT_KEYS.map((key) => {
                    const active = gradient === key;
                    const { colors } = GRADIENT_DEFS[key];
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setGradient(key)}
                        style={[styles.gradOpt, active && styles.gradOptActive]}
                      >
                        <LinearGradient
                          colors={colors as LinearGradientProps['colors']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        {active && (
                          <View style={styles.gradCheck}>
                            <Text style={styles.gradCheckText}>✓</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.secLabel, { marginTop: 4 }]}>TITLE FONT</Text>
                <View style={styles.fontGrid}>
                  {FONT_KEYS.map((key) => {
                    const active = font === key;
                    const { family, label } = FONT_DEFS[key];
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setFont(key)}
                        style={[styles.fontOpt, active && styles.fontOptActive]}
                      >
                        <Text style={[styles.fontPreview, { fontFamily: family }, active && styles.fontPreviewActive]}>
                          {label}
                        </Text>
                        {active && (
                          <View style={styles.fontCheck}>
                            <Text style={styles.gradCheckText}>✓</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <Pressable style={styles.btnCancel} onPress={onCancel}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.btnApply} onPress={() => onApply(style, gradient, font)}>
              <Text style={styles.btnApplyText}>Apply Style ✓</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#F0DEBB', alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#292522', marginBottom: 2,
  },
  sheetSub: {
    fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', marginBottom: 16,
  },
  secLabel: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: '#6F655A',
    letterSpacing: 0.7, marginBottom: 10,
  },
  // Layout grid: 3 columns
  layoutGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  layoutOpt: {
    width: '31%', height: 64,
    borderRadius: 10, borderWidth: 2, borderColor: '#F0DEBB',
    overflow: 'hidden', position: 'relative',
  },
  layoutOptActive: {
    borderColor: '#6E7B4A',
  },
  layoutOptDim: {
    opacity: 0.45,
  },
  checkBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#6E7B4A',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 5,
  },
  checkText: {
    color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14,
  },
  optLabelWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 2, paddingHorizontal: 2,
  },
  optLabelText: {
    color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3,
  },
  // Gradient grid: 4 columns
  gradGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20,
  },
  gradOpt: {
    width: '22%', height: 48,
    borderRadius: 10, borderWidth: 2, borderColor: 'transparent',
    overflow: 'hidden', position: 'relative',
  },
  gradOptActive: {
    borderColor: '#292522',
    transform: [{ scale: 1.06 }],
  },
  gradCheck: {
    position: 'absolute', top: 3, right: 3,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  gradCheckText: {
    color: '#5E693F', fontSize: 10, fontWeight: '900', lineHeight: 13,
  },
  // Buttons
  btnRow: {
    flexDirection: 'row', gap: 8, marginTop: 4,
  },
  btnCancel: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, borderWidth: 0.5, borderColor: '#F0DEBB',
  },
  btnCancelText: {
    fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#6F655A',
  },
  btnApply: {
    flex: 1, paddingVertical: 12,
    backgroundColor: '#C45E3A', borderRadius: 10, alignItems: 'center',
  },
  btnApplyText: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff',
  },
  // Font picker
  fontGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20,
  },
  fontOpt: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#F0DEBB',
    backgroundColor: '#FFFCF5', position: 'relative',
  },
  fontOptActive: {
    borderColor: '#6E7B4A', backgroundColor: '#EFF4EC',
  },
  fontPreview: {
    fontSize: 20, color: '#292522',
  },
  fontPreviewActive: {
    color: '#5E693F',
  },
  fontCheck: {
    position: 'absolute', top: 3, right: 3,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#6E7B4A',
    alignItems: 'center', justifyContent: 'center',
  },
  // Mini preview shared
  miniWrap: {
    flex: 1, flexDirection: 'row',
  },
  miniHalf: {
    flex: 1,
  },
});
