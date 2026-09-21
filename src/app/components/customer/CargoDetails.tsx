import { useRef, useState } from "react";
import { Camera, X, AlertTriangle, Zap, Weight, Loader2 } from "lucide-react";
import { storePhoto } from "../../lib/photo";

export interface CargoInfo {
  photoUrl?: string;
  weightKg?: number;
  fragile: boolean;
  urgent: boolean;
}

interface CargoDetailsProps {
  value: CargoInfo;
  onChange: (next: CargoInfo) => void;
}

/**
 * Үйлчилгээний гурав дахь түвшин — ачааны мэдээлэл.
 * Зураг, жин (кг), хагарах аюултай эсэх, онцгой яаралтай эсэх.
 */
export function CargoDetails({ value, onChange }: CargoDetailsProps) {
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

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>Ачааны мэдээлэл</p>

      {/* Зураг */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pickPhoto(e.target.files?.[0])}
      />
      {value.photoUrl ? (
        <div className="relative">
          <img src={value.photoUrl} alt="Ачаа" className="w-full h-40 object-cover rounded-xl border border-border" />
          <button
            onClick={() => onChange({ ...value, photoUrl: undefined })}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
            aria-label="Зураг устгах"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          <span className="text-xs">{uploading ? "Хавсаргаж байна..." : "Барааны гадна зураг"}</span>
        </button>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Жин */}
      <div className="flex items-center gap-3 bg-secondary/50 border border-border rounded-xl px-3 py-2.5">
        <Weight className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={value.weightKg ?? ""}
          onChange={(e) => {
            const n = e.target.value.replace(/[^0-9.]/g, "");
            onChange({ ...value, weightKg: n === "" ? undefined : Number(n) });
          }}
          inputMode="decimal"
          placeholder="Ойролцоо жин"
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
        />
        <span className="text-xs text-muted-foreground">кг</span>
      </div>

      {/* Тэмдэглэгээ */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "fragile" as const, icon: AlertTriangle, label: "Хагарах аюултай", cls: "amber" },
          { key: "urgent" as const,  icon: Zap,           label: "Онцгой яаралтай", cls: "red" },
        ].map((f) => {
          const Icon = f.icon;
          const on = value[f.key];
          return (
            <button
              key={f.key}
              onClick={() => onChange({ ...value, [f.key]: !on })}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                on
                  ? f.cls === "amber"
                    ? "bg-amber-500/15 border-amber-500 text-amber-500"
                    : "bg-red-500/15 border-red-500 text-red-500"
                  : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" /> {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
