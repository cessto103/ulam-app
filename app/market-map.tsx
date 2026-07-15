import client from '@/src/api/client';
import DirectionsButton from '@/src/components/DirectionsButton';
import { useLanguage } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

type NearbyPlace = {
  id: number;
  kind?: 'market' | 'tindahan';
  name: string;
  type: string;
  barangay: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  item_count: number;
  distance_km?: number;
  source?: 'ulam' | 'osm';
  is_verified?: boolean;
};

const RADIUS_OPTIONS = [3, 5, 10, 15] as const;

/** Leaflet + OpenStreetMap in a WebView — no API keys, works in Expo Go and APKs. */
function buildMapHtml(userLat: number, userLng: number, places: NearbyPlace[], radiusKm: number): string {
  const markers = places
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      kind: p.kind ?? 'market',
      name: p.name.replace(/[<>"]/g, ''),
      lat: p.latitude,
      lng: p.longitude,
      store: (p.kind ?? 'market') === 'tindahan',
    }));

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0}
.you{background:#1D6FE0;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 1px 6px rgba(0,0,0,.4)}
.pin{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35)}
.pin span{transform:rotate(45deg);font-size:14px}
</style></head><body><div id="map"></div><script>
var map = L.map('map', { zoomControl: true }).setView([${userLat}, ${userLng}], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
L.circle([${userLat}, ${userLng}], { radius: ${radiusKm * 1000}, color: '#386641', weight: 1.5, fillColor: '#386641', fillOpacity: 0.07 }).addTo(map);
L.marker([${userLat}, ${userLng}], { icon: L.divIcon({ className: '', html: '<div class="you"></div>', iconSize: [18,18], iconAnchor: [9,9] }) })
  .addTo(map).bindPopup('Ikaw / You');
var places = ${JSON.stringify(markers)};
places.forEach(function (p) {
  var color = p.store ? '#E7653B' : '#386641';
  var emoji = p.store ? '&#128722;' : '&#127978;';
  var icon = L.divIcon({ className: '', html: '<div class="pin" style="background:' + color + '"><span>' + emoji + '</span></div>', iconSize: [30,30], iconAnchor: [15,30] });
  L.marker([p.lat, p.lng], { icon: icon }).addTo(map).on('click', function () {
    window.ReactNativeWebView.postMessage(JSON.stringify({ id: p.id, kind: p.kind }));
  });
});
if (places.length > 0) {
  var group = L.featureGroup(places.map(function (p) { return L.marker([p.lat, p.lng]); }).concat([L.marker([${userLat}, ${userLng}])]));
  map.fitBounds(group.getBounds().pad(0.2));
}
</script></body></html>`;
}

export default function MarketMapScreen() {
  const { lat: latParam, lng: lngParam } = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const { lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latParam && lngParam ? { lat: Number(latParam), lng: Number(lngParam) } : null
  );
  const [locating, setLocating] = useState(!coords);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [selected, setSelected] = useState<NearbyPlace | null>(null);

  useEffect(() => {
    if (coords) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['map-markets', coords?.lat, coords?.lng, radiusKm],
    queryFn: async () =>
      (await client.get<{ markets: NearbyPlace[] }>(`/markets?lat=${coords!.lat}&lng=${coords!.lng}&radius_km=${radiusKm}`)).data.markets,
    enabled: !!coords,
    staleTime: 2 * 60_000,
  });

  const html = useMemo(
    () => (coords ? buildMapHtml(coords.lat, coords.lng, places, radiusKm) : ''),
    [coords, places, radiusKm]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3',
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-8 h-8 rounded-full bg-cream-200 items-center justify-center active:opacity-70">
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </Pressable>
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000', flex: 1 }}>
            {lang === 'en' ? 'Nearby Map' : 'Mapa ng Malapit'}
          </Text>
          {isLoading && <ActivityIndicator size="small" color="#386641" />}
        </View>
        {/* Radius chips */}
        <View className="flex-row items-center gap-2 mt-2.5">
          {RADIUS_OPTIONS.map((r) => {
            const active = radiusKm === r;
            return (
              <Pressable
                key={r}
                onPress={() => { setRadiusKm(r); setSelected(null); }}
                className={`rounded-full px-3 py-1.5 ${active ? 'bg-leaf-600' : 'bg-cream-100 border border-cream-300'}`}
              >
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: active ? '#fff' : '#6F655A' }}>{r} km</Text>
              </Pressable>
            );
          })}
          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A', marginLeft: 'auto' }}>
            {places.length} {lang === 'en' ? 'found' : 'nahanap'}
          </Text>
        </View>
      </View>

      {/* Map */}
      {!coords ? (
        <View className="flex-1 items-center justify-center px-8">
          {locating ? (
            <>
              <ActivityIndicator color="#386641" />
              <Text className="text-sm text-ink-soft mt-3">{lang === 'en' ? 'Getting your location…' : 'Kinukuha ang lokasyon…'}</Text>
            </>
          ) : (
            <Text className="text-sm text-ink-soft text-center">
              {lang === 'en'
                ? 'Location permission is needed to show the map. Enable it in your phone settings and try again.'
                : 'Kailangan ng location permission para sa mapa. I-enable ito sa settings ng iyong telepono.'}
            </Text>
          )}
        </View>
      ) : (
        <WebView
          source={{ html }}
          style={{ flex: 1 }}
          originWhitelist={['*']}
          onMessage={(e) => {
            try {
              const msg = JSON.parse(e.nativeEvent.data) as { id: number; kind: string };
              const place = places.find((p) => p.id === msg.id && (p.kind ?? 'market') === msg.kind);
              if (place) setSelected(place);
            } catch {
              // ignore malformed messages
            }
          }}
        />
      )}

      {/* Bottom detail card */}
      {selected && (
        <View
          style={{
            position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12,
            backgroundColor: '#fff', borderRadius: 20, padding: 16,
            shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
          }}
        >
          <View className="flex-row items-start gap-3">
            <Text style={{ fontSize: 28 }}>{(selected.kind ?? 'market') === 'tindahan' ? '🛒' : '🏪'}</Text>
            <View className="flex-1">
              <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#000000' }} numberOfLines={2}>{selected.name}</Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }} numberOfLines={1}>
                {[selected.barangay, selected.municipality].filter(Boolean).join(', ')}
                {selected.distance_km != null ? ` · ${selected.distance_km < 1 ? Math.round(selected.distance_km * 1000) + ' m' : selected.distance_km.toFixed(1) + ' km'}` : ''}
              </Text>
              {selected.source === 'osm' ? (
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 11, color: '#6F655A', marginTop: 2 }}>
                  🌐 {lang === 'en' ? 'From OpenStreetMap' : 'Mula sa OpenStreetMap'}
                </Text>
              ) : selected.is_verified ? (
                <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 11, color: '#386641', marginTop: 2 }}>
                  ✓ {lang === 'en' ? 'Verified on uLam' : 'Beripikado sa uLam'}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => setSelected(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color="#B0A18C" />
            </Pressable>
          </View>
          <View className="flex-row gap-2 mt-3">
            <Pressable
              onPress={() => router.push(((selected.kind ?? 'market') === 'tindahan' ? `/stall/${selected.id}` : `/market/${selected.id}`) as any)}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3 active:opacity-80"
              style={{ backgroundColor: '#E7653B' }}
            >
              <Ionicons name="storefront-outline" size={15} color="#fff" />
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#fff' }}>
                {lang === 'en' ? 'View prices' : 'Tingnan ang presyo'}
              </Text>
            </Pressable>
            {selected.latitude != null && selected.longitude != null && (
              <View style={{ flex: 1 }}>
                <DirectionsButton latitude={selected.latitude} longitude={selected.longitude} compact />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
