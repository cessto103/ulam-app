import AndroidNavBarFiller from '@/src/components/AndroidNavBarFiller';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SelectFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  disabledHint?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
};

/** A tap-to-open bottom-sheet select, for choosing from a (often long) list of
 * fixed options instead of free-typing them — same visual pattern as the
 * market/city pickers already used in report-price.tsx. */
export default function SelectField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  disabled,
  disabledHint,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No options found.',
}: SelectFieldProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-ink-soft mb-1.5">{label}</Text>
      <Pressable
        onPress={() => { if (!disabled) { setSearch(''); setOpen(true); } }}
        className={`w-full flex-row items-center justify-between rounded-xl border px-4 py-3.5 ${
          disabled ? 'bg-cream-100 border-cream-200' : 'bg-cream-50 border-cream-300'
        }`}
      >
        <Text className={`text-sm ${value ? 'text-ink' : 'text-ink-soft'}`} numberOfLines={1}>
          {value || (disabled && disabledHint ? disabledHint : placeholder)}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#B0A18C" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: insets.bottom }}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9EDD3' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#000000' }}>{label}</Text>
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                  <Ionicons name="close" size={18} color="#6F655A" />
                </Pressable>
              </View>
              <TextInput
                className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-ink"
                placeholder={searchPlaceholder}
                placeholderTextColor="#B0A18C"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="words"
              />
            </View>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
              {filtered.length === 0 ? (
                <View className="p-6 items-center">
                  <Text className="text-xs text-ink-soft">{emptyLabel}</Text>
                </View>
              ) : (
                filtered.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => { onSelect(option); setOpen(false); }}
                    className="flex-row items-center justify-between px-4 py-3 border-b border-cream-200 active:opacity-70"
                  >
                    <Text style={{ fontFamily: option === value ? 'NunitoSans_700Bold' : 'NunitoSans_400Regular', fontSize: 14, color: '#000000' }}>
                      {option}
                    </Text>
                    {option === value && <Ionicons name="checkmark" size={16} color="#386641" />}
                  </Pressable>
                ))
              )}
            </ScrollView>
            <AndroidNavBarFiller />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
