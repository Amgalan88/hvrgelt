import { useState } from "react";
import { MapPin, Package, ChevronRight, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import type { Order, OrderStatus } from "../shared/types";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  шинэ:        { label: "Хүлээгдэж байна",    color: "text-amber-400",  icon: Clock },
  томилогдсон: { label: "Куриер томилогдсон", color: "text-blue-400",   icon: Clock },
  авсан:       { label: "Ачаа авсан",          color: "text-primary",    icon: Clock },
  хүргэгдсэн: { label: "Хүргэгдсэн",          color: "text-green-400",  icon: CheckCircle },
  цуцлагдсан: { label: "Цуцлагдсан",          color: "text-red-400",    icon: XCircle },
};

interface OrderHistoryProps {
  orders: Order[];
  userId: string;
  onTrack: (orderId: string) => void;
}

export function OrderHistory({ orders, userId, onTrack }: OrderHistoryProps) {
  // Hidden orders are cleared from the customer's view only — NOT deleted from the DB.
  const HIDDEN_KEY = "hvrgelt_hidden_orders_" + userId;
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"));
    } catch {
      return new Set<string>();
    }
  });

  const myOrders = orders.filter(
    (o) => (o.customerId === userId || o.customerId.startsWith("cu-new")) && !hidden.has(o.id),
  );

  function clearPast(pastOrders: Order[]) {
    const next = new Set(hidden);
    pastOrders.forEach((o) => next.add(o.id));
    setHidden(next);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
  }

  if (myOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Package className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Захиалгын түүх байхгүй байна</p>
        <p className="text-xs text-muted-foreground mt-1">Анхны захиалгаа өгөөрэй</p>
      </div>
    );
  }

  const active = myOrders.filter((o) => !["хүргэгдсэн", "цуцлагдсан"].includes(o.status));
  const past = myOrders.filter((o) => ["хүргэгдсэн", "цуцлагдсан"].includes(o.status));

  return (
    <div className="space-y-5">
      {/* Active orders */}
      {active.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2" style={{ fontSize: "0.7rem" }}>Идэвхтэй захиалга</p>
          <div className="space-y-2">
            {active.map((o) => <OrderCard key={o.id} order={o} onTrack={onTrack} />)}
          </div>
        </div>
      )}

      {/* Past orders */}
      {past.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider" style={{ fontSize: "0.7rem" }}>Өмнөх захиалгууд</p>
            <button
              onClick={() => clearPast(past)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Цэвэрлэх
            </button>
          </div>
          <div className="space-y-2">
            {past.map((o) => <OrderCard key={o.id} order={o} onTrack={onTrack} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onTrack }: { order: Order; onTrack: (id: string) => void }) {
  const cfg = STATUS_CONFIG[order.status];
  const Icon = cfg.icon;
  const isActive = !["хүргэгдсэн", "цуцлагдсан"].includes(order.status);

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden ${isActive ? "border-primary/30" : "border-border"}`}>
      {/* Status bar */}
      <div className={`flex items-center justify-between px-4 py-2 ${isActive ? "bg-primary/8" : "bg-secondary/30"}`} style={{ background: isActive ? "rgba(255,90,31,0.06)" : undefined }}>
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${cfg.color} ${isActive ? "animate-pulse" : ""}`} />
          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">#{order.id} · {order.createdAt}</span>
      </div>

      <div className="px-4 py-3">
        {/* Route */}
        <div className="flex gap-3 items-stretch mb-3">
          <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="w-px flex-1 bg-border min-h-4" />
            <MapPin className="w-3 h-3 text-primary" />
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <div>
              <p className="text-xs text-muted-foreground">Авах хаяг</p>
              <p className="text-sm text-foreground leading-tight truncate">{order.fromAddress}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Хүргэх хаяг</p>
              <p className="text-sm text-foreground leading-tight truncate">{order.toAddress}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-primary" style={{ fontFamily: "'Roboto Slab', serif" }}>
              ₮{order.price.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{order.distance} км</p>
          </div>
        </div>

        {/* Note */}
        {order.packageNote && order.packageNote !== "Тэмдэглэлгүй" && (
          <div className="flex gap-2 items-center mb-3 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-2.5 py-1.5">
            <Package className="w-3.5 h-3.5 shrink-0" />
            {order.packageNote}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {order.courierName ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
                {order.courierName[0]}
              </div>
              <span className="text-xs text-muted-foreground">{order.courierName}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Куриер хүлээж байна...</span>
          )}

          {isActive && (
            <button
              onClick={() => onTrack(order.id)}
              className="flex items-center gap-1 text-xs text-primary border border-primary/30 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
            >
              Хянах <ChevronRight className="w-3 h-3" />
            </button>
          )}

          {order.status === "хүргэгдсэн" && (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              {order.deliveredAt && `${order.deliveredAt}-д хүргэгдсэн`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
