import client from '@/src/api/client';
import LegalMarkdown from '@/src/components/LegalMarkdown';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type LegalDoc = {
  slug: string;
  title: string;
  version: string;
  published_at: string | null;
  content_md: string;
};

export default function LegalDocumentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ['legal-doc', slug],
    queryFn: async () => (await client.get<LegalDoc>(`/legal/${slug}`)).data,
    enabled: !!slug,
    staleTime: 10 * 60_000,
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
      <View
        style={{
          paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3',
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70">
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </Pressable>
          <View className="flex-1">
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }} numberOfLines={1}>
              {data?.title ?? '…'}
            </Text>
            {data && (
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                {lang === 'en' ? 'Version' : 'Bersyon'} {data.version}
                {data.published_at ? ` · ${new Date(data.published_at).toLocaleDateString()}` : ''}
              </Text>
            )}
          </View>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#386641" style={{ marginTop: 40 }} />
      ) : data ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <LegalMarkdown md={data.content_md} />
        </ScrollView>
      ) : (
        <Text className="text-sm text-ink-soft text-center mt-10">
          {lang === 'en' ? 'Could not load the document.' : 'Hindi ma-load ang dokumento.'}
        </Text>
      )}
    </View>
  );
}
