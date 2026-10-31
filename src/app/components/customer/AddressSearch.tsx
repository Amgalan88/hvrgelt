import { useEffect, useRef, useState } from "react";
import { Search, X, MapPin, Store, Bookmark, History, LocateFixed, Map as MapIcon, Loader2, Check } from "lucide-react";
import { searchLocal, searchMap, type PlaceResult, type PlaceSource } from "../../lib/places";
import type { LatLng } from "../../lib/geo";

interface AddressValue {
  addr: string;
  detail: string;
  pos: LatLng | null;
}

interface AddressSearchProps {
  target: "from" | "to";
  value: AddressValue;
  onChange: (next: Partial<AddressValue>) => void;
  /** Апп-ын газрууд, хадгалсан хаяг, өмнөх захиалгууд */
  candidates: PlaceResult[];
  onOpenMap: () => void;
  onMyLocation: () => void;
  locating: boolean;
  geoErr?: string;
  /** Байршилтай бол үнэ шууд гарна гэдгийг сануулах эсэх */
  autoPriceHint?: boolean;
  /** Жагсаалтаас байршилтай газар сонгомогц — дараагийн алхам руу шилжинэ */
  onPicked?: () => void;
}

const SOURCE_ICON: Record<PlaceSource, typeof Store> = { partner: Store, saved: Bookmark, recent: History, map: MapPin };
const SOURCE_LABEL: Record<PlaceSource, string> = { partner: "Газрууд", saved: "Хадгалсан", recent: "Өмнө нь", map: "Газрын зургаас" };

/**
 * Хаяг хайх — "Дархан бүсийн карго" гэж бичихэд байршилтайгаа гарна.
 * Сонгосон газрын байршлаар зай, үнэ шууд бодогдоно.
 */
