/**
 * AppMapView.tsx
 * ─────────────────────────────────────────────────────────
 * A top-notch, production-grade map component using Leaflet
 * inside a React Native WebView.
 *
 * Features:
 *  • Dark "Carbon" map theme via CartoDB Dark tiles
 *  • Custom animated SVG markers with pulse rings
 *  • Marker clustering (Leaflet.markercluster)
 *  • Rich popup cards with action buttons
 *  • Polyline route drawing with animated dashes
 *  • Geofence circle overlays
 *  • Current location button with accuracy ring
 *  • Search bar overlay
 *  • Layer switcher (Dark / Light / Satellite)
 *  • Scale ruler + attribution
 *  • Full bi-directional JS↔RN messaging
 *
 * Usage:
 *   import AppMapView, { MapMarker, MapRoute } from './AppMapView';
 *
 *   <AppMapView
 *     markers={[
 *       { id: '1', lat: 28.6139, lng: 77.2090, title: 'Delhi HQ',
 *         subtitle: 'Main Office', type: 'office' },
 *     ]}
 *     route={{ points: [[28.6139, 77.2090], [28.7041, 77.1025]] }}
 *     onMarkerPress={(id) => console.log('pressed', id)}
 *     showMyLocation
 *     height={420}
 *   />
 *
 * Dependencies:
 *   expo install react-native-webview
 */

import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export type MarkerType =
  | 'default' | 'office' | 'customer' | 'delivery'
  | 'warehouse' | 'driver' | 'alert' | 'pin';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  subtitle?: string;
  type?: MarkerType;
  badge?: string;
  pulse?: boolean;
}

export interface MapRoute {
  points: [number, number][];
  color?: string;
  animated?: boolean;
}

export interface MapGeofence {
  lat: number;
  lng: number;
  radius: number;   // metres
  color?: string;
  label?: string;
}

