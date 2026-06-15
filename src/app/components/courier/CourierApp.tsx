import { useState } from "react";
import { MapPin, Package, Phone, CheckCircle, LogOut, Star, TrendingUp, ChevronRight, Navigation } from "lucide-react";
import type { Order, CourierUser } from "../shared/types";

interface CourierAppProps {
  orders: Order[];
  courierId: string;
  courierName: string;
  courierInfo?: CourierUser;
  onPickup: (orderId: string) => void;
  onDeliver: (orderId: string) => void;
  onLogout: () => void;
}

const VEHICLE_ICON: Record<string, string> = { мотоцикл: "🏍️", автомашин: "🚗", дугуй: "🚲", мопед: "🛵" };

export function CourierApp({ orders, courierId, courierName, courierInfo, onPickup, onDeliver, onLogout }: CourierAppProps) {
  const [tab, setTab] = useState<"active" | "done">("active");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"авах" | "хүргэх" | null>(null);

  const courier = courierInfo;

  const myOrders = orders.filter((o) => o.courierId === courierId);
  const activeOrders = myOrders.filter((o) => o.status === "томилогдсон" || o.status === "авсан");
  const doneOrders = myOrders.filter((o) => o.status === "хүргэгдсэн");

  const todayEarnings = doneOrders.reduce((sum, o) => sum + Math.round(o.price * 0.8), 0);

  function handleConfirm() {
    if (!confirmId || !confirmAction) return;
    if (confirmAction === "авах") onPickup(confirmId);
    else onDeliver(confirmId);
    setConfirmId(null);
    setConfirmAction(null);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>
            {courierName[0]}
          </div>
          <div>
            <p className="text-sm font-medium leading-none">{courierName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs text-muted-foreground">{courier?.rating} · {courier?.vehicle && VEHICLE_ICON[courier.vehicle]}</span>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="max-w-sm mx-auto w-full px-4 py-4 space-y-4">
        {/* Today stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Идэвхтэй", value: activeOrders.length, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
            { label: "Хүргэсэн", value: doneOrders.length, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
            { label: "Өнөөдрийн орлого", value: `₮${Math.round(todayEarnings / 1000)}K`, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border rounded-xl p-2.5 text-center`}>
              <p className={`text-lg font-bold font-mono ${s.color}`} style={{ fontFamily: "'Roboto Slab', serif" }}>{s.value}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active orders — PRIMARY FOCUS */}
        {tab === "active" && (
          <div className="space-y-3">
            {activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Package className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Одоогоор захиалга байхгүй</p>
                <p className="text-xs text-muted-foreground mt-1">Оператор захиалга томилоход энд харагдана</p>
              </div>
            ) : (
              activeOrders.map((order) => {
                const isAssigned = order.status === "томилогдсон";
                const isPicked = order.status === "авсан";

                return (
                  <div key={order.id} className={`bg-card rounded-2xl overflow-hidden border ${isAssigned ? "border-amber-500/40" : "border-primary/40"}`}>
                    {/* Status banner */}
                    <div className={`px-4 py-2 flex items-center justify-between ${isAssigned ? "bg-amber-500/10" : "bg-primary/10"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isAssigned ? "bg-amber-400" : "bg-primary"}`} />
                        <span className={`text-xs font-medium ${isAssigned ? "text-amber-400" : "text-primary"}`}>
                          {isAssigned ? "Авахаар явна уу" : "Хүргэж байна"}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">#{order.id}</span>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Route */}
                      <div className="space-y-3">
                        <div className="flex gap-3 items-start">
                          <div className="shrink-0 mt-1">
                            {isAssigned ? (
                              <div className="w-3 h-3 rounded-full bg-green-400" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">{isAssigned ? "Авах хаяг" : "✓ Авсан хаяг"}</p>
                            <p className={`text-sm font-medium ${!isAssigned ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {order.fromAddress}
                            </p>
                            {order.fromDetail && order.fromDetail !== order.fromAddress && (
                              <p className="text-xs text-muted-foreground">{order.fromDetail}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3 items-start">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isPicked ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Хүргэх хаяг</p>
                            <p className="text-sm font-medium text-foreground">{order.toAddress}</p>
                            {order.toDetail && order.toDetail !== order.toAddress && (
                              <p className="text-xs text-muted-foreground">{order.toDetail}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Package note */}
                      {order.packageNote && order.packageNote !== "Тэмдэглэлгүй" && (
                        <div className="flex gap-2 items-center bg-secondary/50 rounded-xl px-3 py-2">
                          <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground">{order.packageNote}</p>
                        </div>
                      )}

                      {/* Customer contact */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Захиалагч</p>
                          <p className="text-sm font-medium">{order.customerName}</p>
                        </div>
                        <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-lg text-sm hover:text-primary hover:border-primary/50 transition-colors">
                          <Phone className="w-3.5 h-3.5" /> Залгах
                        </a>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-2">
                        <span className="text-xs text-muted-foreground">Таны орлого</span>
                        <span className="font-bold text-primary font-mono" style={{ fontFamily: "'Roboto Slab', serif" }}>
                          ₮{Math.round(order.price * 0.8).toLocaleString()}
                        </span>
                      </div>

                      {/* ACTION BUTTONS — MINIMAL */}
                      <div className="flex gap-2">
                        <a
                          href={`https://maps.google.com?q=${encodeURIComponent(isAssigned ? (order.fromDetail || order.fromAddress) : (order.toDetail || order.toAddress))}`}
                          className="flex items-center gap-1.5 border border-border px-3 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>

                        {isAssigned && (
                          <button
                            onClick={() => { setConfirmId(order.id); setConfirmAction("авах"); }}
                            className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                            style={{ fontFamily: "'Roboto Slab', serif" }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Ачаа авлаа
                          </button>
                        )}

                        {isPicked && (
                          <button
                            onClick={() => { setConfirmId(order.id); setConfirmAction("хүргэх"); }}
                            className="flex-1 bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            style={{ fontFamily: "'Roboto Slab', serif" }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Хүргэлт дуусгах
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Done orders */}
        {tab === "done" && (
          <div className="space-y-2">
            {doneOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Өнөөдөр хүргэлт байхгүй байна</p>
              </div>
            ) : (
              doneOrders.map((o) => (
                <div key={o.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-40">{o.toAddress}</p>
                      <p className="text-xs text-muted-foreground">{o.deliveredAt}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-green-400">+₮{Math.round(o.price * 0.8).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom tab */}
      <div className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-sm mx-auto flex">
          {([
            { key: "active", label: "Захиалгууд", icon: Package, badge: activeOrders.length },
            { key: "done", label: "Дууссан", icon: CheckCircle, badge: 0 },
          ] as const).map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 relative transition-colors ${tab === key ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/4 w-4 h-4 bg-primary rounded-full text-white flex items-center justify-center" style={{ fontSize: "0.6rem" }}>{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmId && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-center" style={{ fontFamily: "'Roboto Slab', serif", fontSize: "1.1rem" }}>
              {confirmAction === "авах" ? "Ачаа авсныг баталгаажуулах" : "Хүргэлт дуусгах"}
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {confirmAction === "авах"
                ? "Та ачааг хүлээн авсан тул захиалагч болон операторт мэдэгдэнэ."
                : "Та амжилттай хүргэсэн тул орлого нэмэгдэнэ."}
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmId(null); setConfirmAction(null); }} className="flex-1 border border-border py-3 rounded-xl text-sm hover:border-primary/50 transition-colors">
                Цуцлах
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-medium transition-colors ${confirmAction === "авах" ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/90"}`}
                style={{ fontFamily: "'Roboto Slab', serif" }}
              >
                {confirmAction === "авах" ? "Авлаа" : "Хүргэлээ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
