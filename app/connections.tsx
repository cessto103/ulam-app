import client from '@/src/api/client';
import { SkeletonListItem } from '@/src/components/Skeleton';
import { API_URL } from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

type ConnUser = { id: number; name: string; username: string | null; avatar: string | null; level: number };
type ConnEntry = { id: number; requester?: ConnUser; recipient?: ConnUser };
type ConnPage  = { data: ConnEntry[]; current_page: number; last_page: number };

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
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

  const avatarUri = u.avatar ? `${API_URL}${u.avatar}` : null;

  return (
    <Pressable
      onPress={() => router.push(`/user/${u.id}` as any)}
      className="flex-row items-center gap-3 px-4 py-3 border-b border-cream-200 active:bg-cream-50"
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} className="w-11 h-11 rounded-full bg-cream-300" />
      ) : (
        <View className="w-11 h-11 rounded-full bg-leaf-50 items-center justify-center">
          <Text className="text-xs font-semibold text-ink">{initials(u.name)}</Text>
        </View>
      )}
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

export default function ConnectionsScreen() {
  const [tab, setTab] = useState<'following' | 'followers'>('following');
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
          { key: 'following', label: lang === 'en' ? 'Following' : 'Sinusundan ko' },
          { key: 'followers', label: lang === 'en' ? 'Followers' : 'Mga Sumusunod' },
        ] as const).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            className={`pb-2.5 border-b-2 ${tab === t.key ? 'border-brand-500' : 'border-transparent'}`}
          >
            <Text className={`text-sm font-medium ${tab === t.key ? 'text-leaf-700' : 'text-ink-soft'}`}>
              {t.label}
              {t.key === 'following' && followingData ? ` (${followingData.data.length})` : ''}
              {t.key === 'followers' && followersData ? ` (${followersData.data.length})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ backgroundColor: '#fff', flex: 1, paddingTop: 8 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEntry}
          style={{ backgroundColor: 'white' }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#386641" />}
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
