import client from '@/src/api/client';
import CollageStylePicker from '@/src/components/recipe/CollageStylePicker';
import RecipeCoverPhoto from '@/src/components/recipe/RecipeCoverPhoto';
import { type CollageStyle, type FontKey, type GradientKey } from '@/src/types/recipe';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

// ─── Constants (mirrors create-recipe) ───────────────────────────────────────

const SERVINGS_OPTIONS   = [1, 2, 3, 4, 5, 6, 8, 10, 12];
const TIME_OPTIONS       = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const DIFFICULTY_OPTIONS = [
  { key: 'easy',   label: '🟢 Easy' },
  { key: 'medium', label: '🟡 Medium' },
  { key: 'hard',   label: '🔴 Hard' },
] as const;
const BUDGET_OPTIONS = [
  { key: 'budget_100',      label: '₱100 or less' },
  { key: 'budget_200',      label: '₱101 – ₱200' },
  { key: 'budget_400',      label: '₱201 – ₱400' },
  { key: 'budget_600',      label: '₱401 – ₱600' },
  { key: 'budget_800',      label: '₱601 – ₱800' },
  { key: 'budget_1000',     label: '₱801 – ₱1,000' },
  { key: 'budget_1000plus', label: '₱1,000+' },
] as const;
const TAG_OPTIONS = [
  'no-meat', 'vegetarian', 'vegan', 'seafood', 'chicken', 'pork', 'beef',
  'soup', 'fried', 'grilled', 'quick', 'budget', 'family', 'spicy',
];
const MAX_PHOTOS = 3;
const MAX_DIM    = 900;

type Ingredient = { name: string; qty: string; price: string };

