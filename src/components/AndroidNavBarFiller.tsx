import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Expo SDK 54 enforces edge-to-edge on Android (mandatory from Android 15
// on regardless of config), which makes NavigationBar.setBackgroundColorAsync
// a no-op — its own type defs say so ("supported only when edge-to-edge is
// disabled"). Edge-to-edge means the system nav bar is transparent and just
// shows whatever the app draws underneath it, so the only way to make that
// area read as solid black is to actually draw a black view there ourselves.
//
// Mounted once at the root (app/_layout.tsx) this covers every screen in the
// main navigation stack automatically. It does NOT reach React Native
// `Modal` components, though — a Modal renders in its own separate native
// window, outside the tree this lives in — so any full-screen Modal needs
// its own copy of this dropped in as the last child of its content.
export default function AndroidNavBarFiller() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android' || insets.bottom === 0) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom, backgroundColor: '#000000', zIndex: 9999 }}
    />
  );
}
