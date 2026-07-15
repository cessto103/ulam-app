import LanguageSwitcher from '@/src/components/LanguageSwitcher';
import BrandLogo from '@/src/components/BrandLogo';
import { FoodDoodles } from '@/src/components/ULamLogo';
import { useLanguage } from '@/src/context/LanguageContext';
import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function WelcomeScreen() {
  const { t } = useLanguage();

  return (
    <SafeAreaView className="flex-1 bg-cream-100">
      <View className="flex-1 justify-between">

        {/* Language switcher top-right */}
        <View className="items-end px-6 pt-2">
          <LanguageSwitcher tone="warm" />
        </View>

        {/* Hero: script wordmark + tagline */}
        <View className="items-center px-6">
          <BrandLogo size={82} />
          <Text
            style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 15, color: '#000000', marginTop: 30 }}
          >
            {t('welcome_tag1')}
          </Text>
          <Text
            style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 15, color: '#E7653B', marginTop: 4 }}
          >
            {t('welcome_tag2')}
          </Text>
        </View>

        {/* Doodle band + buttons */}
        <View>
          <View pointerEvents="none">
            <FoodDoodles height={185} opacity={0.16} />
          </View>

          <View className="px-5 pt-3 pb-4 gap-3">
            <Link href="/(auth)/register" asChild>
              <Pressable
                className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80"
                style={{ shadowColor: '#C45E3A', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
              >
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: 'white' }}>{t('get_started')}</Text>
              </Pressable>
            </Link>
            <Link href="/(auth)/login" asChild>
              <Pressable className="w-full rounded-2xl border border-cream-300 bg-cream-50 py-4 items-center active:opacity-70">
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 15, color: '#000000' }}>{t('have_account')}</Text>
              </Pressable>
            </Link>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#D3C5AB', textAlign: 'center', marginTop: 2 }}>
              v{APP_VERSION}
            </Text>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}
