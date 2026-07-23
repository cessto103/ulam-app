import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  dailyBudget: number;
  isPremium: boolean;
  onClose: () => void;
};

async function dismissForToday() {
  const todayKey = new Date().toISOString().slice(0, 10);
  await AsyncStorage.setItem(`whatsNextDismissed:${todayKey}`, '1').catch(() => {});
}

/**
 * Shown right after a budget save, only when the caller has confirmed the
 * user has no meal plan and nothing logged yet today -- so this is the
 * actual next useful action, not just a generic confirmation.
 */
export default function WhatsNextModal({ visible, dailyBudget, isPremium, onClose }: Props) {
  const router = useRouter();
  const { lang } = useLanguage();

  const handleMaybeLater = async () => {
    onClose();
    await dismissForToday();
    router.back();
  };

  const handleGenerateAI = () => {
    onClose();
    if (isPremium) {
      router.push('/(tabs)/meal-plan' as any);
      return;
    }
    Alert.alert(
      lang === 'en' ? '✨ Premium feature' : '✨ Premium feature',
      lang === 'en'
        ? 'AI Meal Plan is a Premium feature so we can generate personalized suggestions just for you. Want to see what Premium includes?'
        : 'Ang AI Meal Plan ay Premium feature para makagawa kami ng personalized na suhestiyon para sa iyo. Gusto mo bang makita ang Premium?',
      [
        { text: lang === 'en' ? 'Not now' : 'Huwag muna', style: 'cancel' },
        { text: lang === 'en' ? 'See Premium →' : 'Tingnan ang Premium →', onPress: () => router.push('/upgrade' as any) },
      ],
    );
  };

  const handleChooseRecipes = () => {
    onClose();
    router.push('/(tabs)/meal-plan?tab=recipes&filter=all' as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleMaybeLater}>
      <Pressable
        onPress={handleMaybeLater}
        style={{ flex: 1, backgroundColor: 'rgba(41,37,34,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
          <View className="bg-white rounded-3xl p-5">
            <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🎉</Text>
            <Text
              style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 18, color: '#292522', textAlign: 'center' }}
            >
              {lang === 'en' ? "You're all set!" : 'Nai-set na!'}
            </Text>
            <Text className="text-sm text-ink-soft text-center mt-1 mb-5">
              {lang === 'en'
                ? `Your daily food budget is ₱${dailyBudget.toFixed(2)}. What would you like to do next?`
                : `Ang iyong daily food budget ay ₱${dailyBudget.toFixed(2)}. Ano ang gusto mong gawin?`}
            </Text>

            <Pressable
              onPress={handleGenerateAI}
              className="flex-row items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-3 mb-2.5 active:opacity-70"
            >
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: '#FFF8E8' }}>
                <Ionicons name="sparkles" size={20} color="#C45E3A" />
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 14, color: '#292522' }}>
                  {lang === 'en' ? 'Generate AI Meal Plan' : 'Gumawa ng AI Meal Plan'}
                </Text>
                <Text className="text-xs text-ink-soft mt-0.5">
                  {lang === 'en' ? "Let AI plan today's meals for you" : 'Ipaplano sa AI ang mga meal mo ngayon'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B0A18C" />
            </Pressable>

            <Pressable
              onPress={handleChooseRecipes}
              className="flex-row items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-3 active:opacity-70"
            >
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: '#EFF4EC' }}>
                <Ionicons name="restaurant" size={20} color="#6E7B4A" />
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 14, color: '#292522' }}>
                  {lang === 'en' ? 'Choose from Recipes' : 'Pumili sa mga Recipe'}
                </Text>
                <Text className="text-xs text-ink-soft mt-0.5">
                  {lang === 'en' ? 'Browse recipes and pick one yourself' : 'Mag-browse ng recipe at pumili'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B0A18C" />
            </Pressable>

            <Pressable onPress={handleMaybeLater} hitSlop={8} className="mt-4 items-center active:opacity-70">
              <Text className="text-xs font-medium text-ink-soft">
                {lang === 'en' ? 'Maybe later' : 'Sa ibang pagkakataon na lang'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
