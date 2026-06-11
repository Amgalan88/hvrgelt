import { useState } from "react";
import { Package, Truck, CheckCircle, Clock, MapPin, Phone, User, ChevronDown, Bell } from "lucide-react";
import type { Order, Courier, OrderStatus } from "./shared/types";

interface OperatorAppProps {
  orders: Order[];
  couriers: Courier[];
  onAssign: (orderId: string, courierId: string) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  шинэ: "Шинэ",
  хүлээж_авсан: "Томилогдсон",
  замдаа: "Замдаа",
  хүргэгдсэн: "Хүргэгдсэн",
  цуцлагдсан: "Цуцлагдсан",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  шинэ: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  хүлээж_авсан: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  замдаа: "bg-primary/20 text-primary border-primary/30",
  хүргэгдсэн: "bg-green-500/20 text-green-400 border-green-500/30",
  цуцлагдсан: "bg-red-500/20 text-red-400 border-red-500/30",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  хүлээж_авсан: "замдаа",
  замдаа: "хүргэгдсэн",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  хүлээж_авсан: "Замдаа болгох",
  замдаа: "Хүргэгдсэн болгох",
};

type FilterTab = "бүгд" | "шинэ" | "идэвхтэй" | "дууссан";

export function OperatorApp({ orders, couriers, onAssign, onUpdateStatus }: OperatorAppProps) {
  const [filter, setFilter] = useState<FilterTab>("бүгд");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const newCount = orders.filter((o) => o.status === "шинэ").length;
  const activeCount = orders.filter((o) => o.status === "хүлээж_авсан" || o.status === "замдаа").length;

  const filtered = orders.filter((o) => {
    if (filter === "шинэ") return o.status === "шинэ";
    if (filter === "идэвхтэй") return o.status === "хүлээж_авсан" || o.status === "замдаа";
    if (filter === "дууссан") return o.status === "хүргэгдсэн" || o.status === "цуцлагдсан";
    return true;
  });

  const availableCouriers = couriers.filter((c) => c.available);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="w-3.5 h-3.5 text-white" />
            </div>
            <span style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1rem" }}>
              Шуурхай<span className="text-primary">.</span>mn
            </span>
            <span className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full ml-1">Оператор</span>
          </div>
          <div className="flex items-center gap-3">
            {newCount > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-white font-bold" style={{ fontSize: "0.6rem" }}>
                  {newCount}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-muted-foreground">{availableCouriers.length} чөлөөтэй</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 py-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Шинэ захиалга", value: newCount, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "Идэвхтэй", value: activeCount, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
            { label: "Чөлөөт куриер", value: availableCouriers.length, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold font-mono ${s.color}`} style={{ fontFamily: "'Roboto Slab', serif" }}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 bg-secondary/50 p-1 rounded-xl">
          {(["бүгд", "шинэ", "идэвхтэй", "дууссан"] as FilterTab[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${filter === f ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f}
              {f === "шинэ" && newCount > 0 && (
                <span className="ml-1 bg-primary text-white text-xs px-1 rounded-full" style={{ fontSize: "0.6rem" }}>{newCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Couriers availability strip */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Куриерийн байдал</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {couriers.map((c) => (
              <div key={c.id} className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${c.available ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-secondary border-border text-muted-foreground"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${c.available ? "bg-green-400" : "bg-muted-foreground"}`} />
                {c.name.split(".")[1]?.trim() ?? c.name}
              </div>
            ))}
          </div>
        </div>

        {/* Orders list */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Захиалга байхгүй байна</p>
            </div>
          )}
          {filtered.map((order) => {
            const expanded = expandedId === order.id;
            const canAssign = order.status === "шинэ";
            const nextStatus = NEXT_STATUS[order.status];

            return (
              <div key={order.id} className={`bg-card border rounded-xl overflow-hidden transition-all ${order.status === "шинэ" ? "border-amber-500/30" : "border-border"}`}>
                {/* Order header row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{order.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                      {order.status === "шинэ" && (
                        <span className="text-xs text-amber-400 animate-pulse">● шинэ</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate max-w-32">{order.fromAddress.split(",")[0]}</span>
                      <span>→</span>
                      <span className="truncate max-w-32">{order.toAddress.split(",")[0]}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary font-mono">₮{order.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{order.createdAt}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    {/* Route */}
                    <div className="space-y-2">
                      <div className="flex gap-2 items-start text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Авах хаяг</p>
                          <p className="text-foreground">{order.fromAddress}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-start text-sm">
                        <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Хүргэх хаяг</p>
                          <p className="text-foreground">{order.toAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Customer info */}
                    <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Захиалагч</p>
                          <p className="text-sm font-medium">{order.customerName}</p>
                        </div>
                      </div>
                      <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:border-primary/50 hover:text-primary transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                        {order.customerPhone}
                      </a>
                    </div>

                    {/* Package note */}
                    {order.packageNote && (
                      <div className="flex gap-2 items-center text-sm">
                        <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{order.packageNote}</span>
                      </div>
                    )}

                    {/* Assigned courier */}
                    {order.courierName && (
                      <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Куриер</p>
                            <p className="text-sm font-medium">{order.courierName}</p>
                          </div>
                        </div>
                        {order.eta && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Хүргэх цаг</p>
                            <p className="text-sm font-mono text-primary">{order.eta}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {/* Assign courier */}
                      {canAssign && (
                        <div className="flex-1">
                          {availableCouriers.length === 0 ? (
                            <div className="text-center py-2 text-xs text-muted-foreground border border-border rounded-xl">Чөлөөт куриер байхгүй</div>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-xs text-muted-foreground">Куриер томилох</p>
                              <div className="grid grid-cols-1 gap-1.5">
                                {availableCouriers.map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => { onAssign(order.id, c.id); setExpandedId(null); }}
                                    className="flex items-center justify-between bg-primary text-primary-foreground px-3 py-2 rounded-xl hover:bg-primary/90 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                                        {c.name[0]}
                                      </div>
                                      <span className="text-sm">{c.name}</span>
                                      <span className="text-xs opacity-70">· {c.vehicle}</span>
                                    </div>
                                    <CheckCircle className="w-4 h-4 opacity-80" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status update */}
                      {nextStatus && NEXT_LABEL[order.status] && (
                        <button
                          onClick={() => { onUpdateStatus(order.id, nextStatus); setExpandedId(null); }}
                          className="flex-1 flex items-center justify-center gap-2 bg-secondary border border-border text-foreground py-2.5 rounded-xl hover:border-primary/50 hover:text-primary transition-colors text-sm"
                        >
                          <Clock className="w-4 h-4" />
                          {NEXT_LABEL[order.status]}
                        </button>
                      )}

                      {order.status === "хүргэгдсэн" && (
                        <div className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 py-2.5 rounded-xl text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Амжилттай
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
