import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { resizeForUpload } from '@/src/utils/uploadImage';
import { Alert, Image, Pressable, Text, View } from 'react-native';

type Props = {
  lang: 'en' | 'tl';
  /** Preview URIs — either a freshly picked local uri or the existing remote photo. */
  coverUri: string | null;
  photoUri: string | null;
  onPickCover: (uri: string) => void;
  onPickPhoto: (uri: string) => void;
};

async function pickImage(aspect: [number, number], lang: 'en' | 'tl'): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      lang === 'en' ? 'Permission needed' : 'Kailangan ng pahintulot',
      lang === 'en' ? 'Please allow photo access to add store photos.' : 'Paki-allow ang photo access para makapagdagdag ng litrato.',
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (result.canceled) return null;
  // downscale before upload: covers 1280w, square photos 800w
  return resizeForUpload(result.assets[0].uri, aspect[0] > aspect[1] ? 1280 : 800, 0.75);
}

/** Header (cover) + store profile photo pickers, shared by add/edit store forms. */
export default function StorePhotoPicker({ lang, coverUri, photoUri, onPickCover, onPickPhoto }: Props) {
  return (
    <View className="mb-4">
      <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#292522', marginBottom: 6 }}>
        {lang === 'en' ? 'Photos (optional)' : 'Mga Litrato (opsyonal)'}
      </Text>

      {/* Header / cover photo — wide banner */}
      <Pressable
        onPress={async () => {
          const uri = await pickImage([16, 9], lang);
          if (uri) onPickCover(uri);
        }}
        style={{
          height: 120, borderRadius: 14, overflow: 'hidden',
          backgroundColor: '#F9EDD3', borderWidth: 1, borderColor: '#F0DEBB',
          alignItems: 'center', justifyContent: 'center',
        }}
        className="active:opacity-80"
      >
        {coverUri ? (
          <>
            <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            <View style={{ position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(41,37,34,0.65)', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Ionicons name="camera-outline" size={12} color="#FFF8E8" />
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#FFF8E8' }}>
                {lang === 'en' ? 'Change' : 'Palitan'}
              </Text>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Ionicons name="image-outline" size={24} color="#B0A18C" />
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A' }}>
              {lang === 'en' ? 'Add header photo' : 'Magdagdag ng header photo'}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Store profile photo — circle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <Pressable
          onPress={async () => {
            const uri = await pickImage([1, 1], lang);
            if (uri) onPickPhoto(uri);
          }}
          style={{
            width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
            backgroundColor: '#F9EDD3', borderWidth: 1, borderColor: '#F0DEBB',
            alignItems: 'center', justifyContent: 'center',
          }}
          className="active:opacity-80"
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Ionicons name="storefront-outline" size={24} color="#B0A18C" />
          )}
        </Pressable>
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', flex: 1 }}>
          {lang === 'en'
            ? 'Store photo (logo or storefront). Tap to change.'
            : 'Litrato ng tindahan (logo o harapan). I-tap para palitan.'}
        </Text>
      </View>
    </View>
  );
}
