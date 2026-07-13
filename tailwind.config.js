/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // "Filipino Food Palette" — canonical brand palette (2026-07-11)
        // Terracotta #E7653B primary · Leaf #386641 secondary · Cream #FFF8E8 bg
        // Gold #F4B942 budget accent · Charcoal #292522 text
        brand: {
          50:  '#FDF0EA',
          100: '#FBDFD2',
          200: '#F6BFA4',
          300: '#F09E76',
          400: '#EC8156',
          500: '#E7653B',
          600: '#C45E3A',
          700: '#A63F1F',
          800: '#7F2F17',
          900: '#58200F',
        },
        cream: {
          50:  '#FFFCF5',
          100: '#FFF8E8',
          200: '#F9EDD3',
          300: '#F0DEBB',
          400: '#E3CA9B',
        },
        ink: {
          DEFAULT: '#292522',
          soft:    '#6F655A',
          faint:   '#B0A18C',
        },
        leaf: {
          50:  '#EFF4EC',
          100: '#DCE8D6',
          200: '#B9D0AE',
          300: '#94B389',
          400: '#6E7B4A',
          500: '#4E7A47',
          600: '#386641',
          700: '#2C5234',
          800: '#203C26',
        },
        // Dark-olive header surface from the app-redesign mockup (leaf family, desaturated)
        olive: {
          300: '#8A9463',
          400: '#6E7B4A',
          500: '#5E693F',
          600: '#4F5835',
          700: '#40482B',
          800: '#3C3A2F',
        },
        gold: {
          50:  '#FEF6E3',
          100: '#FDEFC9',
          300: '#F8D076',
          400: '#F4B942',
          500: '#E3A32A',
          600: '#C4881C',
          700: '#9A6A12',
        },
        // Sariwa (Fresh Market) brand palette
        teal: {
          50:  '#EFF7F2',
          100: '#D4EDDD',
          200: '#A8D5B5',
          300: '#6BB88C',
          400: '#3A9B6F',
          500: '#2D8A5E',
          600: '#1E6E47',
          700: '#185A3A',
          800: '#1A2E22',
          900: '#0F1F17',
        },
        // Sariwa accent — turmeric gold
        accent: {
          DEFAULT: '#F5A623',
          light:   '#FEF3DC',
          dark:    '#A06B06',
        },
        amber: {
          50:  '#FEF3DC',
          200: '#F5A623',
          600: '#A06B06',
          800: '#633806',
        },
        // Muted / supporting
        muted: {
          DEFAULT: '#6B8F7A',
          light:   '#FAFCF8',
        },
        navy: {
          DEFAULT: '#1D4B8F',
          light: '#E6F1FB',
        },
        danger: {
          DEFAULT: '#E24B4A',
          light: '#FCEBEB',
        },
        streak: '#E05C2A',
      },
      fontFamily: {
        display:       ['Baloo2_700Bold'],
        'display-semi':['Baloo2_600SemiBold'],
        'display-xb':  ['Baloo2_800ExtraBold'],
        body:          ['NunitoSans_400Regular'],
        'body-semi':   ['NunitoSans_600SemiBold'],
        'body-bold':   ['NunitoSans_700Bold'],
      },
    },
  },
  plugins: [],
};
