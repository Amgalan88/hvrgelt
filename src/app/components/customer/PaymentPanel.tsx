import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { QrCode, Loader2, CheckCircle, Landmark, RefreshCw, FlaskConical, X } from "lucide-react";
import type { Order } from "../shared/types";
import type { PaymentIntent } from "../shared/store";
import type { QpayBank } from "../../lib/mockQpay";

interface PaymentPanelProps {
  order: Order;
  bankInfo: string;
  createPayment: (orderId: string, amount: number, opts?: { test?: boolean }) => Promise<PaymentIntent>;
  /** Сервер дээр төлбөр орсон эсэхийг шалгана — true бол төлөгдсөн */
  checkPayment: (paymentId: string, opts?: { test?: boolean }) => Promise<boolean>;
  /** Туршилтын QPay (жинхэнэ мөнгө шилжихгүй) */
  test?: boolean;
  onPaid: (method: string) => void;
}

/**
 * Үнэ батлагдсаны дараах төлбөрийн алхам.
 *
 * - QPay/Bonum (VITE_PAYMENT_PROVIDER): create-payment Edge Function QR болон
 *   банкуудын жагсаалтыг буцаана. Төлбөрийг payment-webhook баталгаажуулна.
 * - Туршилтын QPay (test): бүтэц нь жинхэнэтэй ижил, банкны апп-ын оронд
 *   туршилтын цонх нээгдэнэ.
 * - Гарын авлага: дансны мэдээлэл харуулна.
 */
