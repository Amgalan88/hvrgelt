import { useState } from "react";
import { MapPin, ArrowRight, Package, ChevronRight, Star, Clock, CheckCircle, Circle, Truck, Phone, X } from "lucide-react";
import type { Order, OrderStatus } from "./shared/types";

type Step = "form" | "confirm" | "tracking";

interface CustomerAppProps {
  orders: Order[];
  onAddOrder: (order: Omit<Order, "id" | "createdAt" | "status">) => string;
  myOrderId: string | null;
  setMyOrderId: (id: string | null) => void;
}

const POPULAR: [string, string][] = [
  ["Баянзүрх, 3-р хороо", "Хан-Уул, Зайсан"],
  ["Сүхбаатар, Энхтайван", "Баянгол, 6-р хороо"],
  ["Чингэлтэй, 2-р хороо", "Сонгинохайрхан, 20-р хороо"],
];

const STEP_INFO: { key: OrderStatus; label: string }[] = [
  { key: "шинэ", label: "Захиалга хүлээж байна" },
  { key: "хүлээж_авсан", label: "Куриер томилогдлоо" },
  { key: "замдаа", label: "Замдаа байна" },
  { key: "хүргэгдсэн", label: "Хүргэгдсэн" },
];

function calcPrice(from: string, to: string) {
  const base = 5000;
  const dist = Math.floor(Math.random() * 20 + 5);
  return { price: base + dist * 400, distance: dist };
}

export function CustomerApp({ orders, onAddOrder, myOrderId, setMyOrderId }: CustomerAppProps) {
  const [step, setStep] = useState<Step>(myOrderId ? "tracking" : "form");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [estimated, setEstimated] = useState<{ price: number; distance: number } | null>(null);

  const myOrder = orders.find((o) => o.id === myOrderId);

  function handleEstimate() {
    if (!from.trim() || !to.trim()) return;
    setEstimated(calcPrice(from, to));
    setStep("confirm");
  }

  function handleConfirm() {
    if (!estimated) return;
    const id = onAddOrder({
      fromAddress: from,
      toAddress: to,
      packageNote: note || "Тайлбаргүй",
      price: estimated.price,
      distance: estimated.distance,
      customerName: "Та",
      customerPhone: "9900-0000",
    });
    setMyOrderId(id);
    setStep("tracking");
  }

  function handleNewOrder() {
    setMyOrderId(null);
    setFrom("");
    setTo("");
    setNote("");
    setEstimated(null);
    setStep("form");
  }

  const statusIdx = myOrder ? STEP_INFO.findIndex((s) => s.key === myOrder.status) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1rem" }}>
            Шуурхай<span className="text-primary">.</span>mn
          </span>
        </div>
        {myOrder && step === "tracking" && (
          <button onClick={handleNewOrder} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Шинэ захиалга
          </button>
        )}
      </header>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-6">
        {/* FORM step */}
        {step === "form" && (
          <div className="space-y-5">
            <div>
              <h1 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.6rem", lineHeight: 1.2 }}>
                Хаашаа<br />хүргэх вэ?
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Хаяг оруулаад үнийг шалгаарай</p>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                <input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="Авах хаяг"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {from && (
                  <button onClick={() => setFrom("")} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Хүргэх хаяг"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {to && (
                  <button onClick={() => setTo("")} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Илгээмжийн тэмдэглэл (заавал биш)"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Popular routes */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Түгээмэл чиглэлүүд</p>
              <div className="space-y-2">
                {POPULAR.map(([f, t]) => (
                  <button
                    key={f + t}
                    onClick={() => { setFrom(f); setTo(t); }}
                    className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 hover:border-primary/40 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{f}</p>
                      <p className="text-xs text-foreground truncate">{t}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleEstimate}
              disabled={!from.trim() || !to.trim()}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <span style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}>Үнэ шалгах</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CONFIRM step */}
        {step === "confirm" && estimated && (
          <div className="space-y-5">
            <button onClick={() => setStep("form")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              ← Буцах
            </button>

            <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.4rem" }}>
              Захиалгаа баталгаажуулах
            </h2>

            {/* Route summary */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex gap-3 items-start">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <div className="w-px h-6 bg-border" />
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Авах хаяг</p>
                    <p className="text-sm text-foreground">{from}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Хүргэх хаяг</p>
                    <p className="text-sm text-foreground">{to}</p>
                  </div>
                </div>
              </div>
              {note && (
                <div className="flex gap-2 items-center pt-1 border-t border-border">
                  <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">{note}</p>
                </div>
              )}
            </div>

            {/* Price card */}
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Хүргэлтийн үнэ</span>
                <span className="text-xs text-muted-foreground font-mono">{estimated.distance} км</span>
              </div>
              <div className="text-3xl font-bold text-primary" style={{ fontFamily: "'Roboto Slab', serif" }}>
                ₮{estimated.price.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Дундажаар 25–40 минутад хүргэнэ</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">Захиалга илгээсний дараа оператор куриер томилно. Та куриерийн мэдээллийг шууд авна.</p>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <span style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}>Захиалах</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TRACKING step */}
        {step === "tracking" && myOrder && (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">Захиалга #{myOrder.id}</p>
              <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.3rem" }}>
                {myOrder.status === "хүргэгдсэн" ? "Хүргэгдлээ!" : "Захиалгын явц"}
              </h2>
            </div>

            {/* Progress steps */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="space-y-0">
                {STEP_INFO.map((s, i) => {
                  const done = i <= statusIdx;
                  const active = i === statusIdx;
                  const isLast = i === STEP_INFO.length - 1;
                  return (
                    <div key={s.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${done ? "bg-primary border-primary" : "bg-secondary border-border"}`}>
                          {done && !active ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : active ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        {!isLast && <div className={`w-0.5 h-8 ${i < statusIdx ? "bg-primary" : "bg-border"}`} />}
                      </div>
                      <div className={`pb-8 ${isLast ? "pb-0" : ""} pt-1`}>
                        <p className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"} ${active ? "font-medium" : ""}`}>
                          {s.label}
                        </p>
                        {active && myOrder.status === "хүлээж_авсан" && myOrder.courierName && (
                          <p className="text-xs text-primary mt-0.5">{myOrder.courierName} · {myOrder.eta} хүртэл</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier info */}
            {myOrder.courierName && myOrder.status !== "шинэ" && (
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>
                    {myOrder.courierName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{myOrder.courierName}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>Таны куриер</span>
                    </div>
                  </div>
                </div>
                <a href={`tel:${myOrder.courierPhone}`} className="flex items-center gap-1.5 border border-border text-foreground px-3 py-1.5 rounded-lg text-sm hover:border-primary/50 hover:text-primary transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  Залгах
                </a>
              </div>
            )}

            {myOrder.status === "шинэ" && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <p className="text-xs text-amber-400">Оператор таны захиалгыг хүлээн авч куриер томилж байна...</p>
              </div>
            )}

            {/* Route summary */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex gap-2 items-center text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-muted-foreground truncate">{myOrder.fromAddress}</span>
              </div>
              <div className="flex gap-2 items-center text-sm">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground truncate">{myOrder.toAddress}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-xs text-muted-foreground">Захиалсан цаг</span>
                <span className="text-xs font-mono text-foreground">{myOrder.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Үнэ</span>
                <span className="text-sm font-bold text-primary font-mono">₮{myOrder.price.toLocaleString()}</span>
              </div>
            </div>

            {myOrder.status === "хүргэгдсэн" && (
              <button onClick={handleNewOrder} className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl hover:bg-primary/90 transition-colors" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}>
                Шинэ захиалга өгөх
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
