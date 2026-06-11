import { Star, MapPin, Package, CheckCircle, Phone } from "lucide-react";
import { useState } from "react";

interface Courier {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  zone: string;
  vehicle: string;
  deliveries: number;
  available: boolean;
  specialties: string[];
  avatar: string;
  joined: string;
  responseTime: string;
}

const COURIERS: Courier[] = [
  {
    id: "1",
    name: "Б. Мөнхбат",
    rating: 4.9,
    reviews: 312,
    zone: "Баянзүрх, Хан-Уул",
    vehicle: "Мотоцикл",
    deliveries: 1240,
    available: true,
    specialties: ["яаралтай", "бичиг баримт"],
    avatar: "М",
    joined: "2023 он",
    responseTime: "~3 мин",
  },
  {
    id: "2",
    name: "Д. Эрдэнэ",
    rating: 4.7,
    reviews: 189,
    zone: "Сүхбаатар, Чингэлтэй",
    vehicle: "Автомашин",
    deliveries: 876,
    available: true,
    specialties: ["том ачаа", "хоол хүргэлт"],
    avatar: "Э",
    joined: "2022 он",
    responseTime: "~5 мин",
  },
  {
    id: "3",
    name: "О. Батжаргал",
    rating: 4.8,
    reviews: 445,
    zone: "Баянгол, Сонгинохайрхан",
    vehicle: "Дугуй",
    deliveries: 2103,
    available: false,
    specialties: ["жижиг илгээмж", "бэлэг"],
    avatar: "Б",
    joined: "2021 он",
    responseTime: "~2 мин",
  },
  {
    id: "4",
    name: "Н. Солонго",
    rating: 4.6,
    reviews: 98,
    zone: "Хан-Уул, Налайх",
    vehicle: "Мотоцикл",
    deliveries: 523,
    available: true,
    specialties: ["хоол", "эмийн сан"],
    avatar: "С",
    joined: "2024 он",
    responseTime: "~4 мин",
  },
];

export function CouriersView() {
  const [filter, setFilter] = useState<"бүгд" | "чөлөөтэй">("бүгд");

  const filtered = filter === "чөлөөтэй" ? COURIERS.filter((c) => c.available) : COURIERS;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["бүгд", "чөлөөтэй"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.map((courier) => (
        <div key={courier.id} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg" style={{ fontFamily: "'Roboto Slab', serif" }}>
                {courier.avatar}
              </div>
              {courier.available && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>{courier.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${courier.available ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-secondary text-muted-foreground border border-border"}`}>
                  {courier.available ? "чөлөөтэй" : "завгүй"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-foreground font-medium">{courier.rating}</span>
                  <span>({courier.reviews})</span>
                </div>
                <span>·</span>
                <span>{courier.vehicle}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">Хүргэлт</p>
              <p className="text-sm font-mono font-medium text-foreground">{courier.deliveries.toLocaleString()}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">Хариу</p>
              <p className="text-sm font-mono font-medium text-foreground">{courier.responseTime}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">Нэгдсэн</p>
              <p className="text-sm font-mono font-medium text-foreground">{courier.joined}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{courier.zone}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {courier.specialties.map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                {s}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!courier.available}>
              <Package className="w-3.5 h-3.5" />
              Захиалах
            </button>
            <button className="flex items-center justify-center gap-1.5 border border-border text-foreground py-2 px-3 rounded-lg text-sm hover:border-primary/50 hover:text-primary transition-colors">
              <Phone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
