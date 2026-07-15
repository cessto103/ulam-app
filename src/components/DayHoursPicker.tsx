import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  DAY_LABELS,
  DAY_ORDER,
  DayHours,
  DayKey,
  StoreHoursValue,
  formatTime12h,
} from '@/src/types/storeHours';

// All 30-minute slots in a day, as 24h "HH:mm" strings.
const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

type TimePickerModalProps = {
  visible: boolean;
  value?: string;
  onSelect: (time: string) => void;
  onClose: () => void;
};

function TimePickerModal({ visible, value, onSelect, onClose }: TimePickerModalProps) {
  const { lang } = useLanguage();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '65%' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9EDD3' }}>
            <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 15, color: '#000000' }}>
              {lang === 'en' ? 'Select time' : 'Piliin ang Oras'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#6F655A" />
            </Pressable>
          </View>
          <ScrollView>
            {TIME_OPTIONS.map((t) => {
              const active = t === value;
              return (
                <Pressable
                  key={t}
                  onPress={() => { onSelect(t); onClose(); }}
                  style={{
                    paddingVertical: 12, paddingHorizontal: 20,
                    backgroundColor: active ? '#EFF4EC' : '#fff',
                  }}
                  className="active:opacity-70"
                >
                  <Text style={{ fontFamily: active ? 'NunitoSans_700Bold' : 'NunitoSans_400Regular', fontSize: 14, color: active ? '#386641' : '#000000' }}>
                    {formatTime12h(t)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type DayHoursPickerProps = {
  value: StoreHoursValue;
  onChange: (value: StoreHoursValue) => void;
};

export default function DayHoursPicker({ value, onChange }: DayHoursPickerProps) {
  const { lang } = useLanguage();
  const [pickerFor, setPickerFor] = useState<{ day: DayKey; field: 'open' | 'close' } | null>(null);

  const updateDay = (day: DayKey, patch: Partial<DayHours>) => {
    const current: DayHours = value[day] ?? { closed: false, open: '08:00', close: '18:00' };
    onChange({ ...value, [day]: { ...current, ...patch } });
  };

  return (
    <View>
      {DAY_ORDER.map((day) => {
        const day_ = value[day] ?? { closed: false, open: '08:00', close: '18:00' };
        return (
          <View
            key={day}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9EDD3',
            }}
          >
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', width: 78 }}>
              {lang === 'en' ? DAY_LABELS[day].en : DAY_LABELS[day].tl}
            </Text>

            {day_.closed ? (
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', flex: 1 }}>
                {lang === 'en' ? 'Closed' : 'Sarado'}
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Pressable
                  onPress={() => setPickerFor({ day, field: 'open' })}
                  style={{ backgroundColor: '#FFFCF5', borderRadius: 10, borderWidth: 1, borderColor: '#F0DEBB', paddingHorizontal: 10, paddingVertical: 7 }}
                  className="active:opacity-70"
                >
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>
                    {formatTime12h(day_.open)}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 13, color: '#6F655A' }}>–</Text>
                <Pressable
                  onPress={() => setPickerFor({ day, field: 'close' })}
                  style={{ backgroundColor: '#FFFCF5', borderRadius: 10, borderWidth: 1, borderColor: '#F0DEBB', paddingHorizontal: 10, paddingVertical: 7 }}
                  className="active:opacity-70"
                >
                  <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#386641' }}>
                    {formatTime12h(day_.close)}
                  </Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={() => updateDay(day, { closed: !day_.closed })}
              style={{
                width: 40, height: 22, borderRadius: 11, padding: 2,
                backgroundColor: day_.closed ? '#D3C5AB' : '#386641',
                alignItems: day_.closed ? 'flex-start' : 'flex-end',
              }}
              className="active:opacity-80"
            >
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
            </Pressable>
          </View>
        );
      })}

      <TimePickerModal
        visible={pickerFor !== null}
        value={pickerFor ? value[pickerFor.day]?.[pickerFor.field] : undefined}
        onSelect={(time) => {
          if (pickerFor) updateDay(pickerFor.day, { [pickerFor.field]: time });
        }}
        onClose={() => setPickerFor(null)}
      />
    </View>
  );
}