export function PaymentPanel({ order, bankInfo, createPayment, checkPayment, test = false, onPaid }: PaymentPanelProps) {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [checkMsg, setCheckMsg] = useState("");
  const [testBank, setTestBank] = useState<QpayBank | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    createPayment(order.id, order.price, { test })
      .then((r) => alive && setIntent(r))
      .catch(() => alive && setIntent({ provider: "manual", manual: true }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // Захиалга бүрт нэг л удаа нэхэмжлэх үүсгэнэ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  /** Гарын авлагын горим — үйлчлүүлэгч төлснөө мэдэгдэнэ */
  async function confirmManual() {
    if (confirming) return;
    setConfirming(true);
    try {
      await onPaid("гарын авлага");
    } finally {
      setConfirming(false);
    }
  }

  /** QPay — төлөгдсөн гэж өөрөө тэмдэглэхгүй, сервер дээр шалгуулна */
  async function checkQpay() {
    if (confirming || !intent?.paymentId) return;
    setConfirming(true);
    setCheckMsg("");
    try {
      const paid = await checkPayment(intent.paymentId, { test: intent.test });
      if (!paid) setCheckMsg("Төлбөр хараахан ороогүй байна. Банкны апп-аар төлсний дараа дахин шалгана уу.");
    } finally {
      setConfirming(false);
    }
  }

  function openBank(bank: QpayBank) {
    if (intent?.test) setTestBank(bank);
    else window.location.href = bank.link;
  }

  const qrSrc = intent?.qrImage
    ? intent.qrImage.startsWith("data:") ? intent.qrImage : `data:image/png;base64,${intent.qrImage}`
    : null;

  return (
    <div className="space-y-3">
      <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground">Төлөх дүн</p>
        <p className="text-3xl font-bold text-primary mt-0.5 tabular">₮{order.price.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">Төлбөр орсны дараа хүргэгч хуваарилагдана</p>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Нэхэмжлэх үүсгэж байна...</p>
        </div>
      ) : intent && !intent.manual ? (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">{intent.provider.toUpperCase()}-ээр төлөх</p>
            </div>
            {intent.test && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <FlaskConical className="w-3 h-3" /> ТУРШИЛТ
              </span>
            )}
          </div>

          {qrSrc && (
            <div className="text-center">
              <img src={qrSrc} alt="Төлбөрийн QR" className="w-48 h-48 mx-auto rounded-2xl bg-white p-2 border border-border" />
              {intent.invoiceId && (
                <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">Нэхэмжлэх {intent.invoiceId}</p>
              )}
            </div>
          )}

          {/* Банк бүрийн апп руу — QPay-ийн urls[] */}
          {intent.banks && intent.banks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Эсвэл банкны апп-аа сонгоно уу</p>
              <div className="grid grid-cols-4 gap-2">
                {intent.banks.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => openBank(b)}
                    className="flex flex-col items-center gap-1.5 rounded-xl p-2 hover:bg-secondary transition-colors"
                  >
                    {b.logo ? (
                      <img src={b.logo} alt="" className="w-11 h-11 rounded-xl object-cover" />
                    ) : (
                      <span className="w-11 h-11 rounded-xl bg-secondary border border-border flex items-center justify-center text-sm font-bold">
                        {b.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="text-[11px] leading-tight text-center line-clamp-2">{b.name.replace(" банк", "")}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : intent.checkoutUrl ? (
            <a
              href={intent.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Банкны апп-аар төлөх
            </a>
          ) : null}

          <button
            onClick={checkQpay}
            disabled={confirming || !intent.paymentId}
            className="w-full border border-border text-muted-foreground py-3 rounded-xl text-sm font-semibold hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${confirming ? "animate-spin" : ""}`} /> Төлбөрөө шалгах
          </button>
          {checkMsg && <p className="text-xs text-amber-600 dark:text-amber-400 text-center">{checkMsg}</p>}
          <p className="text-[11px] text-muted-foreground text-center">
            {intent.test
              ? "Туршилтын горим — жинхэнэ мөнгө шилжихгүй. Банк сонгоод төлбөрийг дуурайна."
              : "Төлбөр орсныг систем автоматаар шалгана. Хэдэн секунд болж магадгүй."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Дансаар шилжүүлэх</p>
          </div>
          {bankInfo ? (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-secondary/40 rounded-xl p-3 leading-relaxed">
              {bankInfo}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">Оператор тантай холбогдож төлбөрийн мэдээллийг өгнө.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Гүйлгээний утга дээр захиалгын дугаар <span className="text-foreground font-medium">{order.id}</span>-г бичнэ үү.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={confirmManual}
            disabled={confirming}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" /> Төлбөр төлсөн
          </motion.button>
          <p className="text-[11px] text-amber-500/80 text-center">Оператор төлбөрийг шалгаж баталгаажуулна.</p>
        </div>
      )}

      {/* Туршилтын банкны апп — жинхэнэ QPay-д энэ хэсэг банкны апп өөрөө болно */}
      <TestBankSheet
        bank={testBank}
        amount={order.price}
        invoiceId={intent?.invoiceId}
        onClose={() => setTestBank(null)}
        onPay={() => onPaid("qpay-туршилт")}
      />
    </div>
  );
}

function TestBankSheet({
  bank,
  amount,
  invoiceId,
  onClose,
  onPay,
}: {
  bank: QpayBank | null;
  amount: number;
  invoiceId?: string;
  onClose: () => void;
  onPay: () => void | Promise<void>;
}) {
  const [step, setStep] = useState<"confirm" | "paying" | "done">("confirm");

  useEffect(() => {
    if (bank) setStep("confirm");
  }, [bank]);

  async function pay() {
    setStep("paying");
    // Банкны апп дээр баталгаажуулах хугацааг дуурайна
    await new Promise((r) => setTimeout(r, 1200));
    await onPay();
    setStep("done");
    setTimeout(onClose, 900);
  }

  return (
    <AnimatePresence>
      {bank && (
        <motion.div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={step === "confirm" ? onClose : undefined}
        >
          <motion.div
            className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 pb-7"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <FlaskConical className="w-3 h-3" /> ТУРШИЛТЫН БАНК
              </span>
              {step === "confirm" && (
                <button onClick={onClose} aria-label="Хаах" className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {step === "done" ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-success mx-auto" />
                <p className="text-lg font-bold mt-3">Төлбөр амжилттай</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{bank.name}</p>
                <p className="text-3xl font-extrabold mt-1 tabular">₮{amount.toLocaleString()}</p>
                <div className="mt-4 bg-secondary/60 rounded-xl p-3 text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Хүлээн авагч</span><span className="font-semibold">Дархан хүргэлт</span></div>
                  {invoiceId && <div className="flex justify-between"><span className="text-muted-foreground">Нэхэмжлэх</span><span className="font-mono text-xs">{invoiceId}</span></div>}
                </div>
                <button
                  onClick={pay}
                  disabled={step === "paying"}
                  className="mt-5 w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {step === "paying" ? <><Loader2 className="w-4 h-4 animate-spin" /> Гүйлгээ хийж байна...</> : "Төлөх"}
                </button>
                <p className="text-[11px] text-muted-foreground text-center mt-3">Жинхэнэ мөнгө шилжихгүй — зөвхөн урсгал турших зорилготой.</p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
