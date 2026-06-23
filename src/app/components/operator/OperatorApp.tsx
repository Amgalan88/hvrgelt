import { useState, Fragment } from "react";
import { Package, Truck, MapPin, Phone, User, ChevronDown, Bell, LogOut, CheckCircle, Clock, X, Sun, Moon, Trash2 } from "lucide-react";
import type { Order, OrderStatus, CourierUser } from "../shared/types";
import { Spinner } from "../shared/Spinner";
import { useUser } from "../shared/UserContext";
import { Logo } from "../shared/Logo";

interface OperatorAppProps {
  orders: Order[];
  couriers: CourierUser[];
  operatorName: string;
  onAssign: (orderId: string, courierId: string, price: number) => void | Promise<void>;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onLogout: () => void;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  шинэ:          "Шинэ",
  "үнэ батлах":  "Үнэ батлах хүлээж",
  томилогдсон:   "Томилогдсон",
  авсан:         "Ачаа авсан",
  хүргэгдсэн:   "Хүргэгдсэн",
  цуцлагдсан:   "Цуцлагдсан",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  шинэ:          "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "үнэ батлах":  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  томилогдсон:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  авсан:         "bg-primary/20 text-primary border-primary/30",
  хүргэгдсэн:   "bg-green-500/20 text-green-400 border-green-500/30",
  цуцлагдсан:   "bg-red-500/20 text-red-400 border-red-500/30",
};

const VEHICLE_ICON: Record<string, string> = { мотоцикл: "🏍️", автомашин: "🚗", дугуй: "🚲", мопед: "🛵" };

type FilterTab = "бүгд" | "шинэ" | "идэвхтэй" | "дууссан";

