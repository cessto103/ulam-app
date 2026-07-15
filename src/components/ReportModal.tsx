import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

type ReportableType = 'market' | 'tindahan';

type ReportModalProps = {
  visible: boolean;
  onClose: () => void;
  reportableType: ReportableType;
  reportableId: number;
};

// ─── Shared "Report a listing" modal ───────────────────────────────────────────
// Used by market/[id].tsx and stall/[id].tsx. Android has no Alert.prompt, so
// this draws its own inline text-input modal instead.

export default function ReportModal({ visible, onClose, reportableType, reportableId }: ReportModalProps) {
  const { lang } = useLanguage();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (visible) setReason('');
  }, [visible]);

  const { mutate: submitReport, isPending } = useMutation({
    mutationFn: () =>
      client.post('/listing-reports', {
        reportable_type: reportableType,
        reportable_id: reportableId,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      onClose();
      Alert.alert(
        lang === 'en' ? 'Report submitted' : 'Naisumite ang Report',
        lang === 'en'
          ? 'Thanks for letting us know. Our team will review this listing.'
          : 'Salamat sa pag-abiso. Susuriin ng aming team ang listing na ito.'
      );
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ??
        (lang === 'en' ? 'Could not submit report. Try again.' : 'Hindi ma-submit ang report. Subukan ulit.');
      Alert.alert(lang === 'en' ? 'Error' : 'Error', msg);
    },
  });

  const canSubmit = reason.trim().length > 0 && reason.trim().length <= 500 && !isPending;

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
            🚩 {lang === 'en' ? 'Report this listing' : 'I-report ang listing na ito'}
          </Text>
          <Pressable
            onPress={onClose}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9EDD3', alignItems: 'center', justifyContent: 'center' }}
            className="active:opacity-70"
          >
            <Ionicons name="close" size={16} color="#6F655A" />
          </Pressable>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#6F655A', marginBottom: 14, lineHeight: 19 }}>
            {lang === 'en'
              ? 'Tell us what looks wrong: duplicate listing, incorrect info, closed store, etc.'
              : 'Sabihin sa amin kung ano ang mali: duplicate na listing, maling impormasyon, sarado nang tindahan, atbp.'}
          </Text>

          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#000000', marginBottom: 6 }}>
            {lang === 'en' ? 'Reason' : 'Dahilan'}
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={lang === 'en' ? 'Describe the issue...' : 'Ilarawan ang problema...'}
            placeholderTextColor="#B0A18C"
            multiline
            numberOfLines={4}
            maxLength={500}
            style={{
              minHeight: 100,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#F0DEBB',
              backgroundColor: '#fff',
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'NunitoSans_400Regular',
              fontSize: 14,
              color: '#000000',
              textAlignVertical: 'top',
            }}
          />
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', marginTop: 4, textAlign: 'right' }}>
            {reason.length}/500
          </Text>
        </View>

        <View style={{ padding: 16, paddingTop: 0 }}>
          <Pressable
            onPress={() => submitReport()}
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit ? '#E24B4A' : '#F9EDD3',
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
                {lang === 'en' ? 'Submit report' : 'I-submit ang report'}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
