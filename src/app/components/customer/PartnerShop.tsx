import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, Plus, Minus, ShoppingBasket, Package, QrCode } from "lucide-react";
import type { BasketItem, PartnerProduct } from "../shared/types";
import type { Partner } from "./partners";

interface PartnerShopProps {
  partner: Partner;
  products: PartnerProduct[];
  initial: BasketItem[];
  onClose: () => void;
  onConfirm: (items: BasketItem[]) => void;
}

/**
 * Партнёр дэлгүүрийн барааны жагсаалт — сагслах цонх.
 * Барааны төлбөрийг үйлчлүүлэгч тухайн газарт QR-аар төлнө,
 * хүргэлтийн төлбөр манай системд тусдаа тооцогдоно.
 */
export function PartnerShop({ partner, products, initial, onClose, onConfirm }: PartnerShopProps) {
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(initial.map((i) => [i.productId, i.qty])),
  );

  const inStock = products.filter((p) => p.inStock);

  const items: BasketItem[] = useMemo(
    () =>
      inStock
        .filter((p) => (qty[p.id] ?? 0) > 0)
        .map((p) => ({ productId: p.id, name: p.name, price: p.price, qty: qty[p.id] })),
    [inStock, qty],
  );
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  function bump(id: string, d: number) {
    setQty((q) => {
      const next = Math.max(0, (q[id] ?? 0) + d);
      return { ...q, [id]: next };
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold truncate" style={{ fontFamily: "'Roboto Slab', serif" }}>
              {partner.emoji} {partner.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Барааг сагсандаа нэмнэ үү</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {inStock.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Энэ газар бараагаа хараахан оруулаагүй байна</p>
              <p className="text-xs mt-1">Хаягийг нь сонгоод энгийн хүргэлт захиалж болно.</p>
            </div>
          ) : (
            inStock.map((p) => {
              const n = qty[p.id] ?? 0;
              return (
                <div key={p.id} className="flex items-center gap-3 bg-secondary/40 border border-border rounded-2xl p-2.5">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-primary font-mono mt-0.5">₮{p.price.toLocaleString()} / {p.unit}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => bump(p.id, -1)}
                      disabled={n === 0}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Хасах"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-mono">{n}</span>
                    <button
                      onClick={() => bump(p.id, 1)}
                      className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                      aria-label="Нэмэх"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3 shrink-0">
          {partner.paymentQrUrl && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <QrCode className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Барааны төлбөрийг тухайн газарт QR-аар төлнө. Хүргэлтийн төлбөр тусдаа.
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Барааны дүн</span>
            <span className="text-lg font-bold text-primary" style={{ fontFamily: "'Roboto Slab', serif" }}>
              ₮{total.toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => onConfirm(items)}
            disabled={items.length === 0}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-40"
            style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
          >
            <ShoppingBasket className="w-4 h-4" />
            {items.length > 0 ? `${items.length} бараа · Үргэлжлүүлэх` : "Бараа сонгоно уу"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
