import { useRef, useState } from "react";
import { Camera, X, AlertTriangle, Zap, Loader2, HandHelping } from "lucide-react";
import { storePhoto } from "../../lib/photo";

export interface CargoInfo {
  photoUrl?: string;
  /** Хуучин захиалгуудад үлдсэн. Жинг үйлчилгээ (20кг хүртэл/дээш) аль хэдийн хэлдэг тул дахин асуухгүй. */
  weightKg?: number;
  fragile: boolean;
  urgent: boolean;
  /** Гараас гарт — хүргэгч орж авч, оруулж өгнө */
  handToHand?: boolean;
}

interface CargoDetailsProps {
  value: CargoInfo;
  onChange: (next: CargoInfo) => void;
  /** Нэмэлт төлбөрийг товч дээр харуулна (шууд үнэтэй үед) */
  prices?: { handToHand?: number; urgent?: number; fragile?: number };
}

/**
 * Ачааны нэмэлт мэдээлэл — нэг мөрөнд: зураг, хагарах, яаралтай.
 * Бүгд заавал биш, нэг товшилтоор асаана.
 */
export function CargoDetails({ value, onChange, prices }: CargoDetailsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function pickPhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await storePhoto(file);
      onChange({ ...value, photoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Зураг хавсаргахад алдаа гарлаа.");
    } finally {
      setUploading(false);
    }
  }

  const chip = (on: boolean, tone: "amber" | "red") =>
    `flex-1 flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
      on
        ? tone === "amber"
          ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
          : "bg-red-500/12 border-red-500/40 text-red-600 dark:text-red-300"
        : "bg-card border-border text-muted-foreground"
    }`;

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pickPhoto(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        {/* Зураг — жижиг хавтан */}
        {value.photoUrl ? (
          <div className="relative w-[52px] h-[52px] shrink-0">
            <img src={value.photoUrl} alt="Ачаа" className="w-full h-full object-cover rounded-2xl border border-border" />
            <button
              onClick={() => onChange({ ...value, photoUrl: undefined })}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center"
              aria-label="Зураг устгах"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Ачааны зураг"
            className="w-[52px] h-[52px] shrink-0 rounded-2xl border border-dashed border-border bg-card flex items-center justify-center text-muted-foreground disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          </button>
        )}
        <button onClick={() => onChange({ ...value, fragile: !value.fragile })} aria-pressed={value.fragile} className={chip(value.fragile, "amber")}>
          <AlertTriangle className="w-4 h-4" />
          <span className="text-left leading-tight">Хэврэг{prices?.fragile ? <span className="block text-xs font-medium opacity-75">+₮{prices.fragile.toLocaleString()}</span> : null}</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onChange({ ...value, handToHand: !value.handToHand })} aria-pressed={!!value.handToHand} className={chip(!!value.handToHand, "amber")}>
          <HandHelping className="w-4 h-4" />
          <span className="text-left leading-tight">Гараас гарт{prices?.handToHand ? <span className="block text-xs font-medium opacity-75">+₮{prices.handToHand.toLocaleString()}</span> : null}</span>
        </button>
        <button onClick={() => onChange({ ...value, urgent: !value.urgent })} aria-pressed={value.urgent} className={chip(value.urgent, "red")}>
          <Zap className="w-4 h-4" />
          <span className="text-left leading-tight">Яаралтай{prices?.urgent ? <span className="block text-xs font-medium opacity-75">+₮{prices.urgent.toLocaleString()}</span> : null}</span>
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
