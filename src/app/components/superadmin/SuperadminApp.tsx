import { useState, useRef } from "react";
import { Users, Truck, Plus, Pencil, Trash2, X, LogOut, Eye, EyeOff, CheckCircle, XCircle, Shield, MapPin, Settings, ImagePlus, Loader } from "lucide-react";
import type { OperatorAccount, CourierAccount } from "../shared/store";
import type { Partner, PartnerCategory } from "../customer/partners";
import { PARTNER_CATEGORIES, PARTNER_EMOJIS } from "../customer/partners";
import { uploadToCloudinary, cloudinaryConfigured } from "../../lib/cloudinary";

type Tab = "operators" | "couriers" | "partners" | "settings";

interface SuperadminAppProps {
  operatorAccounts: OperatorAccount[];
  courierAccounts: CourierAccount[];
  partners: Partner[];
  onAddOperator: (data: { name: string; username: string; password: string; phone: string }) => void;
  onUpdateOperator: (id: string, data: Partial<Omit<OperatorAccount, "id">>) => void;
  onDeleteOperator: (id: string) => void;
  onAddCourier: (data: { name: string; username: string; password: string; phone: string; vehicle: CourierAccount["vehicle"] }) => void;
  onUpdateCourier: (id: string, data: Partial<Omit<CourierAccount, "id">>) => void;
  onDeleteCourier: (id: string) => void;
  onAddPartner: (data: Omit<Partner, "id">) => void;
  onUpdatePartner: (id: string, data: Partial<Omit<Partner, "id">>) => void;
  onDeletePartner: (id: string) => void;
  bankInfo: string;
  onUpdateBankInfo: (value: string) => void;
  onLogout: () => void;
}

const VEHICLE_OPTIONS = ["мотоцикл", "автомашин", "дугуй", "мопед"] as const;
const VEHICLE_ICON: Record<string, string> = { мотоцикл: "🏍️", автомашин: "🚗", дугуй: "🚲", мопед: "🛵" };

// ── Generic modal shell ───────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
      className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors" />
  );
}

