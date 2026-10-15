/// <reference types="google.maps" />
// Google Maps JavaScript API — газрын зураг ба газар хайлтад дундаа ашиглана.
// VITE_GOOGLE_MAPS_API_KEY тохируулаагүй бол ачаалагдахгүй (OpenStreetMap ажиллана).

declare global {
  interface Window {
    /** Google түлхүүр буруу эсвэл billing идэвхгүй үед Google өөрөө дууддаг */
    gm_authFailure?: () => void;
    __hvGoogleMapsReady?: () => void;
  }
}

export const GOOGLE_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || "";

/** Түлхүүр буруу гэж Google мэдэгдсэн бол дахин оролдохгүй */
let failed = false;
const failListeners = new Set<() => void>();
export function googleFailed() {
  return failed;
}
export function onGoogleFail(cb: () => void) {
  failListeners.add(cb);
  return () => failListeners.delete(cb);
}

let loading: Promise<typeof google> | null = null;

/** Google Maps JavaScript API-г нэг л удаа ачаална */
export function loadGoogleMaps(): Promise<typeof google> {
  if (!GOOGLE_KEY || failed) return Promise.reject(new Error("Google Maps тохируулаагүй"));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (loading) return loading;
  window.gm_authFailure = () => {
    failed = true;
    failListeners.forEach((l) => l());
  };
  loading = new Promise((resolve, reject) => {
    window.__hvGoogleMapsReady = () => resolve(window.google);
    const s = document.createElement("script");
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}` +
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
