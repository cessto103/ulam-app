import BrandLogo from '@/src/components/BrandLogo'
import ThemedSection from '@/src/components/ThemedSection';
import { HeaderWave } from '@/src/components/ULamLogo';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HeaderTab = {
  key: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
};

type GradientPageHeaderProps = {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  tabs?: HeaderTab[];
  children?: ReactNode;
  waveFill?: string;
  /** Renders a photo background (admin-themeable) behind the gradient instead of a flat gradient. */
  photo?: boolean;
};

const HEADER_GRADIENT = ['#CC5027', '#E7653B', '#EC8156'];

export default function GradientPageHeader({
  title,
  subtitle,
  rightSlot,
  tabs,
  children,
  waveFill = '#FFF8E8',
  photo = false,
}: GradientPageHeaderProps) {
  const insets = useSafeAreaInsets();
  const Wrapper = photo ? ThemedSection : LinearGradient;
  const wrapperProps = photo
    ? {
        sectionKey: 'header',
        compiledImage: require('@/assets/profile-header-food.jpg'),
        compiledOverlayColors: HEADER_GRADIENT,
      }
    : {
        colors: HEADER_GRADIENT,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      };

  return (
    <Wrapper {...(wrapperProps as any)}>
      <View
        className={tabs?.length ? 'px-4' : 'px-4 pb-1'}
        style={{ paddingTop: insets.top + 10 }}
      >
        <View className="flex-row items-center justify-between">
          <BrandLogo size={21} light />
          {rightSlot}
        </View>

        {(title || subtitle) && (
          <View className="mt-3">
            {title ? (
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 22, color: '#FFFFFF' }}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                style={{
                  fontFamily: 'NunitoSans_600SemiBold',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.9)',
                  marginTop: 2,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}

        {children}

        {tabs?.length ? (
          <View className="flex-row gap-1 mt-3">
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={tab.onPress}
                className="px-3 py-2 rounded-t-2xl"
                style={{ backgroundColor: tab.active ? waveFill : 'transparent' }}
              >
                <Text
                  style={{
                    fontFamily: 'NunitoSans_700Bold',
                    fontSize: 12,
                    color: tab.active ? '#5E693F' : 'rgba(255,255,255,0.62)',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {tabs?.length ? null : <HeaderWave fill={waveFill} />}
    </Wrapper>
  );
}
