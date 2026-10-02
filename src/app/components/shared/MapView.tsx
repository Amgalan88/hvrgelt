import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DARKHAN_CENTER, type LatLng } from "../../lib/geo";

export type MarkerKind = "from" | "to" | "courier";

export interface MapMarker {
  pos: LatLng;
  kind: MarkerKind;
}

interface MapViewProps {
  markers?: MapMarker[];
  /** Анхны (эсвэл "Миний байршил"-аар шилжих) төв */
  center?: LatLng;
  zoom?: number;
  /** Цэг сонгох горим — төвд тогтмол тэмдэг, газрын зургийг чирж байрлуулна */
  pick?: MarkerKind;
  onCenterChange?: (c: LatLng) => void;
  /** Бүх тэмдэг харагдахаар томруулна */
  fit?: boolean;
  className?: string;
}

/** Апп доторх маршрутын дүрстэй ижил: ногоон цэг → улбар шар тэмдэг, хүргэгч */
function iconHtml(kind: MarkerKind): string {
  if (kind === "from") {
    return `<span style="display:block;width:18px;height:18px;border-radius:50%;background:#12a150;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`;
  }
  if (kind === "to") {
    return `<svg width="30" height="38" viewBox="0 0 30 38" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M15 1C7.3 1 1.5 6.8 1.5 14.2 1.5 24 15 37 15 37s13.5-13 13.5-22.8C28.5 6.8 22.7 1 15 1z" fill="#e8531c" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>`;
  }
  return `<span class="hv-courier"><span>🛵</span></span>`;
}

const ICON_SIZE: Record<MarkerKind, [number, number]> = { from: [18, 18], to: [30, 38], courier: [40, 40] };
const ICON_ANCHOR: Record<MarkerKind, [number, number]> = { from: [9, 9], to: [15, 37], courier: [20, 20] };

function makeIcon(kind: MarkerKind) {
  return L.divIcon({ html: iconHtml(kind), className: "hv-marker", iconSize: ICON_SIZE[kind], iconAnchor: ICON_ANCHOR[kind] });
}

/**
 * OpenStreetMap дээрх газрын зураг. Үнэгүй, түлхүүргүй.
 * Хожим Google Maps руу шилжвэл зөвхөн энэ файлыг солино.
 */
export default function MapView({ markers = [], center, zoom = 15, pick, onCenterChange, fit = false, className = "" }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const onMove = useRef(onCenterChange);
  onMove.current = onCenterChange;

  // Нэг удаа үүсгэнэ
  useEffect(() => {
    if (!el.current || map.current) return;
    const start = center ?? markers[0]?.pos ?? DARKHAN_CENTER;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([start.lat, start.lng], zoom);
    m.attributionControl.setPrefix(false);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("moveend", () => {
      const c = m.getCenter();
      onMove.current?.({ lat: c.lat, lng: c.lng });
    });
    map.current = m;
    // Modal дотор нээгдэхэд хэмжээгээ зөв тооцох
    setTimeout(() => m.invalidateSize(), 50);
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Гаднаас төв өөрчлөгдвөл (жишээ нь "Миний байршил") шилжинэ
  const centerKey = center ? `${center.lat.toFixed(6)},${center.lng.toFixed(6)}` : "";
  useEffect(() => {
    if (map.current && center) map.current.setView([center.lat, center.lng], Math.max(map.current.getZoom(), 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerKey]);

  // Тэмдгүүд
  const markerKey = markers.map((mk) => `${mk.kind}:${mk.pos.lat.toFixed(5)},${mk.pos.lng.toFixed(5)}`).join("|");
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    markers.forEach((mk) => L.marker([mk.pos.lat, mk.pos.lng], { icon: makeIcon(mk.kind), keyboard: false }).addTo(g));
    if (fit && markers.length > 1) {
      m.fitBounds(L.latLngBounds(markers.map((mk) => [mk.pos.lat, mk.pos.lng] as [number, number])), { padding: [40, 40], maxZoom: 16 });
    } else if (fit && markers.length === 1) {
      m.setView([markers[0].pos.lat, markers[0].pos.lng], 16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, fit]);

  // Гаднаас absolute/fixed өгөөгүй бол relative — хоёулаа зэрэг байвал өндөр нь 0 болдог
  const position = className.split(" ").some((c) => c === "absolute" || c === "fixed") ? "" : "relative";

  return (
    <div className={`${position} overflow-hidden ${className}`}>
      <div ref={el} className="absolute inset-0 hv-map" />
      {pick && (
        // Төвийн тогтмол тэмдэг — газрын зургийг доор нь чирнэ
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-[500]">
          <div style={{ transform: pick === "to" ? "translateY(-18px)" : undefined }} dangerouslySetInnerHTML={{ __html: iconHtml(pick) }} />
        </div>
      )}
    </div>
  );
}
