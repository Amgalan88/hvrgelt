import { CheckCircle, Circle, Package, Truck, MapPin, Star } from "lucide-react";

interface TrackedOrder {
  id: string;
  from: string;
  to: string;
  price: number;
  status: "хүлээж авах" | "замдаа" | "хүргэгдсэн";
  courier: string;
  courierRating: number;
  eta: string;
  timestamp: string;
}

const ORDERS: TrackedOrder[] = [
  {
    id: "58204",
    from: "Баянзүрх, 4-р хороо",
    to: "Хан-Уул, 11-р хороо",
    price: 12000,
    status: "замдаа",
    courier: "Б. Мөнхбат",
    courierRating: 4.9,
    eta: "14:30",
    timestamp: "2026-06-10 13:45",
  },
  {
    id: "57891",
    from: "Сүхбаатар, 1-р хороо",
    to: "Чингэлтэй, 8-р хороо",
    price: 8500,
    status: "хүргэгдсэн",
    courier: "Д. Эрдэнэ",
    courierRating: 4.7,
    eta: "—",
    timestamp: "2026-06-10 11:00",
  },
];

const steps = [
  { key: "хүлээж авах", label: "Хүлээж авах", icon: Package },
  { key: "замдаа", label: "Замдаа", icon: Truck },
  { key: "хүргэгдсэн", label: "Хүргэгдсэн", icon: MapPin },
];

const statusIndex: Record<string, number> = {
  "хүлээж авах": 0,
  замдаа: 1,
  хүргэгдсэн: 2,
};

export function TrackingView() {
  return (
    <div className="space-y-4">
      {ORDERS.map((order) => {
        const current = statusIndex[order.status];
        return (
          <div key={order.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-muted-foreground font-mono">Захиалга #</span>
                <span className="text-sm font-mono text-foreground ml-1">{order.id}</span>
              </div>
              <span className="text-lg font-bold text-primary" style={{ fontFamily: "'Roboto Slab', serif" }}>
                ₮{order.price.toLocaleString()}
              </span>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-0 mb-5">
              {steps.map((step, i) => {
                const done = i <= current;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className={`flex flex-col items-center gap-1 ${i === steps.length - 1 ? "w-full" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${done ? "bg-primary border-primary" : "bg-secondary border-border"}`}>
                        {done && i < current ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : done ? (
                          <Icon className="w-4 h-4 text-white" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={`text-xs text-center leading-tight ${done ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mb-4 mx-1 ${i < current ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-secondary/50 rounded-xl p-3 space-y-2 text-sm mb-4">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                <span className="text-muted-foreground truncate">{order.from}</span>
              </div>
              <div className="flex gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground truncate">{order.to}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-bold">
                  {order.courier[0]}
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">{order.courier}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {order.courierRating}
                  </div>
                </div>
              </div>
              {order.status !== "хүргэгдсэн" && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Хүргэх цаг</p>
                  <p className="text-sm font-mono text-primary">{order.eta}</p>
                </div>
              )}
              {order.status === "хүргэгдсэн" && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  ✓ Хүргэгдсэн
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
