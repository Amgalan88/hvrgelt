import { useEffect, useState } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { priceForKm, ROAD_FACTOR, ROUND_TO, URGENT_MINUTES, type Tariff } from "../../lib/pricing";

interface TariffSettingsProps {
  tariff: Tariff;
  onSave: (t: Tariff) => Promise<void>;
}

type FieldKey = "base" | "perKm" | "tier1Km" | "perKm2" | "tier2Km" | "perKm3" | "includedKm" | "handToHand" | "urgentExtra" | "fragileExtra";

// 2 баганаар: км үнэ ба тэр ангиллын хил хажуу хажуудаа
const FIELDS: { key: FieldKey; label: string; unit: string; hint: string }[] = [
  { key: "base", label: "Захиалга", unit: "₮", hint: "Захиалга бүрийн суурь төлбөр" },
  { key: "includedKm", label: "Суурьт багтах зай", unit: "км", hint: "0 бол эхний км-ээс тооцно" },
  { key: "perKm", label: "Км үнэ — богино зай", unit: "₮", hint: "Нийт зай доорх хил хүртэл бол бүх км" },
  { key: "tier1Km", label: "Богино зай хүртэл", unit: "км", hint: "Жш: 3 км хүртэл (3 орно)" },
  { key: "perKm2", label: "Км үнэ — дунд зай", unit: "₮", hint: "Хол зайд хүрэхгүй бол бүх км" },
  { key: "tier2Km", label: "Хол зай эхлэх", unit: "км", hint: "Жш: 10 км ба түүнээс дээш" },
  { key: "perKm3", label: "Км үнэ — хол зай", unit: "₮", hint: "Нийт зай хол бол бүх км" },
  { key: "handToHand", label: "Гараас гарт", unit: "₮", hint: "Орж авах, оруулж өгөх" },
  { key: "urgentExtra", label: "Яаралтай", unit: "₮", hint: `Яаралтай ачааны нэмэлт (${URGENT_MINUTES} мин дотор)` },
  { key: "fragileExtra", label: "Хэврэг", unit: "₮", hint: "Хэврэг ачааны нэмэлт" },
];

/** Тоон үзүүлэлтээр урьдчилан харах зай */
const PREVIEW_KM = [3, 5, 9, 12];

/** Байршлаар шууд үнэ бодох тариф — 20кг хүртэлх бараа хүргэлт */
export function TariffSettings({ tariff, onSave }: TariffSettingsProps) {
  const [draft, setDraft] = useState<Tariff>(tariff);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setDraft(tariff), [tariff]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(tariff);

  async function save(next: Tariff) {
    setSaving(true);
    setError("");
    try {
      await onSave(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Хадгалж чадсангүй.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Calculator className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Шууд үнэ — бараа хүргэлт 20кг хүртэл</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Үйлчлүүлэгч хоёр цэгээ газрын зураг дээр заавал үнэ шууд гарч, оператор үнэ тавихгүйгээр төлбөр рүү шилжинэ.
              Цэг заагаагүй захиалгад оператор өмнөх шигээ үнэ тавина.
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={draft.enabled}
          aria-label="Шууд үнэ"
          onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
          className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${draft.enabled ? "bg-primary" : "bg-switch-background"}`}
        >
          <span className={`absolute top-0.5 left-0 w-6 h-6 rounded-full bg-white shadow transition-transform ${draft.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <div className="mt-1 flex items-center bg-input-background border border-border rounded-xl px-3 focus-within:border-primary/50">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={f.unit === "км" ? 0.5 : 100}
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: Math.max(0, Number(e.target.value) || 0) })}
                className="flex-1 min-w-0 bg-transparent py-2.5 text-sm font-semibold tabular focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">{f.unit}</span>
            </div>
            <span className="block text-xs text-muted-foreground/80 mt-1 leading-tight">{f.hint}</span>
          </label>
        ))}
      </div>

      {/* Урьдчилан харах */}
      <div className="rounded-xl bg-secondary/60 p-3">
        <p className="text-xs font-semibold mb-2">Жишээ үнэ</p>
        <div className="grid grid-cols-4 gap-1 text-center">
          {PREVIEW_KM.map((km) => (
            <div key={km}>
              <p className="text-xs text-muted-foreground tabular">{km} км</p>
              <p className="text-sm font-bold tabular">₮{priceForKm(draft, km).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          Зай = машины замын урт (зам олдохгүй бол шулуун зай × {ROAD_FACTOR}). Урамшуулал: нийт зай аль ангилалд орохоор бүх км тэр үнээр — {draft.tier1Km} км хүртэл ₮{draft.perKm.toLocaleString()}, {Math.max(draft.tier1Km, draft.tier2Km)} км хүрэхгүй ₮{draft.perKm2.toLocaleString()}, түүнээс дээш ₮{draft.perKm3.toLocaleString()} (жш 9 км = 9 × ₮{draft.perKm2.toLocaleString()}). Км-ийн төлбөр ₮{ROUND_TO}-аар дээш бөөрөнхийлөгдөнө. Хүргэгч нийт үнийн 80%-ийг авна.
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        onClick={() => save(draft)}
        disabled={saving || !dirty}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "✓ Хадгалагдлаа" : draft.enabled && !tariff.enabled ? "Хадгалж асаах" : "Хадгалах"}
      </button>
    </div>
  );
}
