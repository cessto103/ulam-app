import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type Faq = {
  id: number;
  question: string;
  question_tl: string | null;
  answer: string;
  answer_tl: string | null;
  category: string | null;
};

type Ticket = {
  id: number;
  subject: string;
  category: string;
  status: 'open' | 'answered' | 'closed';
  last_reply_at: string | null;
  created_at: string;
  latest_message?: { body: string; is_from_admin: boolean } | null;
};

const CATEGORIES: { value: string; en: string; tl: string }[] = [
  { value: 'payment', en: 'Payment', tl: 'Bayad' },
  { value: 'subscription', en: 'Subscription', tl: 'Subscription' },
  { value: 'store', en: 'My Store', tl: 'Tindahan' },
  { value: 'account', en: 'Account', tl: 'Account' },
  { value: 'bug', en: 'App problem', tl: 'Problema sa app' },
  { value: 'other', en: 'Other', tl: 'Iba pa' },
];

const STATUS_STYLE: Record<Ticket['status'], { bg: string; fg: string; en: string; tl: string }> = {
  open: { bg: '#FEF6E3', fg: '#9A6A12', en: 'Waiting for reply', tl: 'Hinihintay ang sagot' },
  answered: { bg: '#EFF4EC', fg: '#2C5234', en: 'Replied', tl: 'May sagot na' },
  closed: { bg: '#F9EDD3', fg: '#6F655A', en: 'Closed', tl: 'Sarado na' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HelpScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'faq' | 'tickets'>('faq');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [body, setBody] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['faqs'] }),
      qc.invalidateQueries({ queryKey: ['support-tickets'] }),
    ]);
    setRefreshing(false);
  };

  const { data: faqs = [], isLoading: faqsLoading } = useQuery<Faq[]>({
    queryKey: ['faqs'],
    queryFn: async () => (await client.get('/faqs')).data.faqs ?? [],
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ['support-tickets'],
    queryFn: async () => (await client.get('/support-tickets')).data.tickets ?? [],
  });

  const submitTicket = useMutation({
    mutationFn: async () =>
      client.post('/support-tickets', { subject: subject.trim(), category, body: body.trim() }),
    onSuccess: () => {
      setComposing(false);
      setSubject('');
      setBody('');
      setCategory('other');
      setTab('tickets');
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      Alert.alert(
        lang === 'en' ? 'Ticket sent! 📨' : 'Naipadala na! 📨',
        lang === 'en' ? 'We will reply as soon as we can.' : 'Sasagutin namin sa lalong madaling panahon.',
      );
    },
    onError: (e: any) =>
      Alert.alert(
        'Error',
        e?.response?.data?.message ??
          (lang === 'en' ? 'Could not send. Try again.' : 'Hindi maipadala. Subukan ulit.'),
      ),
  });

  return (
    <View className="flex-1 bg-cream-50">
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-3 bg-white border-b border-cream-200">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', flex: 1 }}>
            {lang === 'en' ? 'Help & Support' : 'Tulong at Suporta'}
          </Text>
          <Pressable
            onPress={() => setComposing(true)}
            className="flex-row items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 active:opacity-80"
          >
            <Ionicons name="create-outline" size={14} color="#fff" />
            <Text className="text-xs font-semibold text-white">
              {lang === 'en' ? 'New ticket' : 'Bagong ticket'}
            </Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View className="flex-row gap-2 mt-3">
          {(
            [
              { key: 'faq', en: 'FAQ', tl: 'Mga Tanong' },
              { key: 'tickets', en: 'My tickets', tl: 'Aking tickets' },
            ] as const
          ).map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 ${tab === t.key ? 'bg-olive-600' : 'bg-cream-200'}`}
            >
              <Text className={`text-xs font-semibold ${tab === t.key ? 'text-white' : 'text-ink-soft'}`}>
                {lang === 'en' ? t.en : t.tl}
                {t.key === 'tickets' && tickets.length > 0 ? ` (${tickets.length})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" colors={['#386641']} />}
      >
        {tab === 'faq' ? (
          faqsLoading ? (
            <ActivityIndicator color="#E7653B" className="mt-8" />
          ) : faqs.length === 0 ? (
            <Text className="text-sm text-ink-soft text-center mt-8">
              {lang === 'en' ? 'No FAQs yet.' : 'Wala pang FAQs.'}
            </Text>
          ) : (
            <View className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
              {faqs.map((f, i) => {
                const q = lang === 'en' ? f.question : (f.question_tl ?? f.question);
                const a = lang === 'en' ? f.answer : (f.answer_tl ?? f.answer);
                const open = openFaq === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setOpenFaq(open ? null : f.id)}
                    className={`px-4 py-3 active:bg-cream-50 ${i < faqs.length - 1 ? 'border-b border-cream-200' : ''}`}
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-ink flex-1">{q}</Text>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#B0A18C" />
                    </View>
                    {open && <Text className="text-xs text-ink-soft leading-5 mt-2">{a}</Text>}
                  </Pressable>
                );
              })}
            </View>
          )
        ) : ticketsLoading ? (
          <ActivityIndicator color="#E7653B" className="mt-8" />
        ) : tickets.length === 0 ? (
          <View className="items-center mt-12">
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📮</Text>
            <Text className="text-sm text-ink-soft text-center">
              {lang === 'en'
                ? 'No tickets yet. Need help? Tap "New ticket".'
                : 'Wala pang tickets. Kailangan ng tulong? Pindutin ang "Bagong ticket".'}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {tickets.map((t) => {
              const s = STATUS_STYLE[t.status];
              return (
                <Pressable
                  key={t.id}
                  onPress={() => router.push(`/ticket/${t.id}` as any)}
                  className="bg-white rounded-2xl border border-cream-200 p-4 active:opacity-80"
                >
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-sm font-semibold text-ink flex-1" numberOfLines={1}>
                      {t.subject}
                    </Text>
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: s.bg }}>
                      <Text className="text-[12px] font-bold" style={{ color: s.fg }}>
                        {lang === 'en' ? s.en : s.tl}
                      </Text>
                    </View>
                  </View>
                  {t.latest_message && (
                    <Text className="text-xs text-ink-soft" numberOfLines={1}>
                      {t.latest_message.is_from_admin ? (lang === 'en' ? 'uLam: ' : 'uLam: ') : ''}
                      {t.latest_message.body}
                    </Text>
                  )}
                  <Text className="text-[12px] text-ink-soft mt-1">
                    {new Date(t.last_reply_at ?? t.created_at).toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* New ticket sheet */}
      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <View className="bg-white rounded-t-3xl p-5" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#000000' }}>
                {lang === 'en' ? 'New support ticket' : 'Bagong support ticket'}
              </Text>
              <Pressable onPress={() => setComposing(false)} className="w-8 h-8 items-center justify-center">
                <Ionicons name="close" size={20} color="#6F655A" />
              </Pressable>
            </View>

            <Text className="text-xs font-medium text-ink mb-1.5">
              {lang === 'en' ? 'What is it about?' : 'Tungkol saan?'}
            </Text>
            <View className="flex-row flex-wrap gap-1.5 mb-3">
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  className={`rounded-full px-3 py-1.5 ${category === c.value ? 'bg-olive-600' : 'bg-cream-200'}`}
                >
                  <Text className={`text-xs font-semibold ${category === c.value ? 'text-white' : 'text-ink-soft'}`}>
                    {lang === 'en' ? c.en : c.tl}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder={lang === 'en' ? 'Subject' : 'Paksa'}
              placeholderTextColor="#B0A18C"
              maxLength={150}
              className="border border-cream-300 rounded-xl px-3 py-3 text-sm text-ink bg-cream-50 mb-2"
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={
                lang === 'en'
                  ? 'Describe the problem. For payment issues, include your GCash reference number.'
                  : 'Ilarawan ang problema. Para sa bayad, isama ang GCash reference number.'
              }
              placeholderTextColor="#B0A18C"
              multiline
              numberOfLines={4}
              maxLength={3000}
              textAlignVertical="top"
              className="border border-cream-300 rounded-xl px-3 py-3 text-sm text-ink bg-cream-50 mb-4"
              style={{ minHeight: 96 }}
            />

            <Pressable
              onPress={() => submitTicket.mutate()}
              disabled={!subject.trim() || !body.trim() || submitTicket.isPending}
              className="rounded-xl bg-brand-600 py-3.5 items-center active:opacity-80 disabled:opacity-50"
            >
              {submitTicket.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-sm font-semibold text-white">
                  {lang === 'en' ? 'Send ticket' : 'Ipadala'}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
