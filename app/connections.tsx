import client from '@/src/api/client';
import AndroidNavBarFiller from '@/src/components/AndroidNavBarFiller';
import { SkeletonListItem } from '@/src/components/Skeleton';
import { API_URL } from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ConnUser = { id: number; name: string; username: string | null; avatar: string | null; level: number };
type ConnEntry = { id: number; requester?: ConnUser; recipient?: ConnUser };
type ConnPage  = { data: ConnEntry[]; current_page: number; last_page: number };

type AcceptedConnection = {
  id: number;
  user: ConnUser;
  my_label_id: number | null;
  my_label: string | null;
  created_at: string;
};
type PendingEntry = { id: number; requester?: ConnUser; recipient?: ConnUser; created_at: string };
type ConnectionLabelOption = { id: number; name: string };

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function Avatar({ u }: { u: ConnUser }) {
  const avatarUri = u.avatar ? `${API_URL}${u.avatar}` : null;
  return avatarUri ? (
    <Image source={{ uri: avatarUri }} className="w-[53px] h-[53px] rounded-full bg-cream-300" />
  ) : (
    <View className="w-[53px] h-[53px] rounded-full bg-leaf-50 items-center justify-center">
      <Text className="text-xs font-semibold text-ink">{initials(u.name)}</Text>
    </View>
  );
}

function UserRow({ u, isFollowing }: { u: ConnUser; isFollowing: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { lang } = useLanguage();

  const { mutate: unfollow, isPending } = useMutation({
    mutationFn: () => client.delete(`/users/${u.id}/follow`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['connections-following'] });
    },
  });

  return (
    <Pressable
      onPress={() => router.push(`/user/${u.id}` as any)}
      className="flex-row items-center gap-3 px-4 py-3 border-b border-cream-200 active:bg-cream-50"
    >
      <Avatar u={u} />
      <View className="flex-1">
        <Text className="text-sm font-medium text-ink">{u.name}</Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          {u.username ? <Text className="text-xs text-ink-soft">@{u.username}</Text> : null}
          <View className="rounded-full bg-leaf-50 px-1.5 py-0.5">
            <Text className="text-xs font-semibold text-leaf-700">Lv.{u.level}</Text>
          </View>
        </View>
      </View>
      {isFollowing && (
        <Pressable
          onPress={(e) => { e.stopPropagation(); unfollow(); }}
          disabled={isPending}
          className="rounded-xl border border-cream-300 px-3 py-1.5 active:opacity-70"
        >
          {isPending
            ? <ActivityIndicator color="#386641" size="small" />
            : <Text className="text-xs font-medium text-ink-soft">{lang === 'en' ? 'Unfollow' : 'I-unfollow'}</Text>
          }
        </Pressable>
      )}
    </Pressable>
  );
}

// ─── Connections (mutual) tab ─────────────────────────────────────────────────

