import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, Text } from 'react-native';

/**
 * Opens turn-by-turn directions to a coordinate in Google Maps (app if
 * installed, browser otherwise). No API key needed — it's a plain deep link.
 */
export default function DirectionsButton({ latitude, longitude, compact = false }: { latitude: number; longitude: number; compact?: boolean }) {
  const { lang } = useLanguage();

  const openDirections = () => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
  };

  return (
    <Pressable
      onPress={openDirections}
      className="flex-row items-center justify-center gap-2 rounded-xl py-3 active:opacity-80"
      style={{ backgroundColor: '#386641' }}
    >
      <Ionicons name="navigate" size={16} color="#fff" />
      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: '#fff' }}>
        {compact
          ? (lang === 'en' ? 'Directions' : 'Direksyon')
          : (lang === 'en' ? 'Get Directions (Google Maps)' : 'Kunin ang Direksyon (Google Maps)')}
      </Text>
    </Pressable>
  );
}
