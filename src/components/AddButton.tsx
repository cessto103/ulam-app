import AnimatedPressable from '@/src/components/AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  size?: 'sm' | 'md';
};

/** Standard "add" pill: terracotta with a plus badge, per the interactive-color standard. */
export default function AddButton({ label, onPress, size = 'sm' }: Props) {
  const sm = size === 'sm';
  return (
    <AnimatedPressable
      onPress={onPress}
      className="active:opacity-80"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#C45E3A',
        borderRadius: 999,
        paddingLeft: sm ? 4 : 5,
        paddingRight: sm ? 12 : 14,
        paddingVertical: sm ? 4 : 5,
        shadowColor: '#C45E3A',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <View
        style={{
          width: sm ? 22 : 26,
          height: sm ? 22 : 26,
          borderRadius: 13,
          backgroundColor: 'rgba(255,248,232,0.28)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="add" size={sm ? 15 : 17} color="#fff" />
      </View>
      <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: sm ? 12 : 13, color: '#fff' }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