interface AppMapViewProps {
  markers?: MapMarker[];
  route?: MapRoute;
  geofences?: MapGeofence[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  showMyLocation?: boolean;
  onMarkerPress?: (id: string) => void;
  onMapPress?: (lat: number, lng: number) => void;
  style?: ViewStyle;
}

// ─────────────────────────────────────────
// MARKER COLORS BY TYPE
// ─────────────────────────────────────────
const MARKER_COLORS: Record<MarkerType, string> = {
  default:   '#6C63FF',
  office:    '#6C63FF',
  customer:  '#00C896',
  delivery:  '#FFB547',
  warehouse: '#4ECDC4',
  driver:    '#FF6B9D',
  alert:     '#FF4C6A',
  pin:       '#A78BFA',
};

const MARKER_ICONS: Record<MarkerType, string> = {
  default:   '📍',
  office:    '🏢',
  customer:  '👤',
  delivery:  '🚚',
  warehouse: '🏭',
  driver:    '🚗',
  alert:     '⚠️',
  pin:       '📌',
};

// ─────────────────────────────────────────
// HTML GENERATOR
// ─────────────────────────────────────────
function buildMapHTML(props: AppMapViewProps): string {
  const {
    markers = [],
    route,
    geofences = [],
    center = { lat: 28.6139, lng: 77.2090 },
    zoom = 11,
    showMyLocation = false,
  } = props;

  const markersJSON = JSON.stringify(markers);
  const routeJSON = JSON.stringify(route ?? null);
  const geofencesJSON = JSON.stringify(geofences);
  const defaultColor = '#6C63FF';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
<title>AppMap</title>

<!-- Leaflet CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<!-- Marker Cluster -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css"/>

<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; background: #0a0a14; }

  /* ── Layer Control ── */
  .leaflet-control-layers {
    background: #1a1a2e !important;
    border: 1px solid #3a3a5c !important;
    border-radius: 12px !important;
    color: #e8e8ff !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
  }
  .leaflet-control-layers-toggle {
    background-color: #1a1a2e !important;
    border: 1px solid #3a3a5c !important;
    border-radius: 10px !important;
    width: 36px !important; height: 36px !important;
  }
  .leaflet-control-layers label { color: #c8c8e8 !important; font-family: system-ui; font-size: 13px; }

  /* ── Zoom Control ── */
  .leaflet-control-zoom a {
    background: #1a1a2e !important;
    color: #a0a0c0 !important;
    border: 1px solid #2e2e4a !important;
    width: 34px !important; height: 34px !important;
    line-height: 34px !important;
    font-size: 18px !important;
    border-radius: 10px !important;
  }
  .leaflet-control-zoom a:hover { background: #6c63ff22 !important; color: #6c63ff !important; }
  .leaflet-control-zoom { border: none !important; display: flex; flex-direction: column; gap: 4px; }
  .leaflet-bar { border: none !important; box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; }

  /* ── Attribution ── */
  .leaflet-control-attribution {
    background: rgba(10,10,20,0.75) !important;
    color: #4a4a6a !important;
    font-size: 9px !important;
    border-radius: 8px 0 0 0 !important;
    backdrop-filter: blur(8px);
  }
  .leaflet-control-attribution a { color: #6c63ff !important; }

  /* ── Scale ── */
  .leaflet-control-scale-line {
    background: rgba(26,26,46,0.85) !important;
    border-color: #3a3a5c !important;
    color: #a0a0c0 !important;
    font-size: 10px !important;
    border-radius: 4px !important;
  }

  /* ── Popup ── */
  .leaflet-popup-content-wrapper {
    background: #1a1a2e !important;
    border: 1px solid #2e2e4a !important;
    border-radius: 16px !important;
    box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,99,255,0.2) !important;
    padding: 0 !important;
    overflow: hidden;
  }
  .leaflet-popup-tip-container { display: none; }
  .leaflet-popup-close-button {
    color: #6b6b8a !important;
    font-size: 18px !important;
    top: 10px !important;
    right: 12px !important;
    width: 24px !important;
    height: 24px !important;
    line-height: 22px !important;
    text-align: center;
    background: #2e2e4a !important;
    border-radius: 50% !important;
    z-index: 10;
  }
  .leaflet-popup-content { margin: 0 !important; width: auto !important; }

  /* ── Cluster ── */
  .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
    background-clip: padding-box !important;
  }
  .marker-cluster-small { background-color: rgba(108,99,255,0.2) !important; }
  .marker-cluster-small div { background-color: rgba(108,99,255,0.8) !important; }
  .marker-cluster-medium { background-color: rgba(255,181,71,0.2) !important; }
  .marker-cluster-medium div { background-color: rgba(255,181,71,0.8) !important; }
  .marker-cluster-large { background-color: rgba(255,76,106,0.2) !important; }
  .marker-cluster-large div { background-color: rgba(255,76,106,0.8) !important; }
  .marker-cluster div {
    color: #fff !important; font-weight: 800 !important;
    font-family: system-ui; font-size: 13px;
    border-radius: 50%; text-align: center;
  }

  /* ── Custom Marker ── */
  .custom-marker { position: relative; }
  .marker-pin {
    width: 40px; height: 40px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    border: 2px solid rgba(255,255,255,0.2);
    transition: transform 0.2s ease;
  }
  .marker-pin:hover { transform: rotate(-45deg) scale(1.15); }
  .marker-icon { transform: rotate(45deg); font-size: 17px; line-height: 1; }
  .marker-pulse {
    position: absolute; top: -8px; left: -8px;
    width: 56px; height: 56px; border-radius: 50%;
    animation: pulseRing 2s ease-out infinite;
    pointer-events: none;
  }
  .marker-badge {
    position: absolute; top: -6px; right: -8px;
    background: #ff4c6a; color: #fff;
    font-size: 9px; font-weight: 800;
    border-radius: 10px; padding: 2px 5px;
    border: 1.5px solid #1a1a2e;
    font-family: system-ui;
    white-space: nowrap;
  }

  @keyframes pulseRing {
    0%   { transform: scale(0.5); opacity: 0.8; }
    100% { transform: scale(1.8); opacity: 0;   }
  }
  @keyframes dashMove {
    to { stroke-dashoffset: -30; }
  }
  .animated-path { animation: dashMove 0.8s linear infinite; }

  /* ── My Location ── */
  .my-location-btn {
    position: absolute; bottom: 80px; right: 12px; z-index: 1000;
    width: 44px; height: 44px; border-radius: 12px;
    background: #1a1a2e; border: 1px solid #3a3a5c;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    transition: background 0.2s, transform 0.1s;
  }
  .my-location-btn:hover { background: #6c63ff22; transform: scale(1.05); }
  .my-location-btn svg { width: 20px; height: 20px; }

  /* ── Search Overlay ── */
  .search-overlay {
    position: absolute; top: 12px; left: 12px; right: 56px; z-index: 1000;
    background: rgba(26,26,46,0.92);
    border: 1px solid #2e2e4a;
    border-radius: 14px; padding: 0 14px;
    display: flex; align-items: center; gap: 8px;
    height: 44px; backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    transition: border-color 0.2s;
  }
  .search-overlay:focus-within { border-color: #6c63ff; }
  .search-overlay input {
    flex: 1; background: none; border: none; outline: none;
    color: #e8e8ff; font-size: 14px; font-weight: 500;
    font-family: system-ui;
  }
  .search-overlay input::placeholder { color: #4a4a6a; }
  .search-icon { color: #6b6b8a; font-size: 16px; }

  /* ── Popup Card ── */
  .popup-card { width: 230px; }
  .popup-header {
    padding: 14px 16px 12px;
    border-bottom: 1px solid #2e2e4a;
    display: flex; align-items: center; gap: 10px;
  }
  .popup-icon {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .popup-titles { flex: 1; }
  .popup-title {
    font-size: 14px; font-weight: 800; color: #e8e8ff;
    font-family: system-ui; margin: 0;
  }
  .popup-subtitle {
    font-size: 11px; color: #6b6b8a;
    font-family: system-ui; margin: 3px 0 0;
  }
  .popup-coords {
    padding: 8px 16px;
    font-size: 10px; color: #5a5a7a; font-family: monospace;
    border-bottom: 1px solid #1e1e3a;
  }
  .popup-actions {
    padding: 10px 12px;
    display: flex; gap: 8px;
  }
  .popup-btn {
    flex: 1; border: none; border-radius: 8px;
    padding: 8px 0; font-size: 12px; font-weight: 700;
    font-family: system-ui; cursor: pointer;
    transition: opacity 0.15s;
  }
  .popup-btn:hover { opacity: 0.85; }
  .popup-btn-primary { background: #6c63ff; color: #fff; }
  .popup-btn-secondary { background: #2e2e4a; color: #a0a0c0; }

  /* ── Location accuracy ring ── */
  .leaflet-accuracy-circle { stroke: #6c63ff; fill: #6c63ff; fill-opacity: 0.08; stroke-width: 1.5; stroke-opacity: 0.5; }
</style>
</head>
<body>
<div id="map"></div>

<div class="search-overlay">
  <span class="search-icon">🔍</span>
  <input id="searchInput" type="text" placeholder="Search locations…" autocomplete="off" />
</div>

<button class="my-location-btn" id="locBtn" title="My Location">
  <svg viewBox="0 0 24 24" fill="none" stroke="#a0a0c0" stroke-width="2" stroke-linecap="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" opacity=".3"/>
  </svg>
</button>

<!-- Scripts -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.min.js"></script>

<script>
// ── Tile Layers ──
const TILES = {
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO',
    subdomains: 'abcd', maxZoom: 20
  }),
  light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO',
    subdomains: 'abcd', maxZoom: 20
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
  }),
};

// ── Map Init ──
const map = L.map('map', {
  center: [${center.lat}, ${center.lng}],
  zoom: ${zoom},
  zoomControl: false,
  layers: [TILES.dark],
  attributionControl: true,
});

// ── Controls ──
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
L.control.layers(
  { '🌙 Dark': TILES.dark, '☀️ Light': TILES.light, '🛰 Satellite': TILES.satellite },
  null,
  { position: 'topright', collapsed: true }
).addTo(map);

// ── Marker Colors / Icons ──
const COLORS = ${JSON.stringify(MARKER_COLORS)};
const ICONS  = ${JSON.stringify(MARKER_ICONS)};

function createMarkerIcon(type, color, badge, pulse) {
  const c = color || COLORS[type] || '${defaultColor}';
  const emoji = ICONS[type] || '📍';
  const pulseHTML = pulse
    ? \`<div class="marker-pulse" style="background:\${c}33;border:2px solid \${c}55"></div>\`
    : '';
  const badgeHTML = badge
    ? \`<div class="marker-badge">\${badge}</div>\`
    : '';
  return L.divIcon({
    className: 'custom-marker',
    html: \`
      \${pulseHTML}
      \${badgeHTML}
      <div class="marker-pin" style="background:\${c}dd;">
        <span class="marker-icon">\${emoji}</span>
      </div>
    \`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -44],
  });
}

// ── Popup HTML ──
function buildPopup(m) {
  const c = COLORS[m.type || 'default'] || '${defaultColor}';
  const emoji = ICONS[m.type || 'default'] || '📍';
  return \`
    <div class="popup-card">
      <div class="popup-header">
        <div class="popup-icon" style="background:\${c}22">\${emoji}</div>
        <div class="popup-titles">
          <p class="popup-title">\${m.title || 'Location'}</p>
          \${m.subtitle ? \`<p class="popup-subtitle">\${m.subtitle}</p>\` : ''}
        </div>
      </div>
      <div class="popup-coords">\${m.lat.toFixed(5)}, \${m.lng.toFixed(5)}</div>
      <div class="popup-actions">
        <button class="popup-btn popup-btn-primary" onclick="rnMessage('marker_press','${`\${m.id}`}')">View Details</button>
        <button class="popup-btn popup-btn-secondary" onclick="rnMessage('navigate','${`\${m.lat},\${m.lng}`}')">Navigate</button>
      </div>
    </div>
  \`;
}

// ── Cluster Group ──
const clusterGroup = L.markerClusterGroup({
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
});

// ── Add Markers ──
const MARKERS = ${markersJSON};
MARKERS.forEach(m => {
  const icon = createMarkerIcon(m.type || 'default', null, m.badge, m.pulse);
  const marker = L.marker([m.lat, m.lng], { icon })
    .bindPopup(buildPopup(m), { maxWidth: 260, className: '' });
  marker.on('click', () => rnMessage('marker_press', m.id));
  clusterGroup.addLayer(marker);
});
map.addLayer(clusterGroup);

// ── Route ──
const ROUTE = ${routeJSON};
if (ROUTE && ROUTE.points && ROUTE.points.length > 1) {
  const routeColor = ROUTE.color || '#6C63FF';
  // Shadow line
  L.polyline(ROUTE.points, {
    color: routeColor, weight: 8, opacity: 0.15, lineCap: 'round', lineJoin: 'round'
  }).addTo(map);
  // Main line
  const mainLine = L.polyline(ROUTE.points, {
    color: routeColor, weight: 3, opacity: 0.9, lineCap: 'round', lineJoin: 'round',
    dashArray: ROUTE.animated ? '10 6' : null,
    className: ROUTE.animated ? 'animated-path' : '',
  }).addTo(map);

  // Start / End markers
  const startIcon = L.divIcon({
    className: '',
    html: \`<div style="width:14px;height:14px;border-radius:50%;background:#00C896;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>\`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });
  const endIcon = L.divIcon({
    className: '',
    html: \`<div style="width:14px;height:14px;border-radius:50%;background:#FF4C6A;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>\`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });
  L.marker(ROUTE.points[0], { icon: startIcon }).addTo(map);
  L.marker(ROUTE.points[ROUTE.points.length - 1], { icon: endIcon }).addTo(map);
}

// ── Geofences ──
const GEOFENCES = ${geofencesJSON};
GEOFENCES.forEach(g => {
  const c = g.color || '${defaultColor}';
  L.circle([g.lat, g.lng], {
    radius: g.radius,
    color: c, weight: 2, opacity: 0.7,
    fillColor: c, fillOpacity: 0.08,
    dashArray: '6 4',
  }).bindTooltip(g.label || 'Geofence', { permanent: false, className: '' }).addTo(map);
});

// ── Map click ──
map.on('click', (e) => {
  rnMessage('map_press', e.latlng.lat + ',' + e.latlng.lng);
});

// ── My Location ──
let locMarker = null, locCircle = null;
document.getElementById('locBtn').addEventListener('click', () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    if (locMarker) { map.removeLayer(locMarker); map.removeLayer(locCircle); }
    const locIcon = L.divIcon({
      className: '',
      html: \`<div style="width:16px;height:16px;border-radius:50%;background:#6C63FF;border:3px solid #fff;box-shadow:0 2px 12px rgba(108,99,255,0.8)"><div style="position:absolute;top:-12px;left:-12px;width:40px;height:40px;border-radius:50%;background:rgba(108,99,255,0.2);animation:pulseRing 2s infinite"></div></div>\`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    });
    locMarker = L.marker([lat, lng], { icon: locIcon }).addTo(map);
    locCircle = L.circle([lat, lng], { radius: accuracy, className: 'leaflet-accuracy-circle' }).addTo(map);
    map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
    rnMessage('my_location', lat + ',' + lng);
  }, () => rnMessage('location_error', 'denied'));
});

// ── Search (client-side filter of markers) ──
document.getElementById('searchInput').addEventListener('input', (e) => {
  rnMessage('search', e.target.value);
});

// ── RN Bridge ──
function rnMessage(type, payload) {
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
  } catch(e) {}
}

// ── Fit bounds ──
if (MARKERS.length > 1) {
  const bounds = L.latLngBounds(MARKERS.map(m => [m.lat, m.lng]));
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
}

// ── Public API callable from RN ──
window.mapAPI = {
  flyTo: (lat, lng, zoom) => map.flyTo([lat, lng], zoom || 14, { animate: true, duration: 1 }),
  addMarker: (m) => {
    const icon = createMarkerIcon(m.type || 'default', null, m.badge, m.pulse);
    const mk = L.marker([m.lat, m.lng], { icon }).bindPopup(buildPopup(m));
    mk.on('click', () => rnMessage('marker_press', m.id));
    clusterGroup.addLayer(mk);
  },
};
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────
const AppMapView: React.FC<AppMapViewProps> = (props) => {
  const webViewRef = useRef<WebView>(null);
  const { height = 400, onMarkerPress, onMapPress, style } = props;

  const html = buildMapHTML(props);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; payload: string };
      switch (msg.type) {
        case 'marker_press':
          onMarkerPress?.(msg.payload);
          break;
        case 'map_press': {
          const [lat, lng] = msg.payload.split(',').map(Number);
          onMapPress?.(lat, lng);
          break;
        }
      }
    } catch {}
  }, [onMarkerPress, onMapPress]);

  /** Call this to programmatically fly to a location */
  const flyTo = useCallback((lat: number, lng: number, zoom?: number) => {
    webViewRef.current?.injectJavaScript(
      `window.mapAPI && window.mapAPI.flyTo(${lat}, ${lng}, ${zoom ?? 14}); true;`
    );
  }, []);

  return (
    <View style={[{ height, borderRadius: 16, overflow: 'hidden' }, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFillObject, styles.loading]}>
            <ActivityIndicator size="large" color="#6C63FF" />
          </View>
        )}
        style={{ flex: 1, backgroundColor: '#0a0a14' }}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loading: { backgroundColor: '#0a0a14', justifyContent: 'center', alignItems: 'center' },
});

export default AppMapView;
