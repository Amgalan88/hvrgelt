import { useRef, useState } from "react";
import { Camera, IdCard, Car, Bike, Hash, Loader2, CheckCircle, ShieldAlert, Save } from "lucide-react";
import type { CourierDocs } from "../shared/types";
import { storePhoto } from "../../lib/photo";
import { VEHICLES, VEHICLE_ICON, docItems, missingDocs, isMotorized, type DocKey, type Vehicle } from "../../lib/vehicles";

interface CourierDocsFormProps {
  docs: CourierDocs;
  /** Одоогийн тээврийн хэрэгсэл — шаардах баримт үүнээс хамаарна */
  vehicle?: Vehicle;
  phone: string;
  /** vehicle-ийг зөвхөн сольсон үед дамжуулна — солиход дахин баталгаажуулна */
  onSave: (docs: CourierDocs & { vehicle?: Vehicle }) => Promise<void>;
}

type PhotoKey = "photoUrl" | "licensePhotoUrl" | "carPhotoUrl";
const PHOTO_KEYS: DocKey[] = ["photoUrl", "licensePhotoUrl", "carPhotoUrl"];
const PLACEHOLDER: Partial<Record<DocKey, string>> = {
  plate: "1234 УБА",
  licenseNo: "82-441907",
  licenseClass: "B",
  licenseExpiry: "2029.04.18",
};

/**
 * Хүргэгчийн баримт бичиг. Шаардлага нь тээврийн хэрэгслээс хамаарна
 * (lib/vehicles.ts): явган, дугуй бол цээж зураг л хангалттай; моторт
 * хэрэгсэлд жолооны үнэмлэх, хэрэгслийн зураг, улсын дугаар.
 * Супер админ шалгаж баталгаажуулах хүртэл захиалгын санал ирэхгүй.
 */
export function CourierDocsForm({ docs, vehicle: initialVehicle, phone, onSave }: CourierDocsFormProps) {
  const [form, setForm] = useState<CourierDocs>(docs);
  const [vehicle, setVehicle] = useState<Vehicle | undefined>(initialVehicle);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const refs = {
    photoUrl: useRef<HTMLInputElement>(null),
    licensePhotoUrl: useRef<HTMLInputElement>(null),
    carPhotoUrl: useRef<HTMLInputElement>(null),
  };

  const items = docItems(vehicle);
  const photoItems = items.filter((d) => PHOTO_KEYS.includes(d.key));
  const textItems = items.filter((d) => !PHOTO_KEYS.includes(d.key));
  const missing = missingDocs(vehicle, form);
  const vehicleChanged = vehicle !== initialVehicle;

  /**
   * Моторт ↔ моторгүй хэрэгсэл солиход үнэмлэхийн нүд өөр баримт болно
   * (жолооны ↔ иргэний) — хуучин зургийг хоосолж дахин оруулуулна.
   */
  function chooseVehicle(v: Vehicle) {
    setVehicle(v);
    setSaved(false);
    setForm((f) => ({ ...f, licensePhotoUrl: isMotorized(v) === isMotorized(initialVehicle) ? docs.licensePhotoUrl : "" }));
  }

  async function pick(key: PhotoKey, file?: File) {
    if (!file) return;
    setBusy(key);
    setError("");
    try {
      const url = await storePhoto(file);
      setForm((f) => ({ ...f, [key]: url }));
      // Зургийг шууд хадгална — "Хадгалах" дарахаа мартсан ч алдагдахгүй
      await onSave({ [key]: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Зураг хавсаргахад алдаа гарлаа.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(vehicleChanged ? { ...form, vehicle } : form);
      if (vehicleChanged) setForm((f) => ({ ...f, verified: false }));
      setSaved(true);
    } catch {
      setError("Хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Баталгаажуулалтын төлөв */}
      {form.verified && !vehicleChanged ? (
        <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Баталгаажсан</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ажилд гарвал танд ойр захиалгын санал ирнэ.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Баталгаажаагүй байна</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {missing.length > 0
                ? `Дутуу: ${missing.join(", ")}. Оруулсны дараа админ шалгаж баталгаажуулна.`
                : "Мэдээлэл бүрэн. Админ шалгаж баталгаажуулах хүртэл хүлээнэ үү."}
            </p>
          </div>
        </div>
      )}

      {/* Тээврийн хэрэгсэл — шаардах баримтыг тодорхойлно */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Bike className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Юугаар хүргэх вэ</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {VEHICLES.map((v) => (
            <button
              key={v}
              onClick={() => chooseVehicle(v)}
              aria-pressed={vehicle === v}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                vehicle === v ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              <span className="text-lg leading-none">{VEHICLE_ICON[v]}</span> {v}
            </button>
          ))}
        </div>
        {vehicleChanged && form.verified && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Хэрэгсэл солибол админ дахин шалгаж баталгаажуулна.</p>
        )}
      </div>

      {/* Зурагнууд */}
      {photoItems.map((f) => {
        const key = f.key as PhotoKey;
        const Icon = key === "photoUrl" ? Camera : key === "licensePhotoUrl" ? IdCard : vehicle === "дугуй" ? Bike : Car;
        const url = form[key];
        return (
          <div key={key} className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">{f.label}</p>
              {!f.required && <span className="text-[11px] text-muted-foreground">заавал биш</span>}
              {f.private && <span className="text-[11px] text-muted-foreground">зөвхөн админ харна</span>}
              {url && <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto" />}
            </div>
            <input
              ref={refs[key]}
              type="file"
              accept="image/*"
              capture={key === "photoUrl" ? "user" : "environment"}
              className="hidden"
              onChange={(e) => pick(key, e.target.files?.[0])}
            />
            {url ? (
              <div className="space-y-2">
                <img src={url} alt={f.label} className="w-full h-40 object-cover rounded-xl border border-border" />
                <button
                  onClick={() => refs[key].current?.click()}
                  className="w-full border border-border text-muted-foreground py-2 rounded-xl text-xs hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  Зураг солих
                </button>
              </div>
            ) : (
              <button
                onClick={() => refs[key].current?.click()}
                disabled={busy === key}
                className="w-full border border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {busy === key ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                <span className="text-xs">
                  {busy === key ? "Хавсаргаж байна..." : key === "photoUrl" ? "Нүүр тод харагдах зураг авах" : "Зураг авах / сонгох"}
                </span>
              </button>
            )}
          </div>
        );
      })}

      {photoItems.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center -mt-1">Зураг оруулмагц автоматаар хадгалагдана.</p>
      )}

      {/* Текст талбарууд — моторт хэрэгсэлд */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {textItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Хэрэгсэл, үнэмлэхийн мэдээлэл</p>
          </div>
        )}
        {textItems.map((f) => (
          <div key={f.key}>
            <label className="text-xs text-muted-foreground block mb-1.5">
              {f.label}{!f.required && " (заавал биш)"}
            </label>
            <input
              value={(form[f.key] as string | undefined) ?? ""}
              onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setSaved(false); }}
              placeholder={PLACEHOLDER[f.key]}
              className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Утасны дугаар</label>
          <input
            value={phone}
            disabled
            className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 text-sm text-muted-foreground"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      {(textItems.length > 0 || vehicleChanged) && (
      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Хадгалагдлаа" : "Хадгалах"}
      </button>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Цээж зураг, хэрэгслийн мэдээлэл ачаа авах үед үйлчлүүлэгчид харагдана.
      </p>
    </div>
  );
}
