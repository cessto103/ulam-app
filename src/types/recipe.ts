export type CollageStyle =
  | 'split'
  | 'circle_right'
  | 'full'
  | 'three_col'
  | 'top_bottom'
  | 'gradient';

export type GradientKey =
  | 'grad_a'
  | 'grad_b'
  | 'grad_c'
  | 'grad_d'
  | 'grad_e'
  | 'grad_f'
  | 'grad_g'
  | 'grad_h';

export const GRADIENT_DEFS: Record<GradientKey, { colors: [string, string, ...string[]] }> = {
  grad_a: { colors: ['#386641', '#6B0F0F'] },
  grad_b: { colors: ['#0D1B2A', '#2D6A4F'] },
  grad_c: { colors: ['#4A1942', '#C74B50'] },
  grad_d: { colors: ['#134E5E', '#71B280'] },
  grad_e: { colors: ['#B06AB3', '#4568DC'] },
  grad_f: { colors: ['#F7971E', '#FFD200'] },
  grad_g: { colors: ['#1A1A2E', '#0F3460'] },
  grad_h: { colors: ['#870000', '#190A05'] },
};

export const GRADIENT_KEYS: GradientKey[] = [
  'grad_a', 'grad_b', 'grad_c', 'grad_d',
  'grad_e', 'grad_f', 'grad_g', 'grad_h',
];

export type FontKey = 'baloo' | 'dancing' | 'pacifico' | 'satisfy' | 'lobster';

export const FONT_DEFS: Record<FontKey, { family: string; label: string }> = {
  baloo:    { family: 'Baloo2_800ExtraBold',    label: 'Bold' },
  dancing:  { family: 'DancingScript_700Bold',  label: 'Dancing' },
  pacifico: { family: 'Pacifico_400Regular',    label: 'Pacifico' },
  satisfy:  { family: 'Satisfy_400Regular',     label: 'Satisfy' },
  lobster:  { family: 'Lobster_400Regular',     label: 'Lobster' },
};

export const FONT_KEYS: FontKey[] = ['baloo', 'dancing', 'pacifico', 'satisfy', 'lobster'];
