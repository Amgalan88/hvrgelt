/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { DARKHAN_CENTER } from "../../lib/geo";
import { MARKER_SVG, type MapViewProps, type MarkerKind } from "./MapView";

declare global {
  interface Window {
    /** Google түлхүүр буруу эсвэл billing идэвхгүй үед Google өөрөө дууддаг */
    gm_authFailure?: () => void;
    __hvGoogleMapsReady?: () => void;
  }
}

let loading: Promise<typeof google> | null = null;

/** Google Maps JavaScript API-г нэг л удаа ачаална */
function loadGoogleMaps(key: string): Promise<typeof google> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    window.__hvGoogleMapsReady = () => resolve(window.google);
    const s = document.createElement("script");
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&v=weekly&loading=async&language=mn&region=MN&callback=__hvGoogleMapsReady`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps ачаалагдсангүй"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

function markerIcon(kind: MarkerKind): google.maps.Icon {
  const m = MARKER_SVG[kind];
  return {
    url: svgUrl(m.svg),
    scaledSize: new google.maps.Size(m.size[0], m.size[1]),
    anchor: new google.maps.Point(m.anchor[0], m.anchor[1]),
  };
}

/** Харанхуй горимд газрын зургийг бараан болгоно (Map ID шаардахгүй хэв маяг) */
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2129" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa0ad" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#14171f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c3240" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4150" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1a2b" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

interface Props extends MapViewProps {
  apiKey: string;
  /** Ачаалж чадаагүй бол — MapView OpenStreetMap руу шилжинэ */
  onFail: () => void;
}

/** Google Maps дээрх газрын зураг. MapView-ээс VITE_GOOGLE_MAPS_API_KEY байвал сонгогдоно. */
export default function GoogleMapView({ markers = [], center, zoom = 15, pick, onCenterChange, fit = false, className = "", apiKey, onFail }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const pins = useRef<google.maps.Marker[]>([]);
  const onMove = useRef(onCenterChange);
  onMove.current = onCenterChange;
  const [ready, setReady] = useState(false);

  // Нэг удаа үүсгэнэ
  useEffect(() => {
    let alive = true;
    window.gm_authFailure = onFail;
    loadGoogleMaps(apiKey)
      .then((g) => {
        if (!alive || !el.current) return;
        const start = center ?? markers[0]?.pos ?? DARKHAN_CENTER;
        const dark = document.documentElement.classList.contains("dark");
        const m = new g.maps.Map(el.current, {
          center: start,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          // Цэг сонгохдоо нэг хуруугаар чирнэ; жижиг урьдчилсан зураг хуудсыг гүйлгэхэд саад болохгүй
          gestureHandling: pick ? "greedy" : "cooperative",
          styles: dark ? DARK_STYLE : undefined,
        });
        m.addListener("idle", () => {
          const c = m.getCenter();
          if (c) onMove.current?.({ lat: c.lat(), lng: c.lng() });
        });
        map.current = m;
        setReady(true);
      })
      .catch(() => alive && onFail());
    return () => {
      alive = false;
      pins.current.forEach((p) => p.setMap(null));
      pins.current = [];
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Гаднаас төв өөрчлөгдвөл (жишээ нь "Миний байршил") шилжинэ
  const centerKey = center ? `${center.lat.toFixed(6)},${center.lng.toFixed(6)}` : "";
  useEffect(() => {
    const m = map.current;
    if (!m || !center) return;
    m.panTo(center);
    m.setZoom(Math.max(m.getZoom() ?? zoom, 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerKey, ready]);

  // Тэмдгүүд
  const markerKey = markers.map((mk) => `${mk.kind}:${mk.pos.lat.toFixed(5)},${mk.pos.lng.toFixed(5)}`).join("|");
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    pins.current.forEach((p) => p.setMap(null));
    pins.current = markers.map(
      (mk) => new google.maps.Marker({ map: m, position: mk.pos, icon: markerIcon(mk.kind), clickable: false, zIndex: mk.kind === "courier" ? 3 : 1 }),
    );
    if (fit && markers.length > 1) {
      const b = new google.maps.LatLngBounds();
      markers.forEach((mk) => b.extend(mk.pos));
      m.fitBounds(b, 40);
    } else if (fit && markers.length === 1) {
      m.setCenter(markers[0].pos);
      m.setZoom(16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, fit, ready]);

  const position = className.split(" ").some((c) => c === "absolute" || c === "fixed") ? "" : "relative";
  const pickSvg = pick ? MARKER_SVG[pick] : null;

  return (
    <div className={`${position} overflow-hidden ${className}`}>
      <div ref={el} className="absolute inset-0 bg-secondary" />
      {pickSvg && (
        // Төвийн тогтмол тэмдэг — газрын зургийг доор нь чирнэ
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
          <div
            style={{
              transform: `translate(${pickSvg.size[0] / 2 - pickSvg.anchor[0]}px, ${pickSvg.size[1] / 2 - pickSvg.anchor[1]}px)`,
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))",
            }}
            dangerouslySetInnerHTML={{ __html: pickSvg.svg }}
          />
        </div>
      )}
    </div>
  );
}
