import client from '@/src/api/client';
import { SkeletonListItem } from '@/src/components/Skeleton';
import { useLanguage } from '@/src/context/LanguageContext';
import { isSafeAppUrl } from '@/src/utils/safeAppUrl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

type AppNotif = {
  id: number;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

type NotifPage = { data: AppNotif[]; current_page: number; last_page: number };

const TYPE_ICON: Record<string, string> = {
  reaction:       '❤️',
  achievement:    '🏆',
  daily_reminder: '🍳',
  default:        '🔔',
};

function timeAgo(iso: string, lang: 'en' | 'tl'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return lang === 'en' ? 'now' : 'ngayon';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function isYesterday(iso: string): boolean {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return new Date(iso).toDateString() === y.toDateString();
}

function groupLabel(iso: string, lang: 'en' | 'tl'): string {
  if (isToday(iso))     return lang === 'en' ? 'Today' : 'Ngayon';
  if (isYesterday(iso)) return lang === 'en' ? 'Yesterday' : 'Kahapon';
  return lang === 'en' ? 'Earlier' : 'Nakaraan';
}

async function fetchNotifs(): Promise<NotifPage> {
  const { data } = await client.get('/notifications');
  return data;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { lang } = useLanguage();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn:  fetchNotifs,
    staleTime: 30_000,
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: () => client.post('/notifications/read-all'),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const handleTap = async (notif: AppNotif) => {
    if (!notif.read_at) {
      await client.post(`/notifications/${notif.id}/read`).catch(() => {});
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    }
    if (isSafeAppUrl(notif.action_url)) {
      router.push(notif.action_url as any);
    }
  };

  const notifs     = data?.data ?? [];
  const hasUnread  = notifs.some((n) => !n.read_at);

  // Group by day label
  const grouped: { label: string; items: AppNotif[] }[] = [];
  let lastLabel = '';
  for (const n of notifs) {
    const label = groupLabel(n.created_at, lang);
    if (label !== lastLabel) {
      grouped.push({ label, items: [] });
      lastLabel = label;
    }
    grouped[grouped.length - 1].items.push(n);
  }

  const flatItems: (AppNotif | { _separator: string })[] = [];
  for (const g of grouped) {
    flatItems.push({ _separator: g.label });
    flatItems.push(...g.items);
  }

  const renderItem = ({ item }: { item: AppNotif | { _separator: string } }) => {
    if ('_separator' in item) {
      return (
        <Text className="text-xs font-medium text-ink-soft uppercase tracking-wider px-4 pt-4 pb-1">
          {item._separator}
        </Text>
      );
    }
    const n    = item as AppNotif;
    const icon = TYPE_ICON[n.type] ?? TYPE_ICON.default;
    const read = !!n.read_at;

    return (
      <Pressable
        onPress={() => handleTap(n)}
        className={`flex-row gap-3 px-4 py-3 border-b border-cream-200 active:bg-cream-50 ${read ? '' : 'bg-leaf-50/40'}`}
      >
        <View className={`w-10 h-10 rounded-full items-center justify-center shrink-0 ${read ? 'bg-cream-200' : 'bg-leaf-100'}`}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start gap-2">
            <Text className={`text-sm flex-1 ${read ? 'font-normal text-ink' : 'font-semibold text-ink'}`}>
              {n.title}
            </Text>
            <Text className="text-xs text-ink-soft shrink-0">{timeAgo(n.created_at, lang)}</Text>
          </View>
          <Text className="text-xs text-ink-soft leading-4 mt-0.5" numberOfLines={2}>{n.body}</Text>
        </View>
        {!read && (
          <View className="w-2 h-2 rounded-full bg-leaf-500 self-center shrink-0" />
        )}
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: 12 }}>
        {[0, 1, 2, 3, 4].map((i) => <SkeletonListItem key={i} />)}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {hasUnread && (
        <Pressable
          onPress={() => markAllRead()}
          className="flex-row justify-end px-4 py-2 border-b border-cream-200"
        >
          <Text className="text-xs font-medium text-brand-600">{lang === 'en' ? 'Mark all as read' : 'Basahin lahat'}</Text>
        </Pressable>
      )}

      <FlatList
        data={flatItems as any}
        keyExtractor={(item, i) =>
          '_separator' in item ? `sep-${i}` : String((item as AppNotif).id)
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#386641" colors={['#386641']} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-24">
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
            <Text className="text-sm text-ink-soft text-center">
              {lang === 'en'
                ? <>No notifications yet.{'\n'}Interact with the community to see them here.</>
                : <>Wala pang notipikasyon.{'\n'}Mag-interact sa komunidad para makakita rito.</>}
            </Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}
