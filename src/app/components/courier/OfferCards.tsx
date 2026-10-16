import { useState } from "react";
import { motion } from "motion/react";
import { MapPin, Navigation, Loader2, Zap, HandHelping, AlertTriangle } from "lucide-react";
import type { Order } from "../shared/types";
import { serviceById } from "../customer/services";

export interface Offer {
  order: Order;
  /** Хүргэгчээс авах цэг хүртэл (км) */
  kmToPickup: number | null;
}

interface OfferCardsProps {
  offers: Offer[];
  onClaim: (orderId: string) => Promise<boolean>;
}

/** Хүргэгчийн орлогын хувь — CourierApp-тэй ижил */
const COURIER_SHARE = 0.8;

/** Хамгийн ойрын хүргэгчдэд ирсэн санал — эхэлж "Авах" дарсан нь авна */
export function OfferCards({ offers, onClaim }: OfferCardsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [lost, setLost] = useState<string | null>(null);

  async function claim(id: string) {
    setBusy(id);
    setLost(null);
    try {
      const ok = await onClaim(id);
      if (!ok) setLost(id);
    } catch {
      setLost(id);
    } finally {
      setBusy(null);
    }
  }

  if (offers.length === 0 && !lost) return null;

  return (
    <section className="space-y-2.5" aria-label="Шинэ санал">
      <div className="flex items-center gap-2">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-70" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-primary" />
        </span>
        <p className="font-bold">Шинэ санал</p>
        <span className="text-xs text-muted-foreground">эхэлж дарсан нь авна</span>
      </div>
      {lost && <p className="text-xs text-muted-foreground bg-secondary rounded-xl px-3 py-2">Энэ захиалгыг өөр хүргэгч авчихлаа.</p>}
      {offers.map(({ order: o, kmToPickup }) => {
        const sv = serviceById(o.serviceId);
        return (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border-2 border-primary rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{sv?.label ?? "Хүргэлт"}{o.distance > 0 ? ` · ${o.distance.toFixed(1)} км зам` : ""}</p>
                <p className="text-2xl font-extrabold tabular mt-0.5">₮{Math.round(o.price * COURIER_SHARE).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">таны орлого</p>
              </div>
              {kmToPickup != null && (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold bg-primary/10 text-primary px-2.5 py-1.5 rounded-xl">
                  <Navigation className="w-3.5 h-3.5" /> {kmToPickup < 1 ? `${Math.round(kmToPickup * 1000)} м` : `${kmToPickup.toFixed(1)} км`}
                </span>
              )}
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="flex items-start gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 shrink-0" /><span className="min-w-0">{o.fromDetail || o.fromAddress}</span></p>
              <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-primary mt-1 shrink-0" /><span className="min-w-0">{o.toDetail || o.toAddress}</span></p>
            </div>
            {(o.urgent || o.handToHand || o.fragile) && (
              <div className="flex flex-wrap gap-1.5">
                {o.urgent && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/12 text-red-600 dark:text-red-300"><Zap className="w-3 h-3" /> Яаралтай</span>}
                {o.handToHand && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/12 text-violet-600 dark:text-violet-300"><HandHelping className="w-3 h-3" /> Гараас гарт</span>}
                {o.fragile && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-700 dark:text-amber-300"><AlertTriangle className="w-3 h-3" /> Хэврэг</span>}
              </div>
            )}
            <button
              onClick={() => void claim(o.id)}
              disabled={busy !== null}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Авах"}
            </button>
          </motion.div>
        );
      })}
    </section>
  );
}
