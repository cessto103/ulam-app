import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchUser = {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  municipality: string | null;
  level: number;
  is_following: boolean;
};

type SearchRecipe = {
  id: number;
  title: string;
  estimated_cost: number | null;
  servings: number | null;
  budget_tag: string | null;
  source: 'official' | 'community';
};

type Row =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'recipe'; key: string; recipe: SearchRecipe }
  | { kind: 'user'; key: string; user: SearchUser };

// ─── Avatar initials ──────────────────────────────────────────────────────────

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: size * 0.36, color: '#386641' }}>{initials}</Text>
    </View>
  );
}

// ─── API ───────────────────────────────────────────────────────────────────────

async function searchUsers(q: string): Promise<SearchUser[]> {
  const { data } = await client.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
  return data.users ?? [];
}

async function searchRecipes(q: string): Promise<SearchRecipe[]> {
  const { data } = await client.get('/recipes', { params: { search: q.trim(), per_page: 20 } });
  return (data.data ?? []).slice(0, 20);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router  = useRouter();
  const { lang } = useLanguage();
  const [query,     setQuery]     = useState('');
  const [users,     setUsers]     = useState<SearchUser[]>([]);
  const [recipes,   setRecipes]   = useState<SearchRecipe[]>([]);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (query.trim().length < 2) { setUsers([]); setRecipes([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        // Recipes (title + ingredients + tags) and people, in parallel.
        const [recipeResults, userResults] = await Promise.all([
          searchRecipes(query).catch(() => [] as SearchRecipe[]),
          searchUsers(query).catch(() => [] as SearchUser[]),
        ]);
        setRecipes(recipeResults);
        setUsers(userResults);
        const init: Record<number, boolean> = {};
        userResults.forEach(u => { init[u.id] = u.is_following; });
        setFollowing(init);
      } finally { setSearching(false); }
    }, 380);
    return () => clearTimeout(t);
  }, [query]);

  const toggleFollow = async (user: SearchUser) => {
    const was = following[user.id];
    setFollowing(prev => ({ ...prev, [user.id]: !was }));
    try {
      if (was) await client.delete(`/users/${user.id}/follow`);
      else      await client.post(`/users/${user.id}/follow`);
    } catch {
      setFollowing(prev => ({ ...prev, [user.id]: was })); // revert on error
    }
  };

  const rows: Row[] = [];
  if (recipes.length > 0) {
    rows.push({ kind: 'header', key: 'h-recipes', title: lang === 'en' ? 'Recipes' : 'Mga Recipe' });
    recipes.forEach(r => rows.push({ kind: 'recipe', key: `r-${r.id}`, recipe: r }));
  }
  if (users.length > 0) {
    rows.push({ kind: 'header', key: 'h-users', title: lang === 'en' ? 'People' : 'Mga Tao' });
    users.forEach(u => rows.push({ kind: 'user', key: `u-${u.id}`, user: u }));
  }

  const showEmpty  = !searching && query.trim().length >= 2 && rows.length === 0;
  const showPrompt = !searching && query.trim().length < 2;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header / search bar */}
      <View className="flex-row items-center px-4 pt-4 pb-3 gap-3 border-b border-cream-200">
        <Pressable onPress={() => router.back()} className="p-2 active:opacity-60">
          <Text style={{ fontSize: 20 }}>←</Text>
        </Pressable>
        <View className="flex-1 flex-row items-center bg-cream-50 rounded-xl px-3 py-2.5 gap-2 border border-cream-300">
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            className="flex-1 text-sm text-ink"
            placeholder={lang === 'en' ? 'Search recipes, ingredients, people...' : 'Maghanap ng recipe, sangkap, tao...'}
            placeholderTextColor="#B0A18C"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
            style={{ fontFamily: 'NunitoSans_400Regular' }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setUsers([]); setRecipes([]); }} className="p-1">
              <Text style={{ fontSize: 14, color: '#6F655A' }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Loading */}
      {searching && <ActivityIndicator color="#386641" style={{ marginTop: 32 }} />}

      {/* Prompt state */}
      {showPrompt && (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 6, textAlign: 'center' }}>
            {lang === 'en' ? 'Search uLam' : 'Maghanap sa uLam'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center', lineHeight: 20 }}>
            {lang === 'en'
              ? 'Find recipes by name or ingredient ("manok", "monggo"), or people by name or username.'
              : 'Maghanap ng recipe gamit ang pangalan o sangkap ("manok", "monggo"), o mga tao gamit ang pangalan o username.'}
          </Text>
        </View>
      )}

      {/* Empty results */}
      {showEmpty && (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', marginBottom: 6, textAlign: 'center' }}>
            {lang === 'en' ? 'No results found' : 'Walang nahanap'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', textAlign: 'center' }}>
            {lang === 'en' ? 'Try a different word — a dish, an ingredient, or a name.' : 'Subukan ang ibang salita — ulam, sangkap, o pangalan.'}
          </Text>
        </View>
      )}

      {/* Results */}
      {!searching && (
        <FlatList
          data={rows}
          keyExtractor={row => row.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
          renderItem={({ item: row }) => {
            if (row.kind === 'header') {
              return (
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
                  {row.title}
                </Text>
              );
            }

            if (row.kind === 'recipe') {
              const r = row.recipe;
              return (
                <Pressable
                  onPress={() => router.push(`/recipe/${r.id}` as any)}
                  className="flex-row items-center px-4 py-3 border-b border-cream-200 active:bg-cream-50"
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#FDF0EA', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>🍲</Text>
                  </View>
                  <View className="flex-1 ml-3">
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                      {r.estimated_cost != null ? `₱${Number(r.estimated_cost).toFixed(0)}` : '—'}
                      {r.servings ? ` · ${r.servings} ${lang === 'en' ? 'servings' : 'tao'}` : ''}
                      {r.source === 'official' ? ' · uLam' : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, color: '#B0A18C' }}>›</Text>
                </Pressable>
              );
            }

            const user = row.user;
            const isFollowing = following[user.id] ?? user.is_following;
            return (
              <Pressable
                onPress={() => router.push(`/user/${user.id}` as any)}
                className="flex-row items-center px-4 py-3 border-b border-cream-200 active:bg-cream-50"
              >
                <Avatar name={user.name} size={44} />
                <View className="flex-1 ml-3">
                  <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000' }}>
                    {user.name}
                  </Text>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>
                    @{user.username}
                    {user.municipality ? ` · ${user.municipality}` : ''}
                    {' · '}Lv.{user.level}
                  </Text>
                </View>
                <Pressable
                  onPress={e => { e.stopPropagation(); toggleFollow(user); }}
                  className={`px-4 py-1.5 rounded-full border active:opacity-70 ${isFollowing ? 'border-cream-300 bg-cream-50' : 'border-brand-600 bg-brand-600'}`}
                >
                  <Text style={{
                    fontFamily: 'NunitoSans_600SemiBold', fontSize: 13,
                    color: isFollowing ? '#6F655A' : 'white',
                  }}>
                    {isFollowing
                      ? (lang === 'en' ? 'Following' : 'Sinusundan')
                      : (lang === 'en' ? 'Follow' : 'Sundan')}
                  </Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
