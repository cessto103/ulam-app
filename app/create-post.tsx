import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { useXpReward } from '@/src/hooks/useXpReward';
import RecipeCoverPhoto from '@/src/components/recipe/RecipeCoverPhoto';
import { type CollageStyle, type FontKey, type GradientKey } from '@/src/types/recipe';
import { getRecipePhotos } from '@/src/utils/recipePhotos';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constants ─────────────────────────────────────────────────────────────────

const POST_TYPES = [
  { key: 'price_tip',  label: '💰 Price Tip',    hint: 'Share where you found cheaper prices today.' },
  { key: 'budget_win', label: '🏆 Budget Win',   hint: 'Tell us about your savings success!' },
  { key: 'general',    label: '💬 General',       hint: 'Questions, news, or anything you want to share.' },
];

const MAX_PHOTOS = 3;
const MAX_DIM    = 900;

const BUDGET_LABEL: Record<string, string> = {
  budget_100: '₱100', budget_200: '₱200', budget_400: '₱400', budget_400plus: '₱400+',
  budget_600: '₱600', budget_800: '₱800', budget_1000: '₱1,000', budget_1000plus: '₱1,000+',
};

// ─── Image helper ──────────────────────────────────────────────────────────────

async function resizeAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const { uri, width, height } = asset;
  if (width <= MAX_DIM && height <= MAX_DIM) return uri;
  const resizeOp = width >= height
    ? { resize: { width: MAX_DIM } as const }
    : { resize: { height: MAX_DIM } as const };
  const result = await ImageManipulator.manipulateAsync(uri, [resizeOp], {
    compress: 0.82, format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

// ─── Recipe card preview ───────────────────────────────────────────────────────

type RecipePreviewData = {
  title: string;
  image_url: string | null;
  image_urls: string[] | null;
  collage_style: CollageStyle | null;
  gradient_key: GradientKey | null;
  font_key: FontKey | null;
};

// Reuses the exact same cover component the recipe detail page and every
// recipe card in the app render -- previously this had its own single-image
// preview keyed off a single `recipe_image` param, which could show a stale
// or wrong `image_url` even when the recipe's real photos (image_urls) were
// fine, and never fell back to the recipe's actual gradient/collage card.
function RecipePreviewCard({ recipe, budgetTag }: {
  recipe: RecipePreviewData; budgetTag?: string;
}) {
  const photos = getRecipePhotos(recipe);
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F0DEBB', marginBottom: 16 }}>
      <RecipeCoverPhoto
        height={140}
        photos={photos}
        collageStyle={recipe.collage_style ?? 'gradient'}
        gradientKey={recipe.gradient_key ?? 'grad_a'}
        fontKey={recipe.font_key ?? 'baloo'}
        title={recipe.title}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff' }}>
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#000000', flex: 1 }} numberOfLines={1}>
          {recipe.title}
        </Text>
        {budgetTag && (
          <View style={{ borderRadius: 999, backgroundColor: '#EFF4EC', paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>
              {BUDGET_LABEL[budgetTag] ?? budgetTag}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function CreatePostScreen() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const insets      = useSafeAreaInsets();
  const { lang }    = useLanguage();

  // Recipe share params passed from recipe detail page
  const { recipe_id, recipe_title, recipe_budget } = useLocalSearchParams<{
    recipe_id?: string;
    recipe_title?: string;
    recipe_budget?: string;
  }>();
  const isRecipeShare = !!recipe_id;

  // Fetches the recipe's real photos/card style instead of trusting a single
  // `recipe_image` param passed at navigation time (see RecipePreviewCard).
  const { data: recipePreview } = useQuery({
    queryKey: ['recipe-preview', recipe_id],
    queryFn: async () => {
      const { data } = await client.get(`/recipes/${recipe_id}`);
      return data.recipe as RecipePreviewData;
    },
    enabled: isRecipeShare,
    staleTime: 60_000,
  });

  const [postType, setPostType]         = useState(isRecipeShare ? 'recipe_share' : 'price_tip');
  const [body, setBody]                 = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [photos, setPhotos]             = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading]           = useState(false);
  const { handleXpResponse } = useXpReward();

  const canSubmit = isRecipeShare
    ? body.length <= 2000
    : body.trim().length >= 10 && body.length <= 2000;

  // ── Photo picker ─────────────────────────────────────────────────────────────

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'en' ? 'Permission needed' : 'Kailangan ng permiso',
        lang === 'en' ? 'Allow access to your photos.' : 'Payagan ang access sa iyong mga larawan.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 1,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('post_type', postType);
      // Allow empty caption for recipe shares; send a space so backend 'required' passes
      form.append('body', body.trim() || ' ');
      if (recipe_id)    form.append('recipe_id', recipe_id);
      if (budgetAmount) form.append('budget_amount', budgetAmount);

      for (const asset of photos) {
        const resizedUri = await resizeAsset(asset);
        const fileName   = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        form.append('images[]', { uri: resizedUri, type: 'image/jpeg', name: fileName } as any);
      }

      const { data } = await client.post('/community/post', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      // This screen navigates away immediately, so there's no time to play
      // the celebration animation here — just make sure the XP/achievement
      // state is already fresh by the time the user lands back on the feed.
      handleXpResponse(data ?? {});
      router.back();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? (lang === 'en' ? 'Could not post. Try again.' : 'Hindi ma-post. Subukan ulit.');
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const charCount = body.length;
  const charColor = charCount > 1800 ? '#E24B4A' : charCount > 1500 ? '#E3A32A' : '#B0A18C';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ title: isRecipeShare ? 'Share Recipe' : 'New Post' }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: Math.max(insets.bottom + 16, 32),
        }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Recipe share mode ── */}
        {isRecipeShare ? (
          <>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#6F655A', marginBottom: 10 }}>
              Sharing Recipe
            </Text>
            <RecipePreviewCard
              recipe={recipePreview ?? {
                title: recipe_title ?? 'Recipe',
                image_url: null,
                image_urls: null,
                collage_style: null,
                gradient_key: null,
                font_key: null,
              }}
              budgetTag={recipe_budget}
            />
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
                  Caption <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>
                    {lang === 'en' ? '(optional)' : '(opsyonal)'}
                  </Text>
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: charColor }}>{charCount}/2000</Text>
              </View>
              <TextInput
                style={{
                  width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB',
                  backgroundColor: '#FFFCF5', paddingHorizontal: 14, paddingVertical: 12,
                  fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000',
                  minHeight: 100, textAlignVertical: 'top',
                }}
                placeholder="Say something about this recipe..."
                placeholderTextColor="#B0A18C"
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        ) : (
          <>
            {/* ── Post type selector ── */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginBottom: 8 }}>Post type</Text>
              <View style={{ gap: 8 }}>
                {POST_TYPES.map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => setPostType(t.key)}
                    style={{
                      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                      borderRadius: 12, borderWidth: 1, padding: 12,
                      borderColor: postType === t.key ? '#6E7B4A' : '#F0DEBB',
                      backgroundColor: postType === t.key ? '#EFF4EC' : '#FFFCF5',
                    }}
                  >
                    <View style={{
                      width: 16, height: 16, borderRadius: 8, marginTop: 1,
                      borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
                      borderColor: postType === t.key ? '#6E7B4A' : '#B0A18C',
                      backgroundColor: postType === t.key ? '#6E7B4A' : 'transparent',
                    }}>
                      {postType === t.key && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontFamily: 'NunitoSans_600SemiBold', fontSize: 14,
                        color: postType === t.key ? '#5E693F' : '#000000',
                      }}>
                        {t.label}
                      </Text>
                      <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 2 }}>
                        {t.hint}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Body text */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
                  {lang === 'en' ? 'Your message' : 'Iyong mensahe'}
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: charColor }}>{charCount}/2000</Text>
              </View>
              <TextInput
                style={{
                  width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB',
                  backgroundColor: '#FFFCF5', paddingHorizontal: 14, paddingVertical: 12,
                  fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000',
                  minHeight: 120, textAlignVertical: 'top',
                }}
                placeholder="Minimum 10 characters."
                placeholderTextColor="#B0A18C"
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={6}
              />
            </View>

            {/* Budget amount (budget_win only) */}
            {postType === 'budget_win' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginBottom: 6 }}>
                  {lang === 'en' ? 'How much did you save?' : 'Magkano ang natipid?'}{' '}
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>
                    {lang === 'en' ? '(optional)' : '(opsyonal)'}
                  </Text>
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB',
                  backgroundColor: '#FFFCF5', paddingHorizontal: 12,
                }}>
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', marginRight: 4 }}>₱</Text>
                  <TextInput
                    style={{ flex: 1, paddingVertical: 12, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000' }}
                    value={budgetAmount}
                    onChangeText={(v) => setBudgetAmount(v.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#B0A18C"
                  />
                </View>
              </View>
            )}

            {/* Photo picker */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>
                  {lang === 'en' ? 'Photos' : 'Mga Larawan'}{' '}
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>
                    {lang === 'en' ? `(optional, max ${MAX_PHOTOS})` : `(opsyonal, max ${MAX_PHOTOS})`}
                  </Text>
                </Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{photos.length}/{MAX_PHOTOS}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {photos.map((asset, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri: asset.uri }} style={{ width: 96, height: 96, borderRadius: 10 }} resizeMode="cover" />
                    <Pressable
                      onPress={() => removePhoto(i)}
                      hitSlop={6}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, lineHeight: 16 }}>×</Text>
                    </Pressable>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable
                    onPress={pickPhoto}
                    style={{
                      width: 96, height: 96, borderRadius: 10,
                      borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D3C5AB',
                      alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFCF5',
                    }}
                  >
                    <Text style={{ fontSize: 22, color: '#6F655A' }}>+</Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 2 }}>
                      {lang === 'en' ? 'Photo' : 'Larawan'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}

        {/* Community reminder */}
        <View style={{ backgroundColor: '#FEF6E3', borderRadius: 12, padding: 12, marginBottom: 20, flexDirection: 'row', gap: 8 }}>
          <Text style={{ fontSize: 14 }}>💡</Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#9A6A12', lineHeight: 18, flex: 1 }}>
            {isRecipeShare
              ? (lang === 'en'
                  ? 'Share the recipe with the community to help other families plan their budget.'
                  : 'I-share ang recipe sa komunidad para matulungan ang ibang pamilya sa pagpaplano ng budget.')
              : 'Be responsible when posting. Price tips should be based on actual prices you saw in the market.'}
          </Text>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
          style={{
            width: '100%', borderRadius: 12, backgroundColor: '#C45E3A',
            paddingVertical: 16, alignItems: 'center',
            opacity: loading || !canSubmit ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
              {isRecipeShare ? 'Share to Community' : 'Publish Post'}
            </Text>
          )}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