export function OperatorApp({ orders, couriers, operatorName, onAssign, onUpdateStatus, onLogout }: OperatorAppProps) {
  const [filter, setFilter] = useState<FilterTab>("шинэ");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("5000");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const { theme, toggleTheme } = useUser();

  const HIDDEN_KEY = "hvrgelt_op_hidden_cancelled";
  const [hiddenCancelled, setHiddenCancelled] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]")); }
    catch { return new Set(); }
  });

  function clearCancelled(list: Order[]) {
    const next = new Set(hiddenCancelled);
    list.forEach((o) => next.add(o.id));
    setHiddenCancelled(next);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
  }

  const newCount = orders.filter((o) => o.status === "шинэ").length;
  const activeCount = orders.filter((o) => ["томилогдсон", "авсан", "үнэ батлах"].includes(o.status)).length;
  const doneCount = orders.filter((o) => o.status === "хүргэгдсэн").length;

  const filtered = orders.filter((o) => {
    if (filter === "шинэ") return o.status === "шинэ" || o.status === "үнэ батлах";
    if (filter === "идэвхтэй") return ["томилогдсон", "авсан"].includes(o.status);
    if (filter === "дууссан") return o.status === "хүргэгдсэн" || (o.status === "цуцлагдсан" && !hiddenCancelled.has(o.id));
    return true;
  });

  const deliveredOrders = filter === "дууссан" ? filtered.filter((o) => o.status === "хүргэгдсэн") : [];
  const cancelledOrders = filter === "дууссан" ? filtered.filter((o) => o.status === "цуцлагдсан") : [];

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <Logo size="sm" />
            <p className="text-xs text-purple-400 leading-none ml-10">{operatorName} · Оператор</p>
          </div>
          <div className="flex items-center gap-3">
            {newCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full">
                <Bell className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-xs text-amber-400 font-mono">{newCount} шинэ</span>
              </div>
            )}
            <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={onLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Шинэ", value: newCount, color: "text-amber-400", ring: "border-amber-500/30 bg-amber-500/10" },
            { label: "Идэвхтэй", value: activeCount, color: "text-primary", ring: "border-primary/30 bg-primary/10" },
            { label: "Хүргэгдсэн", value: doneCount, color: "text-green-400", ring: "border-green-500/30 bg-green-500/10" },
            { label: "Хүргэгч", value: couriers.length, color: "text-blue-400", ring: "border-blue-500/30 bg-blue-500/10" },
          ].map((s) => (
            <div key={s.label} className={`${s.ring} border rounded-xl p-2.5 text-center`}>
              <p className={`text-xl font-bold font-mono ${s.color}`} style={{ fontFamily: "'Roboto Slab', serif" }}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Courier strip */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Хүргэгчдийн байдал</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {couriers.map((c) => (
              <div key={c.id} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs bg-secondary border-border text-foreground">
                <span>{VEHICLE_ICON[c.vehicle]}</span>
                <span>{c.name.split(".")[1]?.trim() ?? c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          {(["бүгд", "шинэ", "идэвхтэй", "дууссан"] as FilterTab[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-colors relative ${filter === f ? "bg-card text-foreground border border-border" : "text-muted-foreground"}`}
            >
              {f}
              {f === "шинэ" && newCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full text-white flex items-center justify-center" style={{ fontSize: "0.55rem" }}>
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Захиалга байхгүй</p>
            </div>
          )}

          {(filter === "дууссан"
            ? [...deliveredOrders, ...cancelledOrders]
            : filtered
          ).map((order, idx, arr) => {
            const expanded = expandedId === order.id;
            const canAssign = order.status === "шинэ";
            const prevStatus = idx > 0 ? arr[idx - 1].status : null;
            const showDeliveredHeader = filter === "дууссан" && order.status === "хүргэгдсэн" && prevStatus !== "хүргэгдсэн";
            const showCancelledHeader = filter === "дууссан" && order.status === "цуцлагдсан" && prevStatus !== "цуцлагдсан";

            return (
              <Fragment key={order.id}>
                {showDeliveredHeader && (
                  <p className="text-xs text-green-400 font-medium pt-1 px-0.5">✓ Хүргэгдсэн ({deliveredOrders.length})</p>
                )}
                {showCancelledHeader && (
                  <div className="flex items-center justify-between pt-2 pb-0.5 px-0.5">
                    <p className="text-xs text-red-400 font-medium">✕ Цуцлагдсан ({cancelledOrders.length})</p>
                    <button
                      onClick={() => clearCancelled(cancelledOrders)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Цэвэрлэх
                    </button>
                  </div>
                )}
              <div className={`bg-card border rounded-xl overflow-hidden ${order.status === "шинэ" ? "border-amber-500/30" : "border-border"}`}>
                {/* Row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                  onClick={() => {
                    const opening = !expanded;
                    setExpandedId(opening ? order.id : null);
                    if (opening) setPriceInput(String(order.price > 0 ? order.price : 5000));
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{order.id}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {order.fromAddress} → {order.toAddress}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {order.price > 0
                      ? <p className="text-sm font-bold text-primary font-mono">₮{order.price.toLocaleString()}</p>
                      : <p className="text-xs text-amber-400">Үнэ?</p>}
                    <p className="text-xs text-muted-foreground">{order.createdAt}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    {/* Full addresses */}
                    <div className="space-y-2">
                      <div className="flex gap-2 items-start text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Авах хаяг</p>
                          <p className="text-foreground">{order.fromAddress}</p>
                          {order.fromDetail && order.fromDetail !== order.fromAddress && (
                            <p className="text-xs text-muted-foreground">{order.fromDetail}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 items-start text-sm">
                        <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Хүргэх хаяг</p>
                          <p className="text-foreground">{order.toAddress}</p>
                          {order.toDetail && order.toDetail !== order.toAddress && (
                            <p className="text-xs text-muted-foreground">{order.toDetail}</p>
                          )}
                        </div>
                      </div>
                      {order.packageNote && order.packageNote !== "Тэмдэглэлгүй" && (
                        <div className="flex gap-2 items-center text-xs text-muted-foreground">
                          <Package className="w-3.5 h-3.5 shrink-0" />
                          {order.packageNote}
                        </div>
                      )}
                    </div>

                    {/* Customer */}
                    <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Захиалагч</p>
                          <p className="text-sm font-medium">{order.customerName}</p>
                        </div>
                      </div>
                      <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:text-primary hover:border-primary/50 transition-colors">
                        <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
                      </a>
                    </div>

                    {/* Assigned courier */}
                    {order.courierName && (
                      <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Хүргэгч</p>
                            <p className="text-sm font-medium">{order.courierName}</p>
                            {order.courierPhone && (
                              <p className="text-xs text-muted-foreground font-mono">{order.courierPhone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {order.courierPhone && (
                            <a href={`tel:${order.courierPhone}`} className="flex items-center gap-1 text-xs border border-border px-2 py-1 rounded-lg hover:text-primary hover:border-primary/50 transition-colors">
                              <Phone className="w-3 h-3" /> Залгах
                            </a>
                          )}
                          {order.eta && <p className="text-xs font-mono text-primary">~{order.eta}</p>}
                          {order.pickedUpAt && <p className="text-xs text-muted-foreground">авсан {order.pickedUpAt}</p>}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {canAssign && (
                      <div>
                        {/* Price input — operator sets the delivery price */}
                        <p className="text-xs text-muted-foreground mb-1.5">Хүргэлтийн үнэ (доод тал нь 5,000₮)</p>
                        <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-xl px-3 py-2.5 mb-3">
                          <span className="text-sm text-muted-foreground">₮</span>
                          <input
                            type="number"
                            min={5000}
                            step={500}
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-mono focus:outline-none"
                          />
                        </div>

                        <p className="text-xs text-muted-foreground mb-2">Хүргэгч томилох</p>
                        {couriers.length === 0 ? (
                          <p className="text-xs text-center text-muted-foreground py-2 border border-border rounded-xl">Хүргэгч байхгүй байна</p>
                        ) : (
                          <div className="space-y-1.5">
                            {couriers.map((c) => (
                              <button
                                key={c.id}
                                disabled={assigningId === order.id}
                                onClick={async () => {
                                  setAssigningId(order.id);
                                  try {
                                    await onAssign(order.id, c.id, Math.max(5000, parseInt(priceInput, 10) || 5000));
                                    setExpandedId(null);
                                  } finally {
                                    setAssigningId(null);
                                  }
                                }}
                                className="w-full flex items-center justify-between bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{VEHICLE_ICON[c.vehicle]}</span>
                                  <div className="text-left">
                                    <p className="text-sm font-medium">{c.name}</p>
                                    <p className="text-xs opacity-70">★{c.rating} · {c.vehicle} · {c.phone}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {assigningId === order.id ? <Spinner className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {order.status === "хүргэгдсэн" && (
                      <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 py-2.5 rounded-xl text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Амжилттай хүргэгдлээ · {order.deliveredAt}
                      </div>
                    )}
                  </div>
                )}
              </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
