import { API_URL } from '@/src/api/client';
import { Image, Text, View } from 'react-native';

/** Item photo thumbnail; falls back to the item name's initials on a cream circle. */
export default function ItemThumb({
  photo,
  name,
  size = 38,
}: {
  photo?: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: '#F9EDD3',
        borderWidth: 1,
        borderColor: '#F0DEBB',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photo ? (
        <Image
          source={{ uri: photo.startsWith('http') ? photo : `${API_URL}${photo}` }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: size * 0.34, color: '#6F655A' }}>
          {initials}
        </Text>
      )}
    </View>
  );
}
