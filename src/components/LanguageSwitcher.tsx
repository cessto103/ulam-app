import { useLanguage } from '@/src/context/LanguageContext';
import { Pressable, Text, View } from 'react-native';

type Props = {
  /** "warm" matches the cream/terracotta auth screens; default keeps the teal look. */
  tone?: 'default' | 'warm';
};

export default function LanguageSwitcher({ tone = 'default' }: Props) {
  const { lang, setLang } = useLanguage();
  const warm = tone === 'warm';

  return (
    <View
      className={`flex-row rounded-full border overflow-hidden ${warm ? 'border-cream-300' : 'border-cream-300'}`}
      style={{ height: 28 }}
    >
      {(['en', 'tl'] as const).map((l, i) => (
        <Pressable
          key={l}
          onPress={() => setLang(l)}
          className={`px-3 items-center justify-center ${
            lang === l ? 'bg-olive-400' : 'bg-white'
          }`}
          style={i === 0 ? {} : { borderLeftWidth: 0.5, borderLeftColor: warm ? '#F0DEBB' : '#F0DEBB' }}
        >
          <Text
            className={`text-xs font-semibold ${
              lang === l ? 'text-white' : warm ? 'text-ink-soft' : 'text-ink-soft'
            }`}
          >
            {l === 'en' ? 'English' : 'Taglish'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
