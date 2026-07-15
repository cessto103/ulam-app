import client, { API_URL } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

async function fetchUnreadCount(): Promise<number> {
  try {
    const { data } = await client.get('/notifications/unread-count');
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchMyStores(): Promise<any[]> {
  try {
    const { data } = await client.get('/tindahan/mine');
    return data.tindahan ?? [];
  } catch {
    return [];
  }
}

type Props = {
  /** "cream" for light cream headers (home); default suits dark olive headers. */
  tone?: 'dark' | 'cream';
};

export default function HeaderIconRow({ tone = 'dark' }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const dark = tone !== 'cream';

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: fetchUnreadCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Storefront shortcut only shows for store owners.
  const { data: myStores = [] } = useQuery({
    queryKey: ['my-tindahan'],
    queryFn: fetchMyStores,
    staleTime: 5 * 60_000,
  });
  const hasStore = myStores.length > 0;

  const initials = (user?.name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('');
  const avatarUri = user?.avatar ? `${API_URL}${user.avatar}` : null;
  const circleBg = dark ? 'rgba(255,255,255,0.12)' : '#F9EDD3';
  const iconColor = dark ? '#fff' : '#000000';

  const iconShadow = {
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as const;

  const circleShadow = {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  } as const;

  return (
    <View className="flex-row gap-2.5 items-center">
      <Pressable
        onPress={() => router.push('/search' as any)}
        className="w-11 h-11 rounded-full items-center justify-center active:opacity-70"
        style={{ backgroundColor: circleBg, ...circleShadow }}
      >
        <Ionicons name="search" size={22} color={iconColor} style={iconShadow} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/my-reports' as any)}
        className="w-11 h-11 rounded-full items-center justify-center active:opacity-70"
        style={{ backgroundColor: circleBg, ...circleShadow }}
      >
        <Ionicons name="receipt-outline" size={21} color={iconColor} style={iconShadow} />
      </Pressable>
      {hasStore && (
        <Pressable
          onPress={() => router.push('/my-stores' as any)}
          className="w-11 h-11 rounded-full items-center justify-center active:opacity-70"
          style={{ backgroundColor: circleBg, ...circleShadow }}
        >
          <Ionicons name="storefront-outline" size={21} color={iconColor} style={iconShadow} />
        </Pressable>
      )}
      <Pressable
        onPress={() => router.push('/notifications' as any)}
        className="w-11 h-11 rounded-full items-center justify-center active:opacity-70"
        style={{ backgroundColor: circleBg, ...circleShadow }}
      >
        <Ionicons name="notifications-outline" size={23} color={iconColor} style={iconShadow} />
        {unreadCount > 0 && (
          <View className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 items-center justify-center px-1">
            <Text className="text-white text-[11px] font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => router.push('/(tabs)/profile' as any)}
        className="w-11 h-11 rounded-full items-center justify-center overflow-hidden active:opacity-70"
        style={{
          backgroundColor: avatarUri ? '#F9EDD3' : dark ? 'rgba(255,255,255,0.22)' : '#E7653B',
          borderWidth: 2,
          borderColor: dark ? 'rgba(255,255,255,0.55)' : '#E7653B',
          ...circleShadow,
        }}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text className="text-sm font-bold text-white">{initials}</Text>
        )}
      </Pressable>
    </View>
  );
}
