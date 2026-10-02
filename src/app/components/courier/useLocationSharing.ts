import { useEffect, useRef, useState } from "react";
import { saveCourierLocation, type LatLng } from "../../lib/geo";

export type SharingState = "off" | "starting" | "on" | "denied" | "unsupported" | "error";

/** Хадгалах давтамж — үйлчлүүлэгчийн газрын зурагт хангалттай, DB-г ачаалахгүй */
const SAVE_EVERY_MS = 20_000;

/**
 * Хүргэгчид идэвхтэй захиалга байх үед утасны GPS-ийг courier_locations
 * руу 20 секунд тутам илгээнэ. Хөдлөөгүй үед ч сүүлийн байршлаа дахин
 * илгээж "хэдэн минутын өмнө" мэдээллийг шинэ байлгана.
 *
 * ⚠️ Вэб апп арын дэвсгэрт эсвэл утас түгжигдсэн үед хөтөч GPS-ийг
 * зогсоодог — апп нээлттэй байх хугацаанд л ажиллана.
 */
export function useLocationSharing(courierId: string, enabled: boolean) {
  const [state, setState] = useState<SharingState>("off");
  const [retry, setRetry] = useState(0);
  const last = useRef<{ pos: LatLng; accuracy: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState("off");
      return;
    }
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    setState("starting");
    let lastSaved = 0;
    let alive = true;

    async function save() {
      if (!last.current) return;
      lastSaved = Date.now();
      const ok = await saveCourierLocation(courierId, last.current.pos, last.current.accuracy);
      if (alive) setState(ok ? "on" : "error");
    }

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        last.current = { pos: { lat: p.coords.latitude, lng: p.coords.longitude }, accuracy: p.coords.accuracy };
        if (Date.now() - lastSaved >= SAVE_EVERY_MS) void save();
      },
      (e) => {
        if (alive) setState(e.code === e.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    // Хөдлөөгүй ч гэсэн тогтмол шинэчилнэ
    const timer = setInterval(() => {
      if (Date.now() - lastSaved >= SAVE_EVERY_MS) void save();
    }, SAVE_EVERY_MS);

    return () => {
      alive = false;
      navigator.geolocation.clearWatch(watchId);
      clearInterval(timer);
    };
  }, [courierId, enabled, retry]);

  return { state, retry: () => setRetry((n) => n + 1) };
}
