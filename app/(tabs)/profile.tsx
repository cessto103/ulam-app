import { uploadAvatar } from '@/src/api/user';
import { resizeForUpload } from '@/src/utils/uploadImage';
import client from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { API_URL } from '@/src/api/client';
import FireXpBar from '@/src/components/FireXpBar';
import { Ionicons } from '@expo/vector-icons';
import BrandLogo from '@/src/components/BrandLogo';
import ThemedSection from '@/src/components/ThemedSection';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), qc.invalidateQueries({ queryKey: ['billing-status'] })]);
    setRefreshing(false);
  };

  const avatarUri = user?.avatar
    ? `${API_URL}${user.avatar}`
    : null;

  // Same level thresholds as Awards & Achievements
  const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 6000, 10000, 15000];
  const xpLevel = user?.level ?? 1;
  const xpCurrent = LEVEL_XP[xpLevel - 1] ?? 0;
  const xpNext = xpLevel < 10 ? (LEVEL_XP[xpLevel] ?? LEVEL_XP[LEVEL_XP.length - 1]) : null;
  const xpProgressPct = xpNext && xpNext > xpCurrent
    ? Math.min(1, Math.max(0, ((user?.xp ?? 0) - xpCurrent) / (xpNext - xpCurrent)))
    : 1;

  // Seller subscription status — separate from the consumer Premium/Free
  // badge above; a store owner can be on Suki/Negosyante here while still
  // being "Free" on the consumer AI-meal-plan side, and vice versa.
  const { data: billing } = useQuery({
    queryKey: ['billing-status'],
    queryFn: async () => (await client.get('/billing/status')).data,
    staleTime: 30_000,
  });
  const sellerPlanName = billing?.subscription?.plan_name ?? null;
  const sellerPlanActive = billing?.subscription && billing.subscription.status !== 'free';

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      await uploadAvatar(await resizeForUpload(result.assets[0].uri, 512, 0.8));
      await refreshUser();
    } catch (e) {
      Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      await uploadAvatar(await resizeForUpload(result.assets[0].uri, 512, 0.8));
      await refreshUser();
    } catch (e) {
      Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-cream-100"
      contentContainerClassName="pb-8"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#386641" />}
    >
      {/* Food-photo curved header with terracotta overlay */}
      <ThemedSection
        sectionKey="header_hero"
        compiledImage={require('@/assets/profile-header-food.jpg')}
        compiledOverlayColors={['rgba(231,101,59,0.96)', 'rgba(231,101,59,0.78)', 'rgba(231,101,59,0.55)']}
        borderRadius={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        style={{ alignItems: 'center', paddingHorizontal: 16, paddingBottom: 24, marginBottom: 20, paddingTop: insets.top + 10 }}
      >
        {/* Logo + gear row, same layout as the other tab headers */}
        <View className="w-full flex-row items-center justify-between mb-3">
          <BrandLogo size={21} light />
          <Pressable
            onPress={() => router.push('/settings' as any)}
            hitSlop={10}
            className="w-11 h-11 rounded-full items-center justify-center active:opacity-70"
            style={{ backgroundColor: 'rgba(255,248,232,0.78)' }}
          >
            <Ionicons name="settings-outline" size={23} color="#000000" />
          </Pressable>
        </View>

        <Pressable onPress={showPhotoOptions} style={{ position: 'relative', width: 144, height: 144 }}>
          <View
            style={{
              width: 144, height: 144, borderRadius: 72,
              borderWidth: 3, borderColor: '#FFFCF5',
              padding: 2,
              backgroundColor: '#E7653B',
              overflow: 'hidden',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: 134, height: 134, borderRadius: 67, backgroundColor: '#F0DEBB' }}
              />
            ) : (
              <View style={{ width: 134, height: 134, borderRadius: 67, backgroundColor: '#EC8156', alignItems: 'center', justifyContent: 'center' }}>
                <Text className="text-4xl">👤</Text>
              </View>
            )}
          </View>

          {/* Edit badge */}
          <View
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: '#F4B942',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: '#FFFCF5',
            }}
          >
            {uploading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="camera-outline" size={16} color="white" />
            )}
          </View>
        </Pressable>

        <Text className="text-xs mt-2" style={{ color: '#FFF8E8', textShadowColor: 'rgba(88,32,15,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>Tap to change photo</Text>

        <Text className="mt-3" style={{ fontFamily: 'Baloo2_700Bold', fontSize: 26, color: '#FFFFFF', textShadowColor: 'rgba(88,32,15,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 }}>{user?.name}</Text>
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#FFF8E8', textShadowColor: 'rgba(88,32,15,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>@{user?.username}</Text>
        <View className={`mt-2.5 rounded-full px-4 py-1.5 ${sellerPlanActive ? 'bg-leaf-600' : 'bg-cream-50'}`}>
          <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14 }} className={sellerPlanActive ? 'text-white' : (user?.plan === 'premium' ? 'text-gold-600' : 'text-ink')}>
            {sellerPlanActive ? `🏪 ${sellerPlanName}` : (user?.plan === 'premium' ? '⭐ Premium' : (lang === 'en' ? 'Free Plan' : 'Libreng Plan'))}
          </Text>
        </View>

        {/* XP progress — same fire bar as Awards & Achievements */}
        <View className="w-full mt-4">
          <View className="flex-row justify-between mb-1.5">
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff', textShadowColor: 'rgba(88,32,15,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>Level {user?.level ?? 1}</Text>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff', textShadowColor: 'rgba(88,32,15,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              {xpNext ? `${(user?.xp ?? 0).toLocaleString()} / ${xpNext.toLocaleString()} XP` : 'Max Level'}
            </Text>
          </View>
          <FireXpBar progress={xpProgressPct} />
        </View>
      </ThemedSection>

      <View className="px-4">
      {/* Stats */}
      <View className="flex-row gap-3 mb-5">
        {[
          { label: 'Level', value: user?.level ?? 1, emoji: '🏆' },
          { label: 'XP', value: user?.xp ?? 0, emoji: '⚡' },
          { label: 'Streak', value: `${user?.streak_days ?? 0}d`, emoji: '🔥' },
        ].map((s) => (
          <View key={s.label} className="flex-1 rounded-2xl border border-cream-200 bg-white p-4 items-center">
            <Text style={{ fontSize: 30, marginBottom: 4 }}>{s.emoji}</Text>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 20, color: '#000000' }}>{s.value}</Text>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#6F655A' }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Connections (relocated from the Awards header) */}
      <Pressable
        onPress={() => router.push('/connections' as any)}
        className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-4 active:opacity-70"
      >
        <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
          <Text className="text-lg">👥</Text>
        </View>
        <Text className="flex-1 text-sm font-semibold text-ink">
          {lang === 'en' ? 'Connections' : 'Mga Koneksyon'}
        </Text>
        <Text className="text-ink-soft text-base">›</Text>
      </Pressable>

      {/* Saved Recipes (relocated from the Awards page's "Saved" tab) */}
      <Pressable
        onPress={() => router.push('/recipe-book' as any)}
        className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-4 active:opacity-70"
      >
        <View className="w-10 h-10 rounded-xl bg-gold-50 items-center justify-center">
          <Text className="text-lg">📖</Text>
        </View>
        <Text className="flex-1 text-sm font-semibold text-ink">
          {lang === 'en' ? 'Saved Recipes' : 'Na-save na Recipe'}
        </Text>
        <Text className="text-ink-soft text-base">›</Text>
      </Pressable>

      {/* Awards & Achievements (relocated from the tab bar) */}
      <Pressable
        onPress={() => router.push('/(tabs)/awards' as any)}
        className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-4 active:opacity-70"
      >
        <View className="w-10 h-10 rounded-xl bg-gold-50 items-center justify-center">
          <Text className="text-lg">🏆</Text>
        </View>
        <Text className="flex-1 text-sm font-semibold text-ink">
          {lang === 'en' ? 'Awards & Achievements' : 'Mga Award at Achievement'}
        </Text>
        <Text className="text-ink-soft text-base">›</Text>
      </Pressable>

      {/* My Stores */}
      <Pressable
        onPress={() => router.push('/my-stores' as any)}
        className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-4 active:opacity-70"
      >
        <View className="w-10 h-10 rounded-xl bg-leaf-50 items-center justify-center">
          <Text className="text-lg">🏪</Text>
        </View>
        <Text className="flex-1 text-sm font-semibold text-ink">
          {lang === 'en' ? 'My Stores' : 'Aking mga Tindahan'}
        </Text>
        <Text className="text-ink-soft text-base">›</Text>
      </Pressable>

      {/* uLam Premium */}
      <Pressable
        onPress={() => router.push('/upgrade' as any)}
        className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-4 active:opacity-70"
      >
        <View className="w-10 h-10 rounded-xl bg-gold-50 items-center justify-center">
          <Text className="text-lg">✨</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">
            {lang === 'en' ? 'uLam Premium' : 'uLam Premium'}
          </Text>
          <Text className={`text-xs mt-0.5 ${user?.plan === 'premium' ? 'text-leaf-600 font-medium' : 'text-ink-soft'}`}>
            {user?.plan === 'premium'
              ? (user?.premium_source === 'trial'
                  ? (lang === 'en' ? '🎁 Free trial active' : '🎁 Aktibo ang libreng trial')
                  : (lang === 'en' ? '✓ Premium' : '✓ Premium'))
              : (lang === 'en' ? 'Free (tap to upgrade)' : 'Free (i-tap para mag-upgrade)')}
          </Text>
        </View>
        <Text className="text-ink-soft text-base">›</Text>
      </Pressable>

      {/* Seller Subscription */}
      <Pressable
        onPress={() => router.push('/subscription' as any)}
        className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-4 active:opacity-70"
      >
        <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
          <Text className="text-lg">🏪</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">
            {lang === 'en' ? 'Seller Subscription' : 'Seller Subscription'}
          </Text>
          {sellerPlanName && (
            <Text className={`text-xs mt-0.5 ${sellerPlanActive ? 'text-leaf-600 font-medium' : 'text-ink-soft'}`}>
              {sellerPlanActive ? `✓ ${sellerPlanName}` : (lang === 'en' ? 'Free (tap to upgrade)' : 'Free (i-tap para mag-upgrade)')}
            </Text>
          )}
        </View>
        <Text className="text-ink-soft text-base">›</Text>
      </Pressable>

      {/* My Insights */}
      <Pressable
        onPress={() => router.push('/insights' as any)}
        className="flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 mb-4 active:opacity-70"
      >
        <View className="w-10 h-10 rounded-xl bg-leaf-50 items-center justify-center">
          <Text className="text-lg">📊</Text>
        </View>
        <Text className="flex-1 text-sm font-semibold text-ink">
          {lang === 'en' ? 'My Insights' : 'Aking Insights'}
        </Text>
        <Text className="text-ink-soft text-base">›</Text>
      </Pressable>

      </View>
    </ScrollView>
  );
}
