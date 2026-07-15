import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';

/**
 * First-time explainer for the budget feature — shown when the user taps
 * "Set up budget" before ever creating one, so the why/how lands at the
 * exact moment of interest instead of nagging on every Home visit.
 */
export default function BudgetExplainerSheet({
  visible,
  onClose,
  onProceed,
}: {
  visible: boolean;
  onClose: () => void;
  onProceed: () => void;
}) {
  const { lang } = useLanguage();

  const steps = lang === 'en'
    ? [
        { icon: 'wallet-outline' as const,      text: 'Tell uLam your food budget — for example ₱2,000 for one week.' },
        { icon: 'restaurant-outline' as const,  text: 'uLam divides it into a daily food budget and suggests meals that fit it.' },
        { icon: 'trending-down-outline' as const, text: 'Log what you spend each day and watch your savings grow.' },
      ]
    : [
        { icon: 'wallet-outline' as const,      text: 'Sabihin sa uLam ang iyong budget sa pagkain — halimbawa ₱2,000 para sa isang linggo.' },
        { icon: 'restaurant-outline' as const,  text: 'Hahatiin ito ng uLam sa pang-araw-araw na budget at magmumungkahi ng ulam na kasya rito.' },
        { icon: 'trending-down-outline' as const, text: 'I-log ang gastos araw-araw at panoorin lumaki ang iyong naiipon.' },
      ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(41,37,34,0.55)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: '#FFFCF5', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#F0DEBB', marginBottom: 16 }} />

          <View className="items-center mb-4">
            <View className="w-14 h-14 rounded-full bg-gold-100 items-center justify-center mb-2">
              <Text style={{ fontSize: 28 }}>💰</Text>
            </View>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 21, color: '#000000', textAlign: 'center' }}>
              {lang === 'en' ? 'What is a food budget?' : 'Ano ang food budget?'}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center', marginTop: 4, lineHeight: 21 }}>
              {lang === 'en'
                ? 'It’s the heart of uLam: set how much your family can spend on food, and everything else — meal plans, savings, streaks — works around it.'
                : 'Ito ang puso ng uLam: itakda kung magkano ang kaya ng pamilya para sa pagkain, at aayon dito ang meal plans, ipon, at streaks.'}
            </Text>
          </View>

          <View style={{ gap: 12, marginBottom: 20 }}>
            {steps.map((step, i) => (
              <View key={i} className="flex-row items-center gap-3 bg-white rounded-2xl border border-cream-200 p-3.5">
                <View className="w-9 h-9 rounded-full bg-leaf-50 items-center justify-center">
                  <Ionicons name={step.icon} size={18} color="#386641" />
                </View>
                <Text style={{ flex: 1, fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#000000', lineHeight: 19 }}>
                  {step.text}
                </Text>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#F0DEBB' }}>{i + 1}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onProceed}
            className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80"
          >
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: '#fff' }}>
              {lang === 'en' ? 'Set up my budget' : 'I-setup ang budget ko'}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} className="items-center py-3.5 active:opacity-60">
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#6F655A' }}>
              {lang === 'en' ? 'Maybe later' : 'Mamaya na lang'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