// ── Operator modal ────────────────────────────────────────────────────
function OperatorModal({ initial, onSave, onClose }: {
  initial?: Partial<OperatorAccount>;
  onSave: (data: { name: string; username: string; password: string; phone: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [showPass, setShowPass] = useState(false);

  return (
    <Modal title={initial?.id ? "Оператор засах" : "Оператор нэмэх"} onClose={onClose}>
      <Field label="Овог нэр"><Input value={name} onChange={setName} placeholder="Д. Дэлгэрмаа" /></Field>
      <Field label="Нэвтрэх нэр (username)"><Input value={username} onChange={setUsername} placeholder="delgermaa" /></Field>
      <Field label="Нэг удаагийн нууц үг">
        <div className="relative">
          <Input value={password} onChange={setPassword} placeholder="••••••••" type={showPass ? "text" : "password"} />
          <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>
      <Field label="Утасны дугаар"><Input value={phone} onChange={setPhone} placeholder="9911-0001" type="tel" /></Field>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:border-primary/30 transition-colors">Болих</button>
        <button
          onClick={() => { if (name && username && password && phone) { onSave({ name, username, password, phone }); onClose(); } }}
          disabled={!name || !username || !password || !phone}
          className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
          style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
        >
          Хадгалах
        </button>
      </div>
    </Modal>
  );
}

// ── Courier modal ─────────────────────────────────────────────────────
function CourierModal({ initial, onSave, onClose }: {
  initial?: Partial<CourierAccount>;
  onSave: (data: { name: string; username: string; password: string; phone: string; vehicle: CourierAccount["vehicle"] }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [vehicle, setVehicle] = useState<typeof VEHICLE_OPTIONS[number]>(initial?.vehicle ?? "мотоцикл");
  const [showPass, setShowPass] = useState(false);

  return (
    <Modal title={initial?.id ? "Хүргэгч засах" : "Хүргэгч нэмэх"} onClose={onClose}>
      <Field label="Овог нэр"><Input value={name} onChange={setName} placeholder="Б. Мөнхбат" /></Field>
      <Field label="Нэвтрэх нэр (username)"><Input value={username} onChange={setUsername} placeholder="munkh" /></Field>
      <Field label="Нэг удаагийн нууц үг">
        <div className="relative">
          <Input value={password} onChange={setPassword} placeholder="••••••••" type={showPass ? "text" : "password"} />
          <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>
      <Field label="Утасны дугаар"><Input value={phone} onChange={setPhone} placeholder="9911-2233" type="tel" /></Field>
      <Field label="Тээврийн хэрэгсэл">
        <div className="grid grid-cols-2 gap-2">
          {VEHICLE_OPTIONS.map((v) => (
            <button key={v} onClick={() => setVehicle(v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${vehicle === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
              <span>{VEHICLE_ICON[v]}</span> {v}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:border-primary/30 transition-colors">Болих</button>
        <button
          onClick={() => { if (name && username && password && phone) { onSave({ name, username, password, phone, vehicle }); onClose(); } }}
          disabled={!name || !username || !password || !phone}
          className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
          style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
        >
          Хадгалах
        </button>
      </div>
    </Modal>
  );
}

// ── Confirm delete modal ──────────────────────────────────────────────
function ConfirmDelete({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title="Устгах" onClose={onClose}>
      <p className="text-sm text-muted-foreground"><span className="text-foreground font-medium">{name}</span>-г бүрмөсөн устгах уу?</p>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm">Болих</button>
        <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-xl text-sm hover:bg-destructive/90 transition-colors">Устгах</button>
      </div>
    </Modal>
  );
}

// ── Partner modal ─────────────────────────────────────────────────────
function PartnerModal({ initial, onSave, onClose }: {
  initial?: Partial<Partner>;
  onSave: (data: Omit<Partner, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<PartnerCategory>(initial?.category ?? "Карго");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "📦");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [area, setArea] = useState(initial?.area ?? "Дархан");
  const [image, setImage] = useState(initial?.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError("");
    try {
      const url = await uploadToCloudinary(file);
      setImage(url);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload алдаа");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal title={initial?.id ? "Газар засах" : "Газар нэмэх"} onClose={onClose}>
      <Field label="Нэр"><Input value={name} onChange={setName} placeholder="Дархан бүсийн карго" /></Field>
      <Field label="Ангилал">
        <div className="grid grid-cols-3 gap-1.5">
          {PARTNER_CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-xs transition-all ${category === c.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
              <span>{c.emoji}</span> {c.key}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Зураг (Cloudinary)">
        <div className="space-y-2">
          {image ? (
            <div className="relative">
              <img src={image} alt="preview" className="w-full h-32 object-cover rounded-xl border border-border" />
              <button
                onClick={() => setImage("")}
                className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              ><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !cloudinaryConfigured()}
              className="w-full h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all disabled:opacity-40"
            >
              {uploading ? <Loader className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              <span className="text-xs">{uploading ? "Upload хийж байна..." : cloudinaryConfigured() ? "Зураг сонгох" : ".env-д Cloudinary key оруулна уу"}</span>
            </button>
          )}
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
        </div>
      </Field>
      <Field label="Emoji (зураг байхгүй үед)">
        <div className="flex flex-wrap gap-1.5">
          {PARTNER_EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-xl border text-lg transition-all ${emoji === e ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}>
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Хаяг (дүүрэг/бүс)"><Input value={address} onChange={setAddress} placeholder="Дархан, 9-р баг" /></Field>
      <Field label="Дэлгэрэнгүй хаяг"><Input value={detail} onChange={setDetail} placeholder="Гол гудамж 4" /></Field>
      <Field label="Хот/Бүс"><Input value={area} onChange={setArea} placeholder="Дархан" /></Field>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:border-primary/30 transition-colors">Болих</button>
        <button
          onClick={() => { if (name && address) { onSave({ name, category, emoji, address, detail, area, image: image || undefined }); onClose(); } }}
          disabled={!name || !address || uploading}
          className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
          style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
        >
          Хадгалах
        </button>
      </div>
    </Modal>
  );
}

// ── Main superadmin app ───────────────────────────────────────────────
export function SuperadminApp({
  operatorAccounts, courierAccounts, partners,
  onAddOperator, onUpdateOperator, onDeleteOperator,
  onAddCourier, onUpdateCourier, onDeleteCourier,
  onAddPartner, onUpdatePartner, onDeletePartner,
  bankInfo, onUpdateBankInfo,
  onLogout,
}: SuperadminAppProps) {
  const [bankDraft, setBankDraft] = useState(bankInfo);
  const [bankSaved, setBankSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("operators");
  const [modal, setModal] = useState<
    | { type: "add-operator" }
    | { type: "edit-operator"; item: OperatorAccount }
    | { type: "add-courier" }
    | { type: "edit-courier"; item: CourierAccount }
    | { type: "add-partner" }
    | { type: "edit-partner"; item: Partner }
    | { type: "delete"; id: string; name: string; role: "operator" | "courier" | "partner" }
    | null
  >(null);

  const activeOps = operatorAccounts.filter((o) => o.active).length;
  const activeCrs = courierAccounts.filter((c) => c.active).length;
  const availCrs = courierAccounts.filter((c) => c.available && c.active).length;
  const partnerCount = partners.length;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none" style={{ fontFamily: "'Roboto Slab', serif" }}>hvrgelt.mn</p>
              <p className="text-xs text-primary leading-none mt-0.5">Супер Админ</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Гарах
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Оператор", value: activeOps, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
            { label: "Хүргэгч", value: activeCrs, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
            { label: "Газар", value: partnerCount, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: "'Roboto Slab', serif" }}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          {([
            { key: "operators" as Tab, label: "Операторууд", icon: Users },
            { key: "couriers" as Tab, label: "Хүргэгчид", icon: Truck },
            { key: "partners" as Tab, label: "Газрууд", icon: MapPin },
            { key: "settings" as Tab, label: "Тохиргоо", icon: Settings },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors ${tab === key ? "bg-card text-foreground border border-border" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── OPERATORS ── */}
        {tab === "operators" && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{operatorAccounts.length} оператор</p>
              <button onClick={() => setModal({ type: "add-operator" })}
                className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl text-sm hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Нэмэх
              </button>
            </div>

            {operatorAccounts.map((op) => (
              <div key={op.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0" style={{ fontFamily: "'Roboto Slab', serif" }}>
                    {op.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{op.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${op.active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-secondary text-muted-foreground border-border"}`}>
                        {op.active ? "идэвхтэй" : "идэвхгүй"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">@{op.username}</span>
                      <span>·</span>
                      <span>{op.createdAt}-аас</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onUpdateOperator(op.id, { active: !op.active })}
                      className={`p-1.5 rounded-lg transition-colors ${op.active ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-secondary"}`}
                      title={op.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}>
                      {op.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setModal({ type: "edit-operator", item: op })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModal({ type: "delete", id: op.id, name: op.name, role: "operator" })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Credentials row */}
                <div className="flex gap-4 px-4 py-2 bg-secondary/30 border-t border-border text-xs text-muted-foreground font-mono">
                  <span>user: <span className="text-foreground">{op.username}</span></span>
                  <span>pass: <span className="text-foreground">{op.password}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── COURIERS ── */}
        {tab === "couriers" && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{courierAccounts.length} хүргэгч</p>
              <button onClick={() => setModal({ type: "add-courier" })}
                className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl text-sm hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Нэмэх
              </button>
            </div>

            {courierAccounts.map((cr) => (
              <div key={cr.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold shrink-0" style={{ fontFamily: "'Roboto Slab', serif" }}>
                    {cr.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{cr.name}</p>
                      <span className="text-base">{VEHICLE_ICON[cr.vehicle]}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${cr.active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-secondary text-muted-foreground border-border"}`}>
                        {cr.active ? "идэвхтэй" : "идэвхгүй"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">@{cr.username}</span>
                      <span>·</span>
                      <span>{cr.phone}</span>
                      <span>·</span>
                      <span>★{cr.rating} · {cr.totalDeliveries} хүрг.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onUpdateCourier(cr.id, { active: !cr.active })}
                      className={`p-1.5 rounded-lg transition-colors ${cr.active ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-secondary"}`}>
                      {cr.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setModal({ type: "edit-courier", item: cr })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModal({ type: "delete", id: cr.id, name: cr.name, role: "courier" })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 px-4 py-2 bg-secondary/30 border-t border-border text-xs text-muted-foreground font-mono">
                  <span>user: <span className="text-foreground">{cr.username}</span></span>
                  <span>pass: <span className="text-foreground">{cr.password}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PARTNERS ── */}
        {tab === "partners" && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{partners.length} газар</p>
              <button onClick={() => setModal({ type: "add-partner" })}
                className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl text-sm hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Нэмэх
              </button>
            </div>

            {partners.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{p.name}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">{p.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="leading-relaxed">{p.address}{p.detail ? ` · ${p.detail}` : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setModal({ type: "edit-partner", item: p })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setModal({ type: "delete", id: p.id, name: p.name, role: "partner" })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>Банкны мэдээлэл</p>
              </div>
              <p className="text-xs text-muted-foreground">Хэрэглэгч захиалга батлах үед харагдах гүйлгээний мэдээлэл.</p>
              <textarea
                value={bankDraft}
                onChange={(e) => { setBankDraft(e.target.value); setBankSaved(false); }}
                rows={5}
                placeholder={"Банк: Хаан банк\nДансны дугаар: 5001234567\nДансны нэр: Б. Болд\nУтас: 8520-5258"}
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none font-mono"
              />
              <button
                onClick={async () => { await onUpdateBankInfo(bankDraft); setBankSaved(true); setTimeout(() => setBankSaved(false), 2000); }}
                className="w-full bg-primary text-white py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors"
                style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
              >
                {bankSaved ? "✓ Хадгалагдлаа" : "Хадгалах"}
              </button>
            </div>
            {bankDraft && (
              <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-green-400">Урьдчилан харах</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{bankDraft}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "add-operator" && (
        <OperatorModal onSave={onAddOperator} onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit-operator" && (
        <OperatorModal
          initial={modal.item}
          onSave={(data) => onUpdateOperator(modal.item.id, data)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "add-courier" && (
        <CourierModal onSave={onAddCourier} onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit-courier" && (
        <CourierModal
          initial={modal.item}
          onSave={(data) => onUpdateCourier(modal.item.id, data)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "add-partner" && (
        <PartnerModal onSave={onAddPartner} onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit-partner" && (
        <PartnerModal
          initial={modal.item}
          onSave={(data) => onUpdatePartner(modal.item.id, data)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmDelete
          name={modal.name}
          onConfirm={() =>
            modal.role === "operator" ? onDeleteOperator(modal.id) :
            modal.role === "courier" ? onDeleteCourier(modal.id) :
            onDeletePartner(modal.id)
          }
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
