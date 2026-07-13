import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';

export const CONTENT_REPORT_REASONS = [
  { key: 'explicit',       en: 'Explicit or adult content',  tl: 'Malaswang content' },
  { key: 'not_food',       en: 'Not related to food',        tl: 'Hindi tungkol sa pagkain' },
  { key: 'politics',       en: 'Politics',                   tl: 'Pulitika' },
  { key: 'gossip',         en: 'Showbiz or gossip',          tl: 'Showbiz o tsismis' },
  { key: 'harassment',     en: 'Harmful or offensive',       tl: 'Nakakasakit o offensive' },
  { key: 'spam',           en: 'Spam or scam',               tl: 'Spam o scam' },
  { key: 'misinformation', en: 'False information',          tl: 'Maling impormasyon' },
  { key: 'other',          en: 'Other',                      tl: 'Iba pa' },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  contentType: 'post' | 'recipe' | 'tindahan';
  contentId: number;
};

/** "Report this" bottom sheet shared by posts, recipes, and stores. */
export default function ReportContentSheet({ visible, onClose, contentType, contentId }: Props) {
  const { lang } = useLanguage();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      client.post('/content-reports', {
        content_type: contentType,
        content_id: contentId,
        reason,
        details: details.trim() || null,
      }),
    onSuccess: () => {
      onClose();
      setReason(null);
      setDetails('');
      Alert.alert(
        lang === 'en' ? 'Report submitted' : 'Naipasa ang report',
        lang === 'en'
          ? 'Thank you for keeping uLam safe. Our team will review this.'
          : 'Salamat sa pagtulong na panatilihing ligtas ang uLam. Irereview ito ng team.',
      );
    },
    onError: (e: any) =>
      Alert.alert('Error', e?.response?.data?.message ?? (lang === 'en' ? 'Could not submit. Try again.' : 'Hindi naipasa. Subukan ulit.')),
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(41,37,34,0.45)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: '#FFFCF5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#F0DEBB', marginBottom: 14 }} />
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#292522' }}>
            {lang === 'en' ? 'Report this' : 'I-report ito'}
          </Text>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A', marginBottom: 12 }}>
            {lang === 'en' ? "Tell us what's wrong. Reports are anonymous to the author." : 'Sabihin kung ano ang mali. Hindi makikita ng may-ari kung sino ang nag-report.'}
          </Text>

          {CONTENT_REPORT_REASONS.map((opt) => {
            const selected = reason === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setReason(opt.key)}
                className="flex-row items-center gap-3 py-2 active:opacity-70"
              >
                <View
                  style={{
                    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                    borderColor: selected ? '#6E7B4A' : '#D3C5AB',
                    backgroundColor: selected ? '#6E7B4A' : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {selected && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF8E8' }} />}
                </View>
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: '#292522' }}>
                  {opt[lang]}
                </Text>
              </Pressable>
            );
          })}

          <TextInput
            style={{
              marginTop: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F0DEBB',
              paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#292522',
              fontFamily: 'NunitoSans_400Regular', minHeight: 48, textAlignVertical: 'top',
            }}
            placeholder={lang === 'en' ? 'Add details (optional)…' : 'Dagdag na detalye (opsyonal)…'}
            placeholderTextColor="#B0A18C"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={500}
          />

          <Pressable
            onPress={() => reason && submit()}
            disabled={!reason || isPending}
            className="rounded-xl py-3.5 items-center mt-4 active:opacity-80"
            style={{ backgroundColor: '#C45E3A', opacity: !reason || isPending ? 0.5 : 1 }}
          >
            <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
              {lang === 'en' ? 'Submit report' : 'Ipasa ang report'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
