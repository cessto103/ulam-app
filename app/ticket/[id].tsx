import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Message = {
  id: number;
  is_from_admin: boolean;
  body: string;
  created_at: string;
  sender?: { id: number; name: string; avatar: string | null } | null;
};

type Ticket = {
  id: number;
  subject: string;
  category: string;
  status: 'open' | 'answered' | 'closed';
  messages: Message[];
};

export default function TicketThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const [reply, setReply] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['support-ticket', id] });
    setRefreshing(false);
  };

  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ['support-ticket', id],
    queryFn: async () => (await client.get(`/support-tickets/${id}`)).data.ticket,
  });

  const sendReply = useMutation({
    mutationFn: async () => client.post(`/support-tickets/${id}/reply`, { body: reply.trim() }),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['support-ticket', id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (e: any) =>
      Alert.alert(
        'Error',
        e?.response?.data?.message ??
          (lang === 'en' ? 'Could not send. Try again.' : 'Hindi maipadala. Subukan ulit.'),
      ),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-cream-50"
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-3 bg-white border-b border-cream-200">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={18} color="#292522" />
          </Pressable>
          <View className="flex-1">
            <Text
              style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#292522' }}
              numberOfLines={1}
            >
              {ticket?.subject ?? '...'}
            </Text>
            {ticket?.status === 'closed' && (
              <Text className="text-[12px] text-ink-soft">
                {lang === 'en' ? 'This ticket is closed' : 'Sarado na ang ticket na ito'}
              </Text>
            )}
          </View>
        </View>
      </View>

      {isLoading || !ticket ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#E7653B" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" />}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {ticket.messages.map((m) => (
            <View
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                m.is_from_admin
                  ? 'self-start bg-white border border-cream-200'
                  : 'self-end bg-leaf-600'
              }`}
            >
              <Text className={`text-sm leading-5 ${m.is_from_admin ? 'text-ink' : 'text-white'}`}>
                {m.body}
              </Text>
              <Text
                className={`text-[12px] mt-1 ${m.is_from_admin ? 'text-ink-soft' : 'text-white/70'}`}
              >
                {m.is_from_admin ? 'uLam Support' : lang === 'en' ? 'You' : 'Ikaw'} ·{' '}
                {new Date(m.created_at).toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Reply bar */}
      {ticket && ticket.status !== 'closed' && (
        <View
          className="flex-row items-end gap-2 px-4 pt-2 bg-white border-t border-cream-200"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <TextInput
            value={reply}
            onChangeText={setReply}
            placeholder={lang === 'en' ? 'Write a reply...' : 'Sumulat ng sagot...'}
            placeholderTextColor="#B0A18C"
            multiline
            maxLength={3000}
            className="flex-1 border border-cream-300 rounded-2xl px-3 py-2.5 text-sm text-ink bg-cream-50"
            style={{ maxHeight: 100 }}
          />
          <Pressable
            onPress={() => sendReply.mutate()}
            disabled={!reply.trim() || sendReply.isPending}
            className="w-10 h-10 rounded-full bg-brand-600 items-center justify-center active:opacity-80 disabled:opacity-50"
          >
            {sendReply.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
