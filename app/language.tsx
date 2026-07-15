import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LanguageScreen() {
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#F9EDD3',
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', flex: 1 }}>
            {lang === 'en' ? 'Languages' : 'Mga Wika'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-12">
        <View className="rounded-2xl border border-cream-200 bg-white p-4">
          <View className="flex-row bg-cream-100 rounded-xl p-1">
            {([
              { key: 'en' as const, label: 'English' },
              { key: 'tl' as const, label: 'Tagalog' },
            ]).map((opt) => {
              const active = lang === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setLang(opt.key)}
                  className={`flex-1 items-center py-3 rounded-lg ${active ? 'bg-brand-500' : ''}`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-ink-soft'}`}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