function ConnectionsTab() {
  const router = useRouter();
  const qc = useQueryClient();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const [labelPickerFor, setLabelPickerFor] = useState<AcceptedConnection | null>(null);

  const { data: accepted, isLoading: loadingAccepted, refetch: refetchAccepted, isRefetching: rfAccepted } = useQuery({
    queryKey: ['connections-accepted'],
    queryFn: () => client.get('/connections').then((r) => r.data as { data: AcceptedConnection[] }),
    staleTime: 60_000,
  });

  const { data: pending, isLoading: loadingPending, refetch: refetchPending, isRefetching: rfPending } = useQuery({
    queryKey: ['connections-pending'],
    queryFn: () => client.get('/connections/pending').then((r) => r.data as { incoming: PendingEntry[]; outgoing: PendingEntry[] }),
    staleTime: 60_000,
  });

  const { data: labels } = useQuery({
    queryKey: ['connection-labels'],
    queryFn: () => client.get('/connection-labels').then((r) => r.data.labels as ConnectionLabelOption[]),
    staleTime: 60 * 60_000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['connections-accepted'] });
    qc.invalidateQueries({ queryKey: ['connections-pending'] });
  };

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: (id: number) => client.post(`/connections/requests/${id}/accept`),
    onSuccess: invalidateAll,
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Could not accept.'),
  });

  const { mutate: decline, isPending: declining } = useMutation({
    mutationFn: (id: number) => client.post(`/connections/requests/${id}/decline`),
    onSuccess: invalidateAll,
  });

  const { mutate: cancelRequest, isPending: cancelling } = useMutation({
    mutationFn: (id: number) => client.delete(`/connections/requests/${id}`),
    onSuccess: invalidateAll,
  });

  const { mutate: removeConnection } = useMutation({
    mutationFn: (id: number) => client.delete(`/connections/${id}`),
    onSuccess: invalidateAll,
  });

  const { mutate: setLabel, isPending: settingLabel } = useMutation({
    mutationFn: ({ id, labelId }: { id: number; labelId: number | null }) =>
      client.patch(`/connections/${id}/label`, { label_id: labelId }),
    onSuccess: () => {
      setLabelPickerFor(null);
      qc.invalidateQueries({ queryKey: ['connections-accepted'] });
    },
  });

  const confirmRemove = (c: AcceptedConnection) => {
    Alert.alert(
      lang === 'en' ? 'Remove connection?' : 'Tanggalin ang koneksyon?',
      lang === 'en'
        ? `You and ${c.user.name} will no longer be connected, and any shared shopping lists between you will be unshared.`
        : `Hindi na kayo magiging konektado ni ${c.user.name}, at mawawala ang mga shared shopping list sa pagitan ninyo.`,
      [
        { text: lang === 'en' ? 'Cancel' : 'Kanselahin', style: 'cancel' },
        { text: lang === 'en' ? 'Remove' : 'Tanggalin', style: 'destructive', onPress: () => removeConnection(c.id) },
      ],
    );
  };

  const isLoading = loadingAccepted || loadingPending;
  const incoming = pending?.incoming ?? [];
  const outgoing = pending?.outgoing ?? [];
  const connections = accepted?.data ?? [];

  if (isLoading) {
    return (
      <View style={{ backgroundColor: '#fff', flex: 1, paddingTop: 8 }}>
        {[0, 1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: 'white', flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={rfAccepted || rfPending}
            onRefresh={() => { refetchAccepted(); refetchPending(); }}
            tintColor="#386641"
            colors={['#386641']}
          />
        }
      >
        {incoming.length > 0 && (
          <>
            <Text className="px-4 pt-4 pb-1 text-xs font-semibold text-ink-soft uppercase tracking-wider">
              {lang === 'en' ? 'Requests' : 'Mga Hiling'}
            </Text>
            {incoming.map((p) => p.requester && (
              <View key={p.id} className="flex-row items-center gap-3 px-4 py-3 border-b border-cream-200">
                <Pressable onPress={() => router.push(`/user/${p.requester!.id}` as any)}>
                  <Avatar u={p.requester} />
                </Pressable>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-ink">{p.requester.name}</Text>
                  {p.requester.username ? <Text className="text-xs text-ink-soft">@{p.requester.username}</Text> : null}
                </View>
                <Pressable
                  onPress={() => accept(p.id)}
                  disabled={accepting}
                  className="rounded-xl bg-brand-600 px-3 py-1.5 active:opacity-80"
                >
                  <Text className="text-xs font-semibold text-white">{lang === 'en' ? 'Accept' : 'Tanggapin'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => decline(p.id)}
                  disabled={declining}
                  className="rounded-xl border border-cream-300 px-3 py-1.5 active:opacity-70"
                >
                  <Text className="text-xs font-medium text-ink-soft">{lang === 'en' ? 'Decline' : 'Tanggihan'}</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {outgoing.length > 0 && (
          <>
            <Text className="px-4 pt-4 pb-1 text-xs font-semibold text-ink-soft uppercase tracking-wider">
              {lang === 'en' ? 'Sent requests' : 'Mga Ipinadalang Hiling'}
            </Text>
            {outgoing.map((p) => p.recipient && (
              <View key={p.id} className="flex-row items-center gap-3 px-4 py-3 border-b border-cream-200">
                <Pressable onPress={() => router.push(`/user/${p.recipient!.id}` as any)}>
                  <Avatar u={p.recipient} />
                </Pressable>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-ink">{p.recipient.name}</Text>
                  {p.recipient.username ? <Text className="text-xs text-ink-soft">@{p.recipient.username}</Text> : null}
                </View>
                <Pressable
                  onPress={() => cancelRequest(p.id)}
                  disabled={cancelling}
                  className="rounded-xl border border-cream-300 px-3 py-1.5 active:opacity-70"
                >
                  <Text className="text-xs font-medium text-ink-soft">{lang === 'en' ? 'Cancel' : 'Kanselahin'}</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {(incoming.length > 0 || outgoing.length > 0) && connections.length > 0 && (
          <Text className="px-4 pt-4 pb-1 text-xs font-semibold text-ink-soft uppercase tracking-wider">
            {lang === 'en' ? 'Connected' : 'Magkakonekta'}
          </Text>
        )}

        {connections.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/user/${c.user.id}` as any)}
            className="flex-row items-center gap-3 px-4 py-3 border-b border-cream-200 active:bg-cream-50"
          >
            <Avatar u={c.user} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-ink">{c.user.name}</Text>
              <View className="flex-row items-center gap-2 mt-0.5">
                {c.user.username ? <Text className="text-xs text-ink-soft">@{c.user.username}</Text> : null}
                <View className="rounded-full bg-leaf-50 px-1.5 py-0.5">
                  <Text className="text-xs font-semibold text-leaf-700">Lv.{c.user.level}</Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={(e) => { e.stopPropagation(); setLabelPickerFor(c); }}
              className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 active:opacity-70 ${c.my_label ? 'bg-leaf-50' : 'border border-cream-300'}`}
            >
              <Text className={`text-xs font-medium ${c.my_label ? 'text-leaf-700' : 'text-ink-soft'}`}>
                {c.my_label ?? (lang === 'en' ? 'Label' : 'Label')}
              </Text>
              <Ionicons name="chevron-down" size={11} color={c.my_label ? '#386641' : '#B0A18C'} />
            </Pressable>
            <Pressable
              onPress={(e) => { e.stopPropagation(); confirmRemove(c); }}
              hitSlop={8}
              className="active:opacity-60"
            >
              <Ionicons name="close-circle-outline" size={19} color="#B0A18C" />
            </Pressable>
          </Pressable>
        ))}

        {incoming.length === 0 && outgoing.length === 0 && connections.length === 0 && (
          <View className="items-center pt-16 px-8">
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🤝</Text>
            <Text className="text-sm text-ink-soft text-center">
              {lang === 'en'
                ? 'No connections yet.\nVisit a profile and tap Connect to send a request. Connections can receive your shared shopping lists.'
                : 'Wala ka pang koneksyon.\nPuntahan ang isang profile at i-tap ang Connect. Ang mga koneksyon mo ang pwedeng padalhan ng shared shopping list.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Label picker bottom sheet */}
      <Modal
        visible={labelPickerFor !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setLabelPickerFor(null)}
      >
        <Pressable
          onPress={() => setLabelPickerFor(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 12 }}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9EDD3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#000000' }}>
                {lang === 'en'
                  ? `Label for ${labelPickerFor?.user.name ?? ''}`
                  : `Label para kay ${labelPickerFor?.user.name ?? ''}`}
              </Text>
              <Pressable onPress={() => setLabelPickerFor(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#6F655A" />
              </Pressable>
            </View>
            <Text className="px-4 pt-2 text-xs text-ink-soft">
              {lang === 'en'
                ? 'Only you can see this label.'
                : 'Ikaw lang ang nakakakita ng label na ito.'}
            </Text>
            {(labels ?? []).map((l) => (
              <Pressable
                key={l.id}
                onPress={() => labelPickerFor && setLabel({ id: labelPickerFor.id, labelId: l.id })}
                disabled={settingLabel}
                className="flex-row items-center justify-between px-4 py-3 border-b border-cream-200 active:opacity-70"
              >
                <Text style={{ fontFamily: labelPickerFor?.my_label_id === l.id ? 'NunitoSans_700Bold' : 'NunitoSans_400Regular', fontSize: 14, color: '#000000' }}>
                  {l.name}
                </Text>
                {labelPickerFor?.my_label_id === l.id && <Ionicons name="checkmark" size={16} color="#386641" />}
              </Pressable>
            ))}
            {labelPickerFor?.my_label_id != null && (
              <Pressable
                onPress={() => labelPickerFor && setLabel({ id: labelPickerFor.id, labelId: null })}
                disabled={settingLabel}
                className="px-4 py-3 active:opacity-70"
              >
                <Text className="text-sm text-danger">{lang === 'en' ? 'Remove label' : 'Tanggalin ang label'}</Text>
              </Pressable>
            )}
            <AndroidNavBarFiller />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ConnectionsScreen() {
  const [tab, setTab] = useState<'connections' | 'following' | 'followers'>('connections');
  const { lang } = useLanguage();

  const { data: followingData, isLoading: loadingF, refetch: refetchF, isRefetching: rfF } = useQuery<ConnPage>({
    queryKey: ['connections-following'],
    queryFn:  () => client.get('/connections/following').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: followersData, isLoading: loadingFl, refetch: refetchFl, isRefetching: rfFl } = useQuery<ConnPage>({
    queryKey: ['connections-followers'],
    queryFn:  () => client.get('/connections/followers').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['connections-pending'],
    queryFn: () => client.get('/connections/pending').then((r) => r.data as { incoming: PendingEntry[]; outgoing: PendingEntry[] }),
    staleTime: 60_000,
  });
  const incomingCount = pendingData?.incoming?.length ?? 0;

  const isFollowingTab = tab === 'following';
  const currentData    = isFollowingTab ? followingData : followersData;
  const isLoading      = isFollowingTab ? loadingF : loadingFl;
  const refetch        = isFollowingTab ? refetchF : refetchFl;
  const isRefetching   = isFollowingTab ? rfF : rfFl;

  const entries = currentData?.data ?? [];

  const renderEntry = ({ item }: { item: ConnEntry }) => {
    const u = isFollowingTab ? item.recipient : item.requester;
    if (!u) return null;
    return <UserRow u={u} isFollowing={isFollowingTab} />;
  };

  return (
    <View className="flex-1 bg-cream-50">
      {/* Tab switcher */}
      <View className="flex-row bg-white border-b border-cream-200 px-4 pt-2 pb-0 gap-4">
        {([
          { key: 'connections', label: lang === 'en' ? 'Connections' : 'Koneksyon' },
          { key: 'following', label: lang === 'en' ? 'Following' : 'Sinusundan' },
          { key: 'followers', label: lang === 'en' ? 'Followers' : 'Sumusunod' },
        ] as const).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            className={`pb-2.5 border-b-2 ${tab === t.key ? 'border-brand-500' : 'border-transparent'}`}
          >
            <View className="flex-row items-center gap-1">
              <Text className={`text-sm font-medium ${tab === t.key ? 'text-leaf-700' : 'text-ink-soft'}`}>
                {t.label}
                {t.key === 'following' && followingData ? ` (${followingData.data.length})` : ''}
                {t.key === 'followers' && followersData ? ` (${followersData.data.length})` : ''}
              </Text>
              {t.key === 'connections' && incomingCount > 0 && (
                <View className="rounded-full bg-brand-600 min-w-[16px] h-[16px] px-1 items-center justify-center">
                  <Text className="text-[10px] font-bold text-white">{incomingCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      {tab === 'connections' ? (
        <ConnectionsTab />
      ) : isLoading ? (
        <View style={{ backgroundColor: '#fff', flex: 1, paddingTop: 8 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEntry}
          style={{ backgroundColor: 'white' }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#386641" colors={['#386641']} />}
          ListEmptyComponent={
            <View className="items-center pt-16 px-8">
              <Text style={{ fontSize: 36, marginBottom: 12 }}>👥</Text>
              <Text className="text-sm text-ink-soft text-center">
                {lang === 'en'
                  ? (isFollowingTab
                      ? "You're not following anyone yet.\nCheck out the Community and follow active members."
                      : "No one's following you yet.\nPost in the Community to get noticed!")
                  : (isFollowingTab
                      ? 'Wala ka pang sinusundan.\nPuntahan ang Komunidad at sundan ang mga aktibo.'
                      : 'Wala pang sumusunod sa iyo.\nMag-post sa Komunidad para makilala ka!')}
              </Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </View>
  );
}
