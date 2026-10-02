import { lazy, Suspense, useState } from "react";
import { motion } from "motion/react";
import { X, LocateFixed, Check, Loader2 } from "lucide-react";
import { DARKHAN_CENTER, currentPosition, geoErrorText, type GeoError, type LatLng } from "../../lib/geo";

const MapView = lazy(() => import("../shared/MapView"));

interface LocationPickerProps {
  target: "from" | "to";
  initial?: LatLng | null;
  onPick: (pos: LatLng) => void;
  onClose: () => void;
}

/**
 * Газрын зураг дээр цэг заах. Төвийн тэмдэг тогтмол, хэрэглэгч газрын
 * зургийг чирж байрлуулна — жижиг дэлгэцэн дээр хуруугаар тэмдэг чирэхээс
 * хамаагүй нарийвчлалтай.
 */
export function LocationPicker({ target, initial, onPick, onClose }: LocationPickerProps) {
  const [center, setCenter] = useState<LatLng>(initial ?? DARKHAN_CENTER);
  const [jumpTo, setJumpTo] = useState<LatLng | undefined>(initial ?? undefined);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  async function useMyLocation() {
    setLocating(true);
    setError("");
    try {
      const p = await currentPosition();
      setJumpTo(p);
      setCenter(p);
    } catch (e) {
      setError(geoErrorText(e as GeoError));
    } finally {
      setLocating(false);
    }
  }

  const title = target === "from" ? "Авах цэгээ заана уу" : "Хүргэх цэгээ заана уу";

  return (
    <motion.div
      className="fixed inset-0 z-[70] bg-background flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2 }}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <button onClick={onClose} aria-label="Хаах" className="w-9 h-9 -ml-1.5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
          <X className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="font-bold leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">Газрын зургийг чирж тэмдгийг яг байрлал дээр тавина</p>
        </div>
      </header>

      <div className="relative flex-1">
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>}>
          <MapView className="absolute inset-0" center={jumpTo} pick={target} onCenterChange={setCenter} zoom={initial ? 17 : 14} />
        </Suspense>

        <button
          onClick={useMyLocation}
          disabled={locating}
          className="absolute top-3 right-3 z-[600] flex items-center gap-1.5 bg-card border border-border shadow-md rounded-full pl-3 pr-3.5 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-primary" />}
          Миний байршил
        </button>
      </div>

      <div className="border-t border-border bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          onClick={() => onPick(center)}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Check className="w-5 h-5" /> Энэ цэгийг сонгох
        </button>
      </div>
    </motion.div>
  );
}
