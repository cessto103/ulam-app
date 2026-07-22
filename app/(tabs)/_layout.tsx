import AnimatedPressable from '@/src/components/AnimatedPressable';
import LegalAcceptanceGate from '@/src/components/LegalAcceptanceGate';
import BrandLogo from '@/src/components/BrandLogo';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACTIVE    = '#E7653B'; // brand terracotta
const INACTIVE  = '#6F655A'; // ink-soft — ink-faint was too low-contrast for older users
const HEADER_BG = '#E7653B'; // terracotta header surface

function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  const iconName = focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap);
  const scale = useRef(new Animated.Value(1)).current;

  // A little "landing" pop whenever this tab becomes the active one.
  useEffect(() => {
    if (!focused) return;
    scale.setValue(0.75);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={iconName} size={22} color={color} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const insets = useSafeAreaInsets();

  // The system nav bar now renders as a solid black strip drawn by
  // AndroidNavBarFiller (see app/_layout.tsx), covering exactly the safe-area
  // inset this tab bar already reserves. That leaves no visible cream buffer
  // between the tab icons and the black strip, so add a bit extra here.
  const extraBottomPad = Platform.OS === 'android' ? 10 : 0;

  const createActions = [
    { icon: 'restaurant-outline' as const, label: lang === 'en' ? 'Create Recipe' : 'Gumawa ng Recipe', route: '/create-recipe' },
    { icon: 'chatbubble-ellipses-outline' as const, label: lang === 'en' ? 'New Post' : 'Bagong Post', route: '/create-post' },
    { icon: 'wallet-outline' as const, label: lang === 'en' ? 'Log Spending' : 'I-log ang Gastos', route: '/log-spending' },
    { icon: 'pricetag-outline' as const, label: lang === 'en' ? 'Report a Price' : 'Mag-report ng Presyo', route: '/report-price' },
  ];

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: HEADER_BG },
          headerTitleStyle: { fontFamily: 'Baloo2_600SemiBold', fontSize: 17, color: '#fff' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          headerTitle: () => (
            <View style={{ paddingLeft: 4 }}>
              <BrandLogo size={20} light />
            </View>
          ),
          tabBarStyle: {
            backgroundColor: '#FFFCF5',
            borderTopColor: '#F0DEBB',
            borderTopWidth: 0.5,
            height: 49 + insets.bottom + extraBottomPad,
            paddingBottom: insets.bottom + extraBottomPad,
          },
          tabBarLabelStyle: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 13 },
          tabBarActiveTintColor: ACTIVE,
          tabBarInactiveTintColor: INACTIVE,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            tabBarLabel: t('tab_home'),
            tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} />,
          }}
        />
        <Tabs.Screen
          name="meal-plan"
          options={{
            headerShown: false,
            tabBarLabel: t('tab_meal_plan'),
            tabBarIcon: ({ focused, color }) => <TabIcon name="restaurant" focused={focused} color={color} />,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            tabBarButton: () => (
              <AnimatedPressable
                onPress={() => setCreateOpen(true)}
                scaleTo={0.88}
                haptic="medium"
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel={lang === 'en' ? 'Create' : 'Gumawa'}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: '#C45E3A',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: -20,
                    borderWidth: 3,
                    borderColor: '#FFFCF5',
                    shadowColor: '#C45E3A',
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <Ionicons name="add" size={28} color="#fff" />
                </View>
              </AnimatedPressable>
            ),
          }}
        />
        <Tabs.Screen
          name="komunidad"
          options={{
            headerShown: false,
            tabBarLabel: t('tab_community'),
            tabBarIcon: ({ focused, color }) => <TabIcon name="people" focused={focused} color={color} />,
          }}
        />
        <Tabs.Screen
          name="presyo"
          options={{
            headerShown: false,
            tabBarLabel: t('tab_prices'),
            tabBarIcon: ({ focused, color }) => <TabIcon name="pricetag" focused={focused} color={color} />,
          }}
        />

        {/* Hidden screens (awards now lives inside Profile) */}
        <Tabs.Screen name="awards" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="budget" options={{ href: null }} />
        <Tabs.Screen name="market" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null, headerShown: false }} />
      </Tabs>

      {/* Mandatory review whenever a new Terms/Privacy version is published */}
      <LegalAcceptanceGate />

      {/* Create sheet opened by the center (+) button */}
      <Modal
        visible={createOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(41,37,34,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setCreateOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: '#FFFCF5',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 34,
            }}
          >
            <View
              style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#F0DEBB', marginBottom: 14 }}
            />
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#000000', marginBottom: 12 }}>
              {lang === 'en' ? 'Create' : 'Gumawa'}
            </Text>

            {createActions.map((a) => (
              <Pressable
                key={a.route}
                onPress={() => {
                  setCreateOpen(false);
                  router.push(a.route as any);
                }}
                className="flex-row items-center gap-3 py-3 active:opacity-70"
              >
                <View className="w-11 h-11 rounded-full bg-brand-50 items-center justify-center">
                  <Ionicons name={a.icon} size={19} color="#E7653B" />
                </View>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000' }}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
