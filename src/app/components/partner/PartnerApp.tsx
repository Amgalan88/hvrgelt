import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Plus, Pencil, Trash2, LogOut, QrCode, Camera, Loader2, Package, Sun, Moon, X, Check } from "lucide-react";
import type { PartnerProduct } from "../shared/types";
import type { Partner } from "../customer/partners";
import { useUser } from "../shared/UserContext";
import { Logo } from "../shared/Logo";
import { storePhoto } from "../../lib/photo";

interface PartnerAppProps {
  partner?: Partner & { paymentQrUrl?: string };
  products: PartnerProduct[];
  onAddProduct: (data: Omit<PartnerProduct, "id">) => Promise<void>;
  onUpdateProduct: (id: string, data: Partial<Omit<PartnerProduct, "id" | "partnerId">>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onSaveQr: (url: string) => Promise<void>;
  onLogout: () => void;
}

/**
 * Партнёр дэлгүүрийн портал — хүргэлтээр гарах боломжтой барааныхаа
 * жагсаалтыг үнэтэй нь өөрсдөө оруулна. Барааны төлбөрийг газартаа
 * төлөх QR-аа мөн энд байршуулна (хүргэлтийн төлбөр тусдаа).
 */
export function PartnerApp({ partner, products, onAddProduct, onUpdateProduct, onDeleteProduct, onSaveQr, onLogout }: PartnerAppProps) {
  const { theme, toggleTheme } = useUser();
  const [tab, setTab] = useState<"products" | "qr">("products");

  const [editing, setEditing] = useState<PartnerProduct | null>(null);
  const [adding, setAdding] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("ш");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const [qrBusy, setQrBusy] = useState(false);

  function openAdd() {
    setEditing(null);
    setName(""); setPrice(""); setUnit("ш"); setImageUrl(undefined);
    setError("");
    setAdding(true);
  }

  function openEdit(p: PartnerProduct) {
    setEditing(p);
    setName(p.name); setPrice(String(p.price)); setUnit(p.unit); setImageUrl(p.imageUrl);
    setError("");
    setAdding(true);
  }

  async function pickImage(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      setImageUrl(await storePhoto(file));
    } catch {
      setError("Зураг хавсаргахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!partner || busy) return;
    if (!name.trim()) { setError("Барааны нэрээ бичнэ үү."); return; }
    setBusy(true);
    setError("");
    try {
      const data = {
        name: name.trim(),
        price: Math.max(0, parseInt(price, 10) || 0),
        unit: unit.trim() || "ш",
        imageUrl,
        inStock: editing?.inStock ?? true,
        sort: editing?.sort ?? products.length,
      };
      if (editing) await onUpdateProduct(editing.id, data);
      else await onAddProduct({ partnerId: partner.id, ...data });
      setAdding(false);
    } catch {
      setError("Хадгалахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  async function pickQr(file?: File) {
    if (!file) return;
    setQrBusy(true);
    try {
      await onSaveQr(await storePhoto(file));
    } catch {
      /* алдааг доор харуулна */
    } finally {
      setQrBusy(false);
    }
  }

  if (!partner) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Package className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Таны байгууллагын мэдээлэл олдсонгүй. Админтай холбогдоно уу.</p>
        <button onClick={onLogout} className="text-sm text-primary underline">Гарах</button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <Logo size="sm" />
            <p className="text-xs text-primary leading-none ml-10">{partner.emoji} {partner.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={onLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-4 space-y-4 pb-24">
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          {([
            { key: "products", label: `Бараа (${products.length})` },
            { key: "qr", label: "Төлбөрийн QR" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${tab === t.key ? "bg-card text-foreground border border-border" : "text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <>
            <div className="bg-primary/10 border border-primary/25 rounded-2xl p-3.5">
              <p className="text-xs text-foreground/80 leading-relaxed">
                Хүргэлтээр гарах боломжтой барааныхаа жагсаалтыг үнэтэй нь оруулна уу.
                Үйлчлүүлэгч эдгээрийг сагсандаа хийж захиална.
              </p>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Бараа оруулаагүй байна</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-primary font-mono mt-0.5">₮{p.price.toLocaleString()} / {p.unit}</p>
                      <button
                        onClick={() => onUpdateProduct(p.id, { inStock: !p.inStock })}
                        className={`text-[11px] mt-1 px-2 py-0.5 rounded-full border ${
                          p.inStock
                            ? "bg-green-500/15 border-green-500/30 text-green-500"
                            : "bg-secondary border-border text-muted-foreground"
                        }`}
                      >
                        {p.inStock ? "Байгаа" : "Дууссан"}
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteProduct(p.id)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={openAdd}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
            >
              <Plus className="w-4 h-4" /> Бараа нэмэх
            </button>
          </>
        )}

        {tab === "qr" && (
          <div className="space-y-3">
            <div className="bg-primary/10 border border-primary/25 rounded-2xl p-3.5">
              <p className="text-xs text-foreground/80 leading-relaxed">
                Барааны төлбөрийг үйлчлүүлэгч тан дээр төлнө. Энд байршуулсан QR
                захиалгын дэлгэц дээр харагдана. Хүргэлтийн төлбөр үүнээс тусдаа.
              </p>
            </div>
            <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickQr(e.target.files?.[0])} />
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Төлбөр хүлээн авах QR</p>
              </div>
              {partner.paymentQrUrl ? (
                <img src={partner.paymentQrUrl} alt="Төлбөрийн QR" className="w-48 h-48 mx-auto rounded-xl bg-white p-2 border border-border" />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">QR байршуулаагүй байна</p>
              )}
              <button
                onClick={() => qrRef.current?.click()}
                disabled={qrBusy}
                className="w-full border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {qrBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {partner.paymentQrUrl ? "QR солих" : "QR байршуулах"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Бараа нэмэх / засах */}
      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setAdding(false)}>
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-card border border-border rounded-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>
                {editing ? "Бараа засах" : "Бараа нэмэх"}
              </h3>
              <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="" className="w-full h-36 object-cover rounded-xl border border-border" />
                  <button onClick={() => setImageUrl(undefined)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => imgRef.current?.click()}
                  disabled={busy}
                  className="w-full border border-dashed border-border rounded-xl py-5 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  <span className="text-xs">Барааны зураг</span>
                </button>
              )}

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Барааны нэр</label>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder="Сүү 1л"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1.5">Үнэ (₮)</label>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    placeholder="3500"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-muted-foreground block mb-1.5">Хэмжих нэгж</label>
                  <input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ш"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={save}
                disabled={busy}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Хадгалах
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
