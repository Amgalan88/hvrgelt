import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { QrCode, Loader2, CheckCircle, Landmark, RefreshCw } from "lucide-react";
import type { Order } from "../shared/types";
import type { PaymentIntent } from "../shared/store";

interface PaymentPanelProps {
  order: Order;
  bankInfo: string;
  createPayment: (orderId: string, amount: number) => Promise<PaymentIntent>;
  onPaid: (method: string) => void;
}

/**
 * Үнэ батлагдсаны дараах төлбөрийн алхам.
 *
 * VITE_PAYMENT_PROVIDER тохируулсан бол create-payment Edge Function
 * QPay/Bonum-ийн QR-ыг буцаана. Тохируулаагүй бол гарын авлагын горим:
 * дансны мэдээлэл харуулж, үйлчлүүлэгч төлснөө мэдэгдэнэ (оператор шалгана).
 */
export function PaymentPanel({ order, bankInfo, createPayment, onPaid }: PaymentPanelProps) {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    createPayment(order.id, order.price)
      .then((r) => alive && setIntent(r))
      .catch(() => alive && setIntent({ provider: "manual", manual: true }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // Захиалга бүрт нэг л удаа нэхэмжлэх үүсгэнэ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  async function confirmPaid() {
    if (confirming) return;
    setConfirming(true);
    try {
      await onPaid(intent?.manual === false ? intent.provider : "гарын авлага");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground">Төлөх дүн</p>
        <p className="text-3xl font-bold text-primary mt-0.5" style={{ fontFamily: "'Roboto Slab', serif" }}>
          ₮{order.price.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Төлбөр орсны дараа жолооч хуваарилагдана</p>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Нэхэмжлэх үүсгэж байна...</p>
        </div>
      ) : intent && !intent.manual ? (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">{intent.provider.toUpperCase()}-ээр төлөх</p>
          </div>
          {intent.qrImage ? (
            <img
              src={intent.qrImage.startsWith("data:") ? intent.qrImage : `data:image/png;base64,${intent.qrImage}`}
              alt="Төлбөрийн QR"
              className="w-48 h-48 mx-auto rounded-xl bg-white p-2"
            />
          ) : null}
          {intent.checkoutUrl && (
            <a
              href={intent.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center bg-primary text-primary-foreground py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors"
              style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
            >
              Банкны аппаар төлөх
            </a>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Төлбөр орсныг систем автоматаар шалгана. Хэдэн секунд болж магадгүй.
          </p>
          <button
            onClick={confirmPaid}
            disabled={confirming}
            className="w-full border border-border text-muted-foreground py-2.5 rounded-xl text-sm hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${confirming ? "animate-spin" : ""}`} /> Төлбөрөө шалгах
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Дансаар шилжүүлэх</p>
          </div>
          {bankInfo ? (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-secondary/40 rounded-xl p-3 leading-relaxed">
              {bankInfo}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">
              Оператор тантай холбогдож төлбөрийн мэдээллийг өгнө.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Гүйлгээний утга дээр захиалгын дугаар <span className="text-foreground font-medium">{order.id}</span>-г бичнэ үү.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={confirmPaid}
            disabled={confirming}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
          >
            <CheckCircle className="w-4 h-4" /> Төлбөр төлсөн
          </motion.button>
          <p className="text-[11px] text-amber-500/80 text-center">
            Оператор төлбөрийг шалгаж баталгаажуулна.
          </p>
        </div>
      )}
    </div>
  );
}
