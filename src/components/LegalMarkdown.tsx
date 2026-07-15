import { Text, View } from 'react-native';

/**
 * Minimal renderer for our own legal markdown (headings, bullets, bold,
 * paragraphs). Content is authored in the admin dashboard, so only this
 * constrained subset needs to render.
 */
export default function LegalMarkdown({ md }: { md: string }) {
  const blocks = md.replace(/\r\n/g, '\n').split(/\n\n+/);

  return (
    <View>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('## ')) {
          return (
            <Text key={i} style={{ fontFamily: 'Baloo2_700Bold', fontSize: 17, color: '#A63F1F', marginTop: 18, marginBottom: 6 }}>
              {inline(trimmed.slice(3))}
            </Text>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <Text key={i} style={{ fontFamily: 'Baloo2_700Bold', fontSize: 24, color: '#000000', marginBottom: 8 }}>
              {inline(trimmed.slice(2))}
            </Text>
          );
        }
        if (/^[-•] /m.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => l.trim());
          return (
            <View key={i} style={{ marginBottom: 10, gap: 5 }}>
              {items.map((line, j) => (
                <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ color: '#386641', fontSize: 14, lineHeight: 21 }}>•</Text>
                  <Text style={{ flex: 1, fontFamily: 'NunitoSans_400Regular', fontSize: 14, lineHeight: 21, color: '#000000' }}>
                    {inline(line.replace(/^[-•] /, ''))}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={i} style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, lineHeight: 22, color: '#000000', marginBottom: 10 }}>
            {inline(trimmed.replace(/\n/g, ' '))}
          </Text>
        );
      })}
    </View>
  );
}

/** Renders **bold** spans; strips link syntax down to its text. */
function inline(text: string): React.ReactNode[] {
  const cleaned = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={i} style={{ fontFamily: 'NunitoSans_700Bold' }}>{part.slice(2, -2)}</Text>
    ) : (
      <Text key={i}>{part}</Text>
    )
  );
}
