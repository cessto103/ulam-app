import client, { API_URL } from '@/src/api/client';
import { ULamScriptLogo } from '@/src/components/ULamLogo';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Image } from 'react-native';

type Branding = { logo: string | null; logo_light: string | null };

/**
 * The app logo, replaceable from the admin dashboard (Content → Branding).
 * Falls back to the built-in uLam script logo when no custom logo is set,
 * OR when the uploaded image fails to actually load (e.g. the server's
 * storage symlink isn't set up yet) -- a broken <Image> would otherwise
 * just render blank instead of showing something.
 * `size` matches ULamScriptLogo's size prop (roughly the render height).
 */
export default function BrandLogo({ size = 24, light = false }: { size?: number; light?: boolean }) {
  const { data } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await client.get<Branding>('/branding')).data,
    staleTime: 30 * 60_000,
    retry: 1,
  });
  const [failed, setFailed] = useState(false);

  const url = light ? data?.logo_light : data?.logo;

  if (url && !failed) {
    // Height ≈ the script logo at the same `size`; width leaves room for a
    // horizontal wordmark, `contain` keeps any aspect ratio unstretched.
    const height = size * 1.4;
    return (
      <Image
        source={{ uri: `${API_URL}${url}` }}
        style={{ height, width: height * 3.2 }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }

  return <ULamScriptLogo size={size} light={light} />;
}
