import { ITEM_CATEGORIES } from '@/src/constants/itemCategories';
import { postMultipart, resizeForUpload } from '@/src/utils/uploadImage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import client, { API_URL } from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

const CATEGORIES = ITEM_CATEGORIES;

const UNITS = ['kg', 'bundle', 'pcs', '100g', 'pack', 'bottle', 'tray', 'lata', 'sachet'];

export type EditableItem = {
  id: number;
  item_name: string;
  category: string | null;
  price_per_unit: number | string;
  unit: string;
  photo?: string | null;
};

type AddItemModalProps = {
  visible: boolean;
  onClose: () => void;
  tindahanId: number;
  editItem?: EditableItem | null;
};

// ─── Store owner "Add / edit item" modal ───────────────────────────────────────
// Used by stall/[id].tsx, shown only when the viewer owns the store. Passing
// `editItem` switches this into edit mode (PATCH instead of POST), prefilled.

export default function AddItemModal({ visible, onClose, tindahanId, editItem }: AddItemModalProps) {
  const { lang } = useLanguage();
  const router = useRouter();
  const qc = useQueryClient();
  const isEditing = !!editItem;

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice]       = useState('');
  const [unit, setUnit]         = useState('kg');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setItemName(editItem?.item_name ?? '');
      setCategory(editItem?.category ?? '');
      setPrice(editItem ? String(editItem.price_per_unit) : '');
      setUnit(editItem?.unit ?? 'kg');
      setPhotoUri(null);
    }
  }, [visible, editItem]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const { mutate: submitItem, isPending } = useMutation({
    mutationFn: async () => {
      if (photoUri) {
        const resized = await resizeForUpload(photoUri, 640, 0.7);
        const fields: Record<string, string | number> = {
          item_name: itemName.trim(),
          price_per_unit: parseFloat(price),
          unit,
        };
        if (category) fields.category = category;
        if (isEditing) fields._method = 'PATCH';
        const path = isEditing
          ? `/tindahan/${tindahanId}/prices/${editItem!.id}`
          : `/tindahan/${tindahanId}/prices`;
        return postMultipart(path, fields, { photo: resized });
      }
      const body = {
        item_name: itemName.trim(),
        category: category || undefined,
        price_per_unit: parseFloat(price),
        unit,
      };
      return isEditing
        ? client.patch(`/tindahan/${tindahanId}/prices/${editItem!.id}`, body)
        : client.post(`/tindahan/${tindahanId}/prices`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stall', String(tindahanId)] });
      onClose();
    },
    onError: (e: any) => {
      // Seller-tier item cap reached — offer the subscription page instead of a dead end.
      if (e?.response?.data?.upgrade_required) {
        Alert.alert(
          lang === 'en' ? 'Store is full!' : 'Puno na ang tindahan!',
          e?.response?.data?.message ??
            (lang === 'en' ? 'Upgrade your plan to add more items.' : 'Mag-upgrade para makapagdagdag pa.'),
          [
            { text: lang === 'en' ? 'Not now' : 'Mamaya na', style: 'cancel' },
            {
              text: lang === 'en' ? 'View plans' : 'Tingnan ang plans',
              onPress: () => { onClose(); router.push('/subscription' as any); },
            },
          ],
        );
        return;
      }
      const msg =
        e?.response?.data?.message ??
        (isEditing
          ? (lang === 'en' ? 'Could not save changes. Try again.' : 'Hindi ma-save ang pagbabago. Subukan ulit.')
          : (lang === 'en' ? 'Could not add item. Try again.' : 'Hindi maidagdag ang item. Subukan ulit.'));
      Alert.alert(lang === 'en' ? 'Error' : 'Error', msg);
    },
  });

  const canSubmit = itemName.trim().length > 0 && price !== '' && parseFloat(price) > 0 && !isPending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFCF5' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 14,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#F9EDD3',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }}>
            🏷️ {isEditing
              ? (lang === 'en' ? 'Edit item' : 'I-edit ang Item')
              : (lang === 'en' ? 'Add item' : 'Magdagdag ng Item')}
          </Text>
          <Pressable
            onPress={onClose}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9EDD3', alignItems: 'center', justifyContent: 'center' }}
            className="active:opacity-70"
          >
            <Ionicons name="close" size={16} color="#6F655A" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          {/* Item name */}
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
            {lang === 'en' ? 'Item name' : 'Pangalan ng Item'}
          </Text>
          <TextInput
            value={itemName}
            onChangeText={setItemName}
            placeholder={lang === 'en' ? 'e.g. Galunggong, Kamatis...' : 'hal. Galunggong, Kamatis...'}
            placeholderTextColor="#B0A18C"
            autoCapitalize="words"
            style={{
              borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#fff',
              paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'NunitoSans_400Regular',
              fontSize: 14, color: '#000000', marginBottom: 16,
            }}
          />

          {/* Item photo */}
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 8 }}>
            {lang === 'en' ? 'Photo (optional)' : 'Litrato (opsyonal)'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Pressable
              onPress={pickPhoto}
              style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: '#F9EDD3', borderWidth: 1, borderColor: '#F0DEBB', alignItems: 'center', justifyContent: 'center' }}
              className="active:opacity-80"
            >
              {photoUri || editItem?.photo ? (
                <Image
                  source={{ uri: photoUri ?? `${API_URL}${editItem!.photo}` }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="camera-outline" size={22} color="#B0A18C" />
              )}
            </Pressable>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', flex: 1 }}>
              {lang === 'en'
                ? 'Snap the product so neighbors recognize it, lalo na ang uncommon items.'
                : 'Kunan ng litrato para makilala ng kapitbahay, lalo na ang di-pangkaraniwang item.'}
            </Text>
          </View>

          {/* Category chips */}
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 8 }}>
            {lang === 'en' ? 'Category' : 'Kategorya'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                style={{
                  borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
                  backgroundColor: category === cat.key ? '#6E7B4A' : '#fff',
                  borderColor: category === cat.key ? '#6E7B4A' : '#F0DEBB',
                }}
                className="active:opacity-70"
              >
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: category === cat.key ? '#fff' : '#000000' }}>
                  {lang === 'en' ? cat.labelEn : cat.labelTl}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Price + unit */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
                {lang === 'en' ? 'Price (₱)' : 'Presyo (₱)'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB', backgroundColor: '#fff', paddingHorizontal: 12 }}>
                <Text style={{ color: '#6F655A', marginRight: 4 }}>₱</Text>
                <TextInput
                  value={price}
                  onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#B0A18C"
                  style={{ flex: 1, paddingVertical: 12, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#000000' }}
                />
              </View>
            </View>
            <View style={{ width: 110 }}>
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
                {lang === 'en' ? 'Unit' : 'Yunit'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ height: 44 }}>
                {UNITS.map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={{
                      borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8,
                      backgroundColor: unit === u ? '#6E7B4A' : '#fff',
                      borderColor: unit === u ? '#6E7B4A' : '#F0DEBB',
                    }}
                    className="active:opacity-70"
                  >
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: unit === u ? '#fff' : '#000000' }}>
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </ScrollView>

        <View style={{ padding: 16, paddingTop: 0 }}>
          <Pressable
            onPress={() => submitItem()}
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit ? '#6E7B4A' : '#F9EDD3',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            }}
            className="active:opacity-80"
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: canSubmit ? '#fff' : '#B0A18C' }}>
                {isEditing
                  ? (lang === 'en' ? 'Save changes' : 'I-save ang Pagbabago')
                  : (lang === 'en' ? 'Add item' : 'Idagdag ang Item')}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
