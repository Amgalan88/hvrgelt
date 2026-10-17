/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { DARKHAN_CENTER } from "../../lib/geo";
import { markerSvg, brandColor, routeLine, type MapViewProps, type MarkerKind } from "./MapView";
import { loadGoogleMaps, onGoogleFail } from "../../lib/googleMaps";

const svgUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

function markerIcon(kind: MarkerKind): google.maps.Icon {
  const m = markerSvg(kind);
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
  /** Ачаалж чадаагүй бол — MapView OpenStreetMap руу шилжинэ */
  onFail: () => void;
}

/** Google Maps дээрх газрын зураг. MapView-ээс VITE_GOOGLE_MAPS_API_KEY байвал сонгогдоно. */
export default function GoogleMapView({ markers = [], route, center, zoom = 15, pick, onCenterChange, fit = false, panelRight = 0, satellite = false, className = "", onFail }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const pins = useRef<google.maps.Marker[]>([]);
  const lines = useRef<google.maps.Polyline[]>([]);
  const onMove = useRef(onCenterChange);
  onMove.current = onCenterChange;
  const [ready, setReady] = useState(false);

  // Нэг удаа үүсгэнэ
  useEffect(() => {
    let alive = true;
    const offFail = onGoogleFail(onFail);
    loadGoogleMaps()
      .then((g) => {
        if (!alive || !el.current) return;
        const start = center ?? markers[0]?.pos ?? DARKHAN_CENTER;
        const dark = document.documentElement.classList.contains("dark");
        const m = new g.maps.Map(el.current, {
          center: start,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: panelRight ? { position: g.maps.ControlPosition.LEFT_BOTTOM } : undefined,
          clickableIcons: false,
          // Цэг сонгохдоо нэг хуруугаар чирнэ; жижиг урьдчилсан зураг хуудсыг гүйлгэхэд саад болохгүй
          gestureHandling: pick || panelRight ? "greedy" : "cooperative",
          styles: dark ? DARK_STYLE : undefined,
          mapTypeId: satellite ? "hybrid" : "roadmap",
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
      offFail();
      pins.current.forEach((p) => p.setMap(null));
      pins.current = [];
      lines.current.forEach((l) => l.setMap(null));
      lines.current = [];
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Хиймэл дагуул ↔ энгийн
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.setMapTypeId(satellite ? "hybrid" : "roadmap");
    m.setOptions({ styles: !satellite && document.documentElement.classList.contains("dark") ? DARK_STYLE : undefined });
  }, [satellite, ready]);

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
  const routeKey = route ? `${route.length}:${route[0]?.lat},${route[route.length - 1]?.lng}` : "";
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    lines.current.forEach((l) => l.setMap(null));
    lines.current = [];
    const line = routeLine(markers, route);
    if (line) {
      const color = brandColor();
      if (line.straight) {
        // Тасархай шугам — маршрут тодорхойгүй
        lines.current.push(new google.maps.Polyline({
          map: m, path: line.path, clickable: false, strokeOpacity: 0,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.8, strokeColor: color, scale: 3 }, offset: "0", repeat: "12px" }],
        }));
      } else {
        lines.current.push(new google.maps.Polyline({ map: m, path: line.path, clickable: false, strokeColor: "#ffffff", strokeOpacity: 0.9, strokeWeight: 8 }));
        lines.current.push(new google.maps.Polyline({ map: m, path: line.path, clickable: false, strokeColor: color, strokeOpacity: 1, strokeWeight: 5 }));
      }
    }
    pins.current.forEach((p) => p.setMap(null));
    pins.current = markers.map(
      (mk) => new google.maps.Marker({ map: m, position: mk.pos, icon: markerIcon(mk.kind), clickable: false, zIndex: mk.kind === "courier" ? 3 : 1 }),
    );
    if (fit && markers.length > 1) {
      const b = new google.maps.LatLngBounds();
      markers.forEach((mk) => b.extend(mk.pos));
      if (line && !line.straight) line.path.forEach((p) => b.extend(p));
      m.fitBounds(b, { top: 50, bottom: 50, left: 50, right: 50 + panelRight });
    } else if (fit && markers.length === 1) {
      m.setCenter(markers[0].pos);
      m.setZoom(16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, routeKey, fit, ready]);

  const position = className.split(" ").some((c) => c === "absolute" || c === "fixed") ? "" : "relative";
  const pickSvg = pick ? markerSvg(pick) : null;

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
