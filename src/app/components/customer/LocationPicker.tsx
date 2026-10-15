import { lazy, Suspense, useState } from "react";
import { motion } from "motion/react";
import { X, LocateFixed, Check, Loader2, Search } from "lucide-react";
import { searchMap, type PlaceResult } from "../../lib/places";
import { DARKHAN_CENTER, currentPosition, geoErrorText, type GeoError, type LatLng } from "../../lib/geo";

const MapView = lazy(() => import("../shared/MapView"));

interface LocationPickerProps {
  target: "from" | "to";
  initial?: LatLng | null;
  onPick: (pos: LatLng) => void;
  onClose: () => void;
  /** Гарчгийг өөрчлөх (жишээ нь супер админ газрын байршил заахад) */
  title?: string;
  /** Хайлтын талбарт урьдчилан бичих */
  initialQuery?: string;
  error?: string;
}

/**
 * Газрын зураг дээр цэг заах. Төвийн тэмдэг тогтмол, хэрэглэгч газрын
 * зургийг чирж байрлуулна — жижиг дэлгэцэн дээр хуруугаар тэмдэг чирэхээс
 * хамаагүй нарийвчлалтай.
 */
export function LocationPicker({ target, initial, onPick, onClose, title: titleOverride, initialQuery = "", error: externalError }: LocationPickerProps) {
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

  const title = titleOverride ?? (target === "from" ? "Авах цэгээ заана уу" : "Хүргэх цэгээ заана уу");

  // Газрын зургаас хайх — олдсон газар руу газрын зургийг шилжүүлнэ
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  async function runSearch() {
    if (q.trim().length < 3) return;
    setSearching(true);
    const ctrl = new AbortController();
    const r = await searchMap(q, ctrl.signal);
    setResults(r);
    setSearching(false);
  }
  async function jump(r: PlaceResult) {
    const pos = r.pos ?? (r.resolve ? await r.resolve() : null);
    setResults([]);
    if (pos) { setJumpTo(pos); setCenter(pos); }
  }

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

      <form
        onSubmit={(e) => { e.preventDefault(); void runSearch(); }}
        className="relative px-4 py-2.5 border-b border-border bg-background"
      >
        <div className="flex items-center gap-2 bg-secondary/70 rounded-xl px-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Газар хайх — жишээ: Магнолия супермаркет"
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-transparent py-2.5 text-sm focus:outline-none"
          />
          {searching ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
            <button type="submit" className="text-xs font-semibold text-primary px-1">Хайх</button>
          )}
        </div>
        {results.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 z-[700] bg-card border border-border rounded-xl shadow-lg overflow-hidden divide-y divide-border">
            {results.map((r) => (
              <button key={r.id} type="button" onClick={() => void jump(r)} className="w-full text-left px-3 py-2.5 active:bg-secondary/60">
                <span className="block text-sm font-semibold truncate">{r.name}</span>
                {r.subtitle && <span className="block text-xs text-muted-foreground truncate">{r.subtitle}</span>}
              </button>
            ))}
          </div>
        )}
      </form>

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
        {(error || externalError) && <p className="text-xs text-destructive">{error || externalError}</p>}
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
