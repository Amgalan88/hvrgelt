import { useRef, useState } from "react";
import { Camera, IdCard, Car, Hash, Loader2, CheckCircle, ShieldAlert, Save } from "lucide-react";
import type { CourierDocs } from "../shared/types";
import { storePhoto } from "../../lib/photo";

interface CourierDocsFormProps {
  docs: CourierDocs;
  phone: string;
  onSave: (docs: CourierDocs) => Promise<void>;
}

/**
 * Жолоочийн баримт бичиг — үйлчлүүлэгчид харагдах 5 мэдээлэл:
 * цээж зураг, жолооны үнэмлэх, машины зураг, улсын дугаар, утас.
 * Супер админ шалгаж баталгаажуулах хүртэл захиалга хуваарилагдахгүй.
 */
export function CourierDocsForm({ docs, phone, onSave }: CourierDocsFormProps) {
  const [form, setForm] = useState<CourierDocs>(docs);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const refs = {
    photoUrl: useRef<HTMLInputElement>(null),
    licensePhotoUrl: useRef<HTMLInputElement>(null),
    carPhotoUrl: useRef<HTMLInputElement>(null),
  };

  async function pick(key: "photoUrl" | "licensePhotoUrl" | "carPhotoUrl", file?: File) {
    if (!file) return;
    setBusy(key);
    setError("");
    try {
      const url = await storePhoto(file);
      setForm((f) => ({ ...f, [key]: url }));
      setSaved(false);
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
      await onSave(form);
      setSaved(true);
    } catch {
      setError("Хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSaving(false);
    }
  }

  const photoFields: { key: "photoUrl" | "licensePhotoUrl" | "carPhotoUrl"; label: string; icon: typeof Camera }[] = [
    { key: "photoUrl",        label: "Цээж зураг",       icon: Camera },
    { key: "licensePhotoUrl", label: "Жолооны үнэмлэх",  icon: IdCard },
    { key: "carPhotoUrl",     label: "Машины зураг",     icon: Car },
  ];

  const missing = photoFields.filter((f) => !form[f.key]).length + (form.plate ? 0 : 1);

  return (
    <div className="space-y-3">
      {/* Баталгаажуулалтын төлөв */}
      {form.verified ? (
        <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-500">Баталгаажсан</p>
            <p className="text-xs text-muted-foreground mt-0.5">Танд захиалга хуваарилагдана.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-500">Баталгаажаагүй байна</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {missing > 0
                ? `Дутуу ${missing} мэдээллийг оруулаад хадгална уу. Админ шалгасны дараа захиалга авч эхэлнэ.`
                : "Мэдээлэл бүрэн. Админ шалгаж баталгаажуулах хүртэл хүлээнэ үү."}
            </p>
          </div>
        </div>
      )}

      {/* Зурагнууд */}
      {photoFields.map((f) => {
        const Icon = f.icon;
        const url = form[f.key];
        return (
          <div key={f.key} className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">{f.label}</p>
              {url && <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto" />}
            </div>
            <input
              ref={refs[f.key]}
              type="file"
              accept="image/*"
              capture={f.key === "photoUrl" ? "user" : "environment"}
              className="hidden"
              onChange={(e) => pick(f.key, e.target.files?.[0])}
            />
            {url ? (
              <div className="space-y-2">
                <img src={url} alt={f.label} className="w-full h-40 object-cover rounded-xl border border-border" />
                <button
                  onClick={() => refs[f.key].current?.click()}
                  className="w-full border border-border text-muted-foreground py-2 rounded-xl text-xs hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  Зураг солих
                </button>
              </div>
            ) : (
              <button
                onClick={() => refs[f.key].current?.click()}
                disabled={busy === f.key}
                className="w-full border border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {busy === f.key ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                <span className="text-xs">{busy === f.key ? "Хавсаргаж байна..." : "Зураг авах / сонгох"}</span>
              </button>
            )}
          </div>
        );
      })}

      {/* Текст талбарууд */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Машин, үнэмлэхийн мэдээлэл</p>
        </div>
        {[
          { key: "plate" as const,         label: "Улсын дугаар",      ph: "1234 УБА" },
          { key: "licenseNo" as const,     label: "Үнэмлэхийн дугаар", ph: "82-441907" },
          { key: "licenseClass" as const,  label: "Ангилал",           ph: "B" },
          { key: "licenseExpiry" as const, label: "Хүчинтэй хугацаа",  ph: "2029.04.18" },
        ].map((f) => (
          <div key={f.key}>
            <label className="text-xs text-muted-foreground block mb-1.5">{f.label}</label>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setSaved(false); }}
              placeholder={f.ph}
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

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Хадгалагдлаа" : "Хадгалах"}
      </button>

      <p className="text-[11px] text-muted-foreground text-center">
        Эдгээр мэдээлэл ачаа авах үед үйлчлүүлэгчид харагдана.
      </p>
    </div>
  );
}
