import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

type LegalStatusDoc = {
  slug: string;
  title: string;
  version: string;
  published_at: string | null;
  accepted: boolean;
};

/**
 * Blocks the app with a mandatory review sheet whenever the published
 * Terms/Privacy version changes and the signed-in user hasn't accepted it.
 */
export default function LegalAcceptanceGate() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ['legal-status', user?.id],
    queryFn: async () => (await client.get<{ documents: LegalStatusDoc[] }>('/legal/status')).data.documents,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const pending = (data ?? []).filter((d) => !d.accepted);

  const { mutateAsync: acceptOne } = useMutation({
    mutationFn: async (slug: string) => client.post(`/legal/${slug}/accept`),
  });

  const acceptAll = async () => {
    setBusy(true);
    try {
      for (const doc of pending) {
        await acceptOne(doc.slug);
      }
      await qc.invalidateQueries({ queryKey: ['legal-status'] });
    } finally {
      setBusy(false);
    }
  };

  if (!user || pending.length === 0) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(41,37,34,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFFCF5', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <View className="items-center mb-3">
            <View className="w-12 h-12 rounded-full bg-leaf-50 items-center justify-center mb-2">
              <Ionicons name="document-text-outline" size={24} color="#386641" />
            </View>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: '#292522', textAlign: 'center' }}>
              {lang === 'en' ? 'Updated terms' : 'Bagong kasunduan'}
            </Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center', marginTop: 4 }}>
              {lang === 'en'
                ? 'Please review and accept the following to continue using uLam:'
                : 'Paki-review at tanggapin ang mga sumusunod para magpatuloy sa uLam:'}
            </Text>
          </View>

          {pending.map((doc) => (
            <Pressable
              key={doc.slug}
              onPress={() => router.push(`/legal/${doc.slug}` as any)}
              className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-2.5 active:opacity-70"
            >
              <Ionicons name="document-text" size={20} color="#386641" />
              <View className="flex-1">
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#292522' }}>{doc.title}</Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>
                  {lang === 'en' ? 'Version' : 'Bersyon'} {doc.version}
                  {doc.published_at ? ` · ${new Date(doc.published_at).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: '#C45E3A' }}>
                {lang === 'en' ? 'Read' : 'Basahin'}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={acceptAll}
            disabled={busy}
            className="w-full rounded-2xl bg-brand-600 py-4 items-center active:opacity-80 disabled:opacity-60 mt-2"
          >
            {busy ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 15, color: '#fff' }}>
                {lang === 'en' ? 'I have read and agree' : 'Nabasa ko at sumasang-ayon ako'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
