import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Star, Send, CheckCircle, MessageSquareHeart } from "lucide-react";
import type { Order } from "../shared/types";

interface DeliveredCelebrationProps {
  order: Order;
  userPhone: string;
  onRate: (orderId: string, score: number, comment?: string) => Promise<void>;
  onFeedback: (data: { phone: string; message: string; orderId?: string }) => Promise<void>;
  onDone: () => void;
}

/**
 * Хүргэгдсэний дараах дэлгэц: цаасан солиут + хүргэгчийн зураг,
 * жолоочийн 5 оддын үнэлгээ, дараа нь санал хүсэлтийн талбар.
 *
 * Хүргэгчийн зураг: public/mascot.png (AI-аар зурсан манай хувцастай
 * ажилчин) байвал түүнийг, үгүй бол public/mascot.svg-г харуулна.
 */
export function DeliveredCelebration({ order, userPhone, onRate, onFeedback, onDone }: DeliveredCelebrationProps) {
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [rated, setRated] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState(userPhone);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [mascot, setMascot] = useState("/mascot.png");
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#ff5a1f", "#ffb01f", "#22c55e", "#ffffff"];
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.35 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.3 }, colors }), 350);
    return () => clearTimeout(t);
  }, []);

  async function pick(n: number) {
    if (saving || rated) return;
    setScore(n);
    setSaving(true);
    try {
      await onRate(order.id, n);
      setRated(true);
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    if (sending) return;
    if (message.trim().length < 3) {
      setError("Саналаа бичнэ үү.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await onFeedback({ phone, message, orderId: order.id });
      setSent(true);
    } catch {
      setError("Илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Баяр хүргэе */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 240 }}
        className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center"
      >
        <img
          src={mascot}
          onError={() => setMascot("/mascot.svg")}
          alt="Хүргэгч"
          className="w-32 h-32 object-contain"
        />
        <h2 className="mt-2" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.4rem" }}>
          Баярлалаа! 🎉
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Таны захиалга амжилттай хүргэгдлээ. Дахин үйлчлүүлэхийг хүсэн ерөөе.
        </p>
      </motion.div>

      {/* Жолоочийн үнэлгээ */}
      <div className="bg-card border border-border rounded-2xl p-5 text-center">
        <p className="text-sm font-medium" style={{ fontFamily: "'Roboto Slab', serif" }}>
          {order.courierName ? `${order.courierName}-г үнэлнэ үү` : "Хүргэлтээ үнэлнэ үү"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Таны оноо жолоочийн урамшуулалд нөлөөлнө</p>

        <div className="flex items-center justify-center gap-1.5 mt-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.85 }}
              onClick={() => pick(n)}
              onMouseEnter={() => !rated && setHover(n)}
              onMouseLeave={() => setHover(0)}
              disabled={rated || saving}
              className="disabled:cursor-default"
              aria-label={`${n} од`}
            >
              <Star
                className={`w-9 h-9 transition-colors ${
                  n <= (hover || score) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                }`}
              />
            </motion.button>
          ))}
        </div>

        {rated && (
          <p className="text-xs text-green-500 mt-2.5 flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Үнэлгээ хадгалагдлаа. Баярлалаа!
          </p>
        )}
      </div>

      {/* Санал хүсэлт */}
      {sent ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
          <p className="text-sm font-medium mt-2">Саналыг тань хүлээн авлаа</p>
          <p className="text-xs text-muted-foreground mt-1">Бидний ажлыг сайжруулахад тусалсанд баярлалаа.</p>
        </div>
      ) : !showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-secondary/50 border border-border rounded-2xl p-4 flex items-center gap-3 text-left hover:border-primary/50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <MessageSquareHeart className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium group-hover:text-primary transition-colors">
              Бидний хамтын ажиллагаанд таны санал чухал
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Дарж саналаа үлдээнэ үү</p>
          </div>
        </button>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium" style={{ fontFamily: "'Roboto Slab', serif" }}>Санал хүсэлт</p>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Утасны дугаар</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="99000000"
              className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Санал хүсэлт</label>
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setError(""); }}
              rows={4}
              placeholder="Юуг сайжруулах вэ? Юу таалагдсан бэ?"
              className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/50"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={send}
            disabled={sending}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
          >
            <Send className="w-4 h-4" /> Илгээх
          </button>
        </div>
      )}

      <button
        onClick={onDone}
        className="w-full border border-border text-muted-foreground py-3 rounded-xl text-sm hover:text-foreground hover:border-primary/40 transition-colors"
      >
        Дуусгах
      </button>
    </div>
  );
}