async function resizeAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const { uri, width, height } = asset;
  if (width <= MAX_DIM && height <= MAX_DIM) return uri;
  const resizeOp = width >= height
    ? { resize: { width: MAX_DIM } as const }
    : { resize: { height: MAX_DIM } as const };
  const result = await ImageManipulator.manipulateAsync(
    uri, [resizeOp], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

// ─── Inline select row ────────────────────────────────────────────────────────

function SelectRow<T extends string | number>({
  label, options, value, onChange,
}: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontFamily: 'NunitoSans_600SemiBold', color: '#6F655A', marginBottom: 6 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((o) => (
          <Pressable
            key={String(o)}
            onPress={() => onChange(o)}
            style={{
              borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
              backgroundColor: value === o ? '#6E7B4A' : '#F9EDD3',
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: 'NunitoSans_600SemiBold', color: value === o ? '#fff' : '#6F655A' }}>
              {String(o)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditRecipeScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const insets  = useSafeAreaInsets();

  // Form state
  const [title,            setTitle]            = useState('');
  const [description,      setDescription]      = useState('');
  const [servings,         setServings]         = useState<number>(4);
  const [prep,             setPrep]             = useState<number>(15);
  const [cook,             setCook]             = useState<number>(20);
  const [difficulty,       setDifficulty]       = useState<'easy' | 'medium' | 'hard'>('easy');
  const [budgetTag,        setBudgetTag]        = useState<string>('budget_200');
  const [tags,             setTags]             = useState<string[]>([]);
  const [steps,            setSteps]            = useState<string[]>(['']);
  const [tips,             setTips]             = useState<string[]>([]);
  const [ingredients,      setIngredients]      = useState<Ingredient[]>([{ name: '', qty: '', price: '' }]);

  const [youtubeUrl,         setYoutubeUrl]         = useState('');

  // Cover / photos
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPhotos,          setNewPhotos]          = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [collageStyle,       setCollageStyle]       = useState<CollageStyle>('gradient');
  const [gradientKey,        setGradientKey]        = useState<GradientKey>('grad_a');
  const [fontKey,            setFontKey]            = useState<FontKey>('baloo');
  const [pickerVisible,      setPickerVisible]      = useState(false);

  const [ready,   setReady]   = useState(false);
  const [loading, setLoading] = useState(false);

  // Derived
  const totalPhotoCount = existingPhotoUrls.length + newPhotos.length;
  const allPhotoURIs    = [...existingPhotoUrls, ...newPhotos.map((a) => a.uri)];
  const totalCost       = ingredients.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);

  // Fetch existing recipe
  const { data, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const { data } = await client.get(`/recipes/${id}`);
      return data;
    },
    enabled: !!id,
  });

  // Pre-fill form once data arrives
  useEffect(() => {
    if (!data?.recipe || ready) return;
    const r = data.recipe;
    setTitle(r.title ?? '');
    setDescription(r.description ?? '');
    setServings(r.servings ?? 4);
    setPrep(r.prep_time_minutes ?? 15);
    setCook(r.cook_time_minutes ?? 20);
    setDifficulty(r.difficulty ?? 'easy');
    setBudgetTag(r.budget_tag ?? 'budget_200');
    setTags(r.tags ?? []);
    setSteps(r.steps?.length ? r.steps : ['']);
    setTips(r.tips?.length ? r.tips : []);
    setIngredients(
      r.ingredients?.length
        ? r.ingredients.map((i: { name: string; quantity: string; estimated_price: number }) => ({
            name: i.name, qty: i.quantity, price: String(i.estimated_price),
          }))
        : [{ name: '', qty: '', price: '' }]
    );
    // Cover fields
    const urls: string[] = r.image_urls ?? (r.image_url ? [r.image_url] : []);
    setExistingPhotoUrls(urls);
    setCollageStyle(r.collage_style ?? 'gradient');
    setGradientKey(r.gradient_key ?? 'grad_a');
    setFontKey(r.font_key ?? 'baloo');
    setYoutubeUrl(r.youtube_url ?? '');
    setReady(true);
  }, [data, ready]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const addStep    = () => setSteps((p) => [...p, '']);
  const updateStep = (i: number, v: string) => setSteps((p) => p.map((s, idx) => idx === i ? v : s));
  const removeStep = (i: number) => setSteps((p) => p.filter((_, idx) => idx !== i));

  const addTip    = () => setTips((p) => [...p, '']);
  const updateTip = (i: number, v: string) => setTips((p) => p.map((t, idx) => idx === i ? v : t));
  const removeTip = (i: number) => setTips((p) => p.filter((_, idx) => idx !== i));

  const addIngredient    = () => setIngredients((p) => [...p, { name: '', qty: '', price: '' }]);
  const updateIngredient = (i: number, field: keyof Ingredient, v: string) =>
    setIngredients((p) => p.map((ing, idx) => idx === i ? { ...ing, [field]: v } : ing));
  const removeIngredient = (i: number) => setIngredients((p) => p.filter((_, idx) => idx !== i));

  const toggleTag = (tag: string) =>
    setTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  const removeExistingPhoto = (i: number) =>
    setExistingPhotoUrls((p) => p.filter((_, idx) => idx !== i));

  const removeNewPhoto = (i: number) =>
    setNewPhotos((p) => p.filter((_, idx) => idx !== i));

  const pickPhoto = async () => {
    if (totalPhotoCount >= MAX_PHOTOS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - totalPhotoCount, quality: 1,
    });
    if (!result.canceled) {
      const combined = [...newPhotos, ...result.assets].slice(0, MAX_PHOTOS - existingPhotoUrls.length);
      setNewPhotos(combined);
      if (totalPhotoCount === 0 && combined.length > 0) {
        setPickerVisible(true);
      }
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { Alert.alert('Missing info', 'Please enter a recipe title.'); return; }
    const validSteps = steps.filter((s) => s.trim());
    if (!validSteps.length) { Alert.alert('Missing info', 'Please add at least one step.'); return; }
    const validIng = ingredients.filter((i) => i.name.trim());
    if (!validIng.length) { Alert.alert('Missing info', 'Please add at least one ingredient.'); return; }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('_method', 'PATCH');
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('servings', String(servings));
      form.append('prep_time_minutes', String(prep));
      form.append('cook_time_minutes', String(cook));
      form.append('difficulty', difficulty);
      form.append('budget_tag', budgetTag);
      form.append('youtube_url', youtubeUrl.trim());
      form.append('collage_style', collageStyle);
      form.append('gradient_key', gradientKey);
      form.append('font_key', fontKey);
      tags.forEach((t, i) => form.append(`tags[${i}]`, t));
      validSteps.forEach((s, i) => form.append(`steps[${i}]`, s));
      tips.filter(t => t.trim()).forEach((t, i) => form.append(`tips[${i}]`, t));
      validIng.forEach((ing, i) => {
        form.append(`ingredients[${i}][name]`, ing.name);
        form.append(`ingredients[${i}][qty]`, ing.qty);
        form.append(`ingredients[${i}][price]`, ing.price || '0');
      });

      // Existing photos to keep
      existingPhotoUrls.forEach((url, i) => form.append(`existing_images[${i}]`, url));

      // New photos to upload
      for (const asset of newPhotos) {
        const uri  = await resizeAsset(asset);
        const name = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        form.append('images[]', { uri, type: 'image/jpeg', name } as unknown as Blob);
      }

      await client.post(`/recipes/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });

      qc.invalidateQueries({ queryKey: ['recipe', id] });
      qc.invalidateQueries({ queryKey: ['recipes'] });

      Alert.alert('Saved!', 'Your recipe has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [title, description, youtubeUrl, servings, prep, cook, difficulty, budgetTag, collageStyle, gradientKey, fontKey, tags, steps, tips, ingredients, existingPhotoUrls, newPhotos, id]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading || !ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#6E7B4A" />
      </View>
    );
  }

  if (!data?.is_mine) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 14, color: '#6F655A', textAlign: 'center', fontFamily: 'NunitoSans_400Regular' }}>
          You can only edit your own recipes.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 16, borderRadius: 12, backgroundColor: '#C45E3A', paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 14, fontFamily: 'NunitoSans_700Bold', color: '#fff' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const canSubmit = title.trim().length > 0 && steps.some((s) => s.trim()) && ingredients.some((i) => i.name.trim());

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Cover preview — full bleed ── */}
        <RecipeCoverPhoto
          photos={allPhotoURIs}
          collageStyle={collageStyle}
          gradientKey={gradientKey}
          fontKey={fontKey}
          title={title}
        />

        {/* ── Photo controls ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            {/* Existing uploaded photos */}
            {existingPhotoUrls.map((url, i) => (
              <View key={`existing-${i}`} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: url }}
                  style={{ width: 48, height: 48, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => removeExistingPhoto(i)}
                  style={{
                    position: 'absolute', top: -5, right: -5,
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: '#292522', alignItems: 'center', justifyContent: 'center',
                  }}
                  hitSlop={6}
                >
                  <Text style={{ color: '#fff', fontSize: 12, lineHeight: 13 }}>×</Text>
                </Pressable>
              </View>
            ))}

            {/* Newly picked photos */}
            {newPhotos.map((asset, i) => (
              <View key={`new-${i}`} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: asset.uri }}
                  style={{ width: 48, height: 48, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => removeNewPhoto(i)}
                  style={{
                    position: 'absolute', top: -5, right: -5,
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: '#292522', alignItems: 'center', justifyContent: 'center',
                  }}
                  hitSlop={6}
                >
                  <Text style={{ color: '#fff', fontSize: 12, lineHeight: 13 }}>×</Text>
                </Pressable>
              </View>
            ))}

            {/* Add photo button */}
            {totalPhotoCount < MAX_PHOTOS && (
              <Pressable
                onPress={pickPhoto}
                style={{
                  width: 48, height: 48, borderRadius: 8,
                  borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D3C5AB',
                  backgroundColor: '#FFFCF5', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="camera-outline" size={18} color="#B0A18C" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setPickerVisible(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 12, paddingVertical: 8,
              backgroundColor: '#EFF4EC', borderRadius: 10,
            }}
          >
            <Ionicons name="color-palette-outline" size={16} color="#C45E3A" />
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#C45E3A' }}>Style</Text>
          </Pressable>
        </View>

        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', paddingHorizontal: 16, marginTop: 4, marginBottom: 16 }}>
          {totalPhotoCount}/{MAX_PHOTOS} photos · tap Style to change cover layout
        </Text>

        {/* ── Form body ── */}
        <View style={{ paddingHorizontal: 16 }}>

          {/* Title */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>Recipe Title *</Text>
            <TextInput
              style={{ borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#FFFCF5', paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#292522', fontFamily: 'NunitoSans_400Regular' }}
              placeholder="e.g. Ginisang Patola"
              placeholderTextColor="#B0A18C"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>Description</Text>
            <TextInput
              style={{ borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#FFFCF5', paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#292522', fontFamily: 'NunitoSans_400Regular', minHeight: 72, textAlignVertical: 'top' }}
              placeholder="A short description of this recipe..."
              placeholderTextColor="#B0A18C"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* YouTube link */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>
              YouTube Video <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>(optional)</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#FFFCF5', paddingHorizontal: 12, gap: 8 }}>
              <Ionicons name="logo-youtube" size={18} color="#E24B4A" />
              <TextInput
                style={{ flex: 1, paddingVertical: 12, fontSize: 13, color: '#292522', fontFamily: 'NunitoSans_400Regular' }}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#B0A18C"
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {youtubeUrl.length > 0 && (
                <Pressable onPress={() => setYoutubeUrl('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#D3C5AB" />
                </Pressable>
              )}
            </View>
          </View>

          <SelectRow label="Servings" options={SERVINGS_OPTIONS} value={servings} onChange={setServings} />
          <SelectRow label="Prep time (minutes)" options={TIME_OPTIONS} value={prep} onChange={setPrep} />
          <SelectRow label="Cook time (minutes)" options={TIME_OPTIONS} value={cook} onChange={setCook} />

          {/* Difficulty */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>Difficulty</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DIFFICULTY_OPTIONS.map((d) => (
                <Pressable
                  key={d.key}
                  onPress={() => setDifficulty(d.key)}
                  style={{
                    flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1,
                    backgroundColor: difficulty === d.key ? '#6E7B4A' : '#FFFCF5',
                    borderColor:     difficulty === d.key ? '#6E7B4A' : '#F0DEBB',
                  }}
                >
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: difficulty === d.key ? '#fff' : '#6F655A' }}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Budget */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>Budget range</Text>
            <View style={{ gap: 8 }}>
              {BUDGET_OPTIONS.map((b) => (
                <Pressable
                  key={b.key}
                  onPress={() => setBudgetTag(b.key)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12,
                    borderColor:     budgetTag === b.key ? '#6E7B4A' : '#F0DEBB',
                    backgroundColor: budgetTag === b.key ? '#EFF4EC' : '#FFFCF5',
                  }}
                >
                  <View style={{
                    width: 16, height: 16, borderRadius: 8,
                    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
                    borderColor:     budgetTag === b.key ? '#6E7B4A' : '#D3C5AB',
                    backgroundColor: budgetTag === b.key ? '#6E7B4A' : 'transparent',
                  }}>
                    {budgetTag === b.key && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />}
                  </View>
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: budgetTag === b.key ? '#5E693F' : '#292522' }}>
                    {b.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Tags */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>
              Tags <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>(tap to select)</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TAG_OPTIONS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={{
                      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4,
                      backgroundColor: active ? '#6E7B4A' : '#fff',
                      borderWidth: active ? 0 : 1, borderColor: '#F0DEBB',
                    }}
                  >
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: active ? '#fff' : '#6F655A' }}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Instructions */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>Instructions *</Text>
            {steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#6E7B4A', alignItems: 'center', justifyContent: 'center', marginTop: 10, flexShrink: 0 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'NunitoSans_700Bold' }}>{i + 1}</Text>
                </View>
                <TextInput
                  style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#FFFCF5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#292522', fontFamily: 'NunitoSans_400Regular', textAlignVertical: 'top' }}
                  placeholder={`Step ${i + 1}...`}
                  placeholderTextColor="#B0A18C"
                  value={step}
                  onChangeText={(v) => updateStep(i, v)}
                  multiline
                />
                {steps.length > 1 && (
                  <Pressable onPress={() => removeStep(i)} hitSlop={8} style={{ marginTop: 10 }}>
                    <Ionicons name="close-circle-outline" size={20} color="#E24B4A" />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable
              onPress={addStep}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B9D0AE', paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#C45E3A', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={14} color="#fff" /></View><Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#C45E3A' }}>Add step</Text></View>
            </Pressable>
          </View>

          {/* Ingredients */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>Ingredients *</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4, paddingHorizontal: 4 }}>
              <Text style={{ flex: 1, fontSize: 12, fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>Ingredient</Text>
              <Text style={{ width: 96, fontSize: 12, fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>Qty / Unit</Text>
              <Text style={{ width: 64, fontSize: 12, fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>Price ₱</Text>
              <View style={{ width: 24 }} />
            </View>
            {ingredients.map((ing, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <TextInput
                  style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#FFFCF5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#292522', fontFamily: 'NunitoSans_400Regular' }}
                  placeholder="e.g. Patola"
                  placeholderTextColor="#B0A18C"
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(i, 'name', v)}
                />
                <TextInput
                  style={{ width: 96, borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#FFFCF5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#292522', fontFamily: 'NunitoSans_400Regular' }}
                  placeholder="2 pcs"
                  placeholderTextColor="#B0A18C"
                  value={ing.qty}
                  onChangeText={(v) => updateIngredient(i, 'qty', v)}
                />
                <TextInput
                  style={{ width: 64, borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#FFFCF5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#292522', fontFamily: 'NunitoSans_400Regular' }}
                  placeholder="0"
                  placeholderTextColor="#B0A18C"
                  value={ing.price}
                  onChangeText={(v) => updateIngredient(i, 'price', v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                />
                {ingredients.length > 1 && (
                  <Pressable onPress={() => removeIngredient(i)} hitSlop={8}>
                    <Ionicons name="close-circle-outline" size={20} color="#E24B4A" />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable
              onPress={addIngredient}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B9D0AE', paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#C45E3A', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={14} color="#fff" /></View><Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#C45E3A' }}>Add ingredient</Text></View>
            </Pressable>
          </View>

          {/* Tips */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', marginBottom: 6 }}>
              Tips <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#6F655A' }}>(optional)</Text>
            </Text>
            {tips.map((tip, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#F4B942', alignItems: 'center', justifyContent: 'center', marginTop: 10, flexShrink: 0 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>💡</Text>
                </View>
                <TextInput
                  style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#FFFCF5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#292522', fontFamily: 'NunitoSans_400Regular', textAlignVertical: 'top' }}
                  placeholder={`Tip ${i + 1}…`}
                  placeholderTextColor="#B0A18C"
                  value={tip}
                  onChangeText={(v) => updateTip(i, v)}
                  multiline
                />
                <Pressable onPress={() => removeTip(i)} hitSlop={8} style={{ marginTop: 10 }}>
                  <Ionicons name="close-circle-outline" size={20} color="#E24B4A" />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={addTip}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#F5C97A', paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#C4881C', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={14} color="#fff" /></View><Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#C4881C' }}>Add tip</Text></View>
            </Pressable>
          </View>

          {/* Estimated cost */}
          <View style={{ backgroundColor: '#EFF4EC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#C4881C' }}>Estimated cost</Text>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 18, color: '#C4881C' }}>₱{totalCost.toFixed(0)}</Text>
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
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>Save Changes</Text>
            )}
          </Pressable>

        </View>
      </ScrollView>

      <CollageStylePicker
        visible={pickerVisible}
        currentStyle={collageStyle}
        currentGradient={gradientKey}
        currentFont={fontKey}
        photoCount={totalPhotoCount}
        onApply={(style, gradient, font) => {
          setCollageStyle(style);
          setGradientKey(gradient);
          setFontKey(font);
          setPickerVisible(false);
        }}
        onCancel={() => setPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
