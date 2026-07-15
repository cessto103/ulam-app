import client from '@/src/api/client';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';

type BoostOption = { target: string; duration_days: number; price: number };
type BoostCatalog = {
  boosts: BoostOption[];
  payment: {
    payments_enabled: boolean;
    gcash_number: string | null;
    gcash_account_name: string | null;
    payment_instructions: string | null;
  };
};

function errorMessage(e: any, fallback: string): string {
  const errors = e?.response?.data?.errors;
  if (errors) return Object.values(errors).flat().join('\n');
  return e?.response?.data?.message ?? fallback;
}

export function BoostBadge({ visible }: { visible: boolean }) {
  const { lang } = useLanguage();
  if (!visible) return null;
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1 self-start">
      <Ionicons name="rocket" size={12} color="#9A6A12" />
      <Text className="text-[12px] font-bold text-gold-700">{lang === 'en' ? 'Boosted' : 'Naka-boost'}</Text>
    </View>
  );
}

export function BoostButton({
  target,
  boostableId,
  isOwner,
  isBoosted,
  refetchKey,
}: {
  target: 'recipe' | 'tindahan';
  boostableId: number;
  isOwner: boolean;
  isBoosted: boolean;
  refetchKey: unknown[];
}) {
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<BoostOption | null>(null);
  const [reference, setReference] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['boost-catalog'],
    queryFn: async () => (await client.get<BoostCatalog>('/seller/plans')).data,
    enabled: open,
  });

  const options = (data?.boosts ?? []).filter((b) => b.target === target);

  const { mutate: submit, isPending: submitting } = useMutation({
    mutationFn: async () =>
      client.post('/boosts', {
        target,
        boostable_id: boostableId,
        duration_days: selected!.duration_days,
        payment_reference: reference.trim(),
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: refetchKey });
      setOpen(false);
      setSelected(null);
      setReference('');
      Alert.alert(lang === 'en' ? 'Submitted' : 'Naipadala', res.data?.message ?? '');
    },
    onError: (e: any) => Alert.alert(lang === 'en' ? 'Could not submit' : 'Hindi naipadala', errorMessage(e, 'Something went wrong.')),
  });

  if (isBoosted || !isOwner) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1.5 rounded-full border border-gold-300 bg-gold-50 px-3 py-1.5 self-start active:opacity-70"
      >
        <Ionicons name="rocket-outline" size={13} color="#9A6A12" />
        <Text className="text-xs font-semibold text-gold-700">
          {lang === 'en' ? 'Boost this' : 'I-boost ito'}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(41,37,34,0.5)' }}>
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#000000' }}>
                {lang === 'en' ? 'Boost this' : 'I-boost ito'}
              </Text>
              <Pressable onPress={() => setOpen(false)} className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center">
                <Ionicons name="close" size={16} color="#000000" />
              </Pressable>
            </View>

            {isLoading ? (
              <ActivityIndicator color="#E7653B" style={{ marginVertical: 24 }} />
            ) : (
              <>
                <Text className="text-xs font-medium text-ink-soft mb-2">
                  {lang === 'en' ? 'Choose duration' : 'Pumili ng tagal'}
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {options.map((opt) => {
                    const active = selected?.duration_days === opt.duration_days;
                    return (
                      <Pressable
                        key={opt.duration_days}
                        onPress={() => setSelected(opt)}
                        className={`rounded-xl border px-4 py-3 ${active ? 'border-brand-500 bg-brand-50' : 'border-cream-200 bg-cream-50'}`}
                      >
                        <Text className={`text-sm font-bold ${active ? 'text-brand-600' : 'text-ink'}`}>
                          {opt.duration_days} {lang === 'en' ? 'days' : 'araw'}
                        </Text>
                        <Text className="text-xs text-ink-soft">₱{opt.price.toFixed(0)}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {selected && (
                  <>
                    {data?.payment.gcash_number && (
                      <View className="rounded-xl bg-cream-50 border border-cream-200 p-3 mb-3">
                        <Text className="text-xs text-ink-soft">
                          {lang === 'en' ? 'Send payment via GCash to' : 'Magpadala sa GCash sa'}
                        </Text>
                        <Text className="text-sm font-bold text-ink mt-0.5">
                          {data.payment.gcash_number} {data.payment.gcash_account_name ? `(${data.payment.gcash_account_name})` : ''}
                        </Text>
                      </View>
                    )}
                    <Text className="text-xs font-medium text-ink-soft mb-1.5">
                      {lang === 'en' ? 'GCash reference number' : 'GCash reference number'}
                    </Text>
                    <TextInput
                      className="bg-cream-50 rounded-xl px-4 py-3.5 text-sm text-ink mb-4 border border-cream-200"
                      placeholder="e.g. 1234567890123"
                      placeholderTextColor="#B0A18C"
                      value={reference}
                      onChangeText={(v) => setReference(v.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                    />
                    <Pressable
                      onPress={() => submit()}
                      disabled={submitting || reference.trim().length < 8}
                      className="w-full rounded-xl bg-brand-600 py-3.5 items-center active:opacity-80 disabled:opacity-60"
                    >
                      {submitting ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-sm font-semibold text-white">{lang === 'en' ? 'Submit payment' : 'Isumite'}</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