export function AddressSearch({ target, value, onChange, candidates, onOpenMap, onMyLocation, locating, geoErr, autoPriceHint, onPicked }: AddressSearchProps) {
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const detailRef = useRef<HTMLInputElement>(null);
  const query = value.addr;

  // Газрын зургаас хайх — бичиж дуусахыг хүлээнэ (350ms), өмнөх хүсэлтийг цуцална
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 3 || value.pos) {
      setRemote([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(() => {
      searchMap(q, ctrl.signal)
        .then((r) => !ctrl.signal.aborted && setRemote(r))
        .finally(() => !ctrl.signal.aborted && setSearching(false));
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, open, value.pos]);

  const local = query.trim()
    ? searchLocal(query, candidates)
    : candidates.filter((c) => c.source !== "partner").slice(0, 5);
  // Апп-ын газрын нэртэй давхардсан газрын зургийн үр дүнг хасна
  const localNames = new Set(local.map((l) => l.name.toLowerCase()));
  // Газрын зургийн эх сурвалж нэг газрыг олон дахин буцаадаг — нэр, дэд гарчгаар давхардлыг хасна
  const seenRemote = new Set<string>();
  const mapResults = remote.filter((r) => {
    const key = `${r.name}|${r.subtitle ?? ""}`.toLowerCase();
    if (localNames.has(r.name.toLowerCase()) || seenRemote.has(key)) return false;
    seenRemote.add(key);
    return true;
  });

  async function pick(r: PlaceResult) {
    let pos = r.pos ?? null;
    if (!pos && r.resolve) {
      setResolving(r.id);
      pos = await r.resolve().catch(() => null);
      setResolving(null);
    }
    onChange({ addr: r.name, pos });
    setOpen(false);
    // Байршилтай бол шууд дараагийн алхам; байр, тоотыг сүүлийн алхамд бичнэ.
    // Гарын товчлуур өөрөө нээгдэхгүй — хэрэгтэй үед л талбарт дарна.
    if (pos) {
      (document.activeElement as HTMLElement | null)?.blur();
      onPicked?.();
    }
  }

  const showList = open && !value.pos;
  const placeholder = target === "from" ? "Хаанаас? — жишээ: Дархан бүсийн карго" : "Хаашаа? — жишээ: Магнолиа хотхон";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        {target === "from" ? <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" /> : <MapPin className="w-4 h-4 text-primary shrink-0" />}
        <div className="flex-1 min-w-0">
          <input
            key={target}
            value={value.addr}
            onChange={(e) => onChange({ addr: e.target.value, pos: null })}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}

            enterKeyHint="search"
            className="w-full bg-transparent text-base font-semibold placeholder:text-muted-foreground/70 placeholder:font-normal focus:outline-none"
          />
          {value.pos && (
            <p className="text-xs text-green-700 dark:text-green-300 font-medium flex items-center gap-1 mt-0.5">
              <Check className="w-3.5 h-3.5" /> Байршил тодорхой
            </p>
          )}
        </div>
        {value.addr ? (
          <button
            aria-label="Арилгах"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => { onChange({ addr: "", pos: null, detail: "" }); setOpen(true); }}
            className="shrink-0 w-11 h-11 -mr-1.5 rounded-full flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Санал болгох жагсаалт */}
      {showList && (
        <div className="border-t border-border max-h-[48dvh] overflow-y-auto">
          {!query.trim() && (
            <button
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => { onMyLocation(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-secondary/60"
            >
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              </span>
              <span className="text-sm font-semibold">Миний байршил</span>
            </button>
          )}
          {local.map((r) => (
            <ResultRow key={r.id} r={r} busy={resolving === r.id} onPick={pick} />
          ))}
          {mapResults.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground">{SOURCE_LABEL.map}</p>
          )}
          {mapResults.map((r) => (
            <ResultRow key={r.id} r={r} busy={resolving === r.id} onPick={pick} />
          ))}
          {searching && (
            <p className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Газрын зургаас хайж байна...
            </p>
          )}
          {query.trim().length >= 3 && !searching && local.length === 0 && mapResults.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">Олдсонгүй. Доорх "Газрын зураг"-аар цэгээ заана уу.</p>
          )}
        </div>
      )}

      <div className="border-t border-border p-3 space-y-2.5">
        <input
          ref={detailRef}
          value={value.detail}
          onChange={(e) => onChange({ detail: e.target.value })}
          placeholder="Байр, орц, давхар, тоот (заавал биш)"
          className="w-full bg-secondary/60 rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenMap}
            className={`flex items-center justify-center gap-1.5 min-h-11 rounded-2xl border text-sm font-semibold transition-colors ${value.pos ? "border-primary/40 bg-primary/10 text-primary" : "border-border"}`}
          >
            <MapIcon className="w-4 h-4" /> {value.pos ? "Цэгээ засах" : "Газрын зураг"}
          </button>
          <button
            onClick={onMyLocation}
            disabled={locating}
            className="flex items-center justify-center gap-1.5 min-h-11 rounded-2xl border border-border text-sm font-semibold disabled:opacity-60"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-primary" />} Миний байршил
          </button>
        </div>
        {autoPriceHint && !value.pos && value.addr.trim() && (
          <p className="text-xs text-green-700 dark:text-green-300 font-medium">
            Жагсаалтаас сонгох эсвэл газрын зураг дээр заавал үнэ шууд гарна.
          </p>
        )}
        {geoErr && <p className="text-xs text-destructive">{geoErr}</p>}
      </div>
    </div>
  );
}

function ResultRow({ r, busy, onPick }: { r: PlaceResult; busy: boolean; onPick: (r: PlaceResult) => void }) {
  const Icon = SOURCE_ICON[r.source];
  const located = !!r.pos || !!r.resolve;
  return (
    <button
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => onPick(r)}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-secondary/60"
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.source === "partner" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{r.name}</span>
        {r.subtitle && <span className="block text-xs text-muted-foreground truncate">{r.subtitle}</span>}
      </span>
      {located ? (
        <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" aria-label="Байршилтай" />
      ) : (
        <span className="text-xs text-muted-foreground shrink-0">байршилгүй</span>
      )}
    </button>
  );
}
