import { MapPin, Package, Clock, ChevronRight, Zap } from "lucide-react";

export interface Delivery {
  id: string;
  from: string;
  to: string;
  weight: string;
  size: string;
  price: number;
  urgency: "яаралтай" | "энгийн" | "хэдхэн цагт";
  description: string;
  postedAt: string;
  distance: string;
  senderName: string;
  senderRating: number;
}

interface DeliveryCardProps {
  delivery: Delivery;
  onBook: (delivery: Delivery) => void;
}

const urgencyColor: Record<string, string> = {
  яаралтай: "bg-red-500/20 text-red-400 border-red-500/30",
  энгийн: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "хэдхэн цагт": "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function DeliveryCard({ delivery, onBook }: DeliveryCardProps) {
  return (
    <div className="group relative bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all duration-200 cursor-pointer hover:shadow-[0_0_24px_rgba(255,90,31,0.08)]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${urgencyColor[delivery.urgency]}`}>
              {delivery.urgency === "яаралтай" && <Zap className="inline w-3 h-3 mr-1" />}
              {delivery.urgency}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{delivery.postedAt}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{delivery.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold text-primary" style={{ fontFamily: "'Roboto Slab', serif" }}>
            ₮{delivery.price.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">{delivery.distance}</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-5 flex justify-center">
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </div>
          <span className="text-foreground/90 truncate">{delivery.from}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-5 flex justify-center">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-foreground/90 truncate">{delivery.to}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            {delivery.weight}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {delivery.size}
          </span>
          <span className="text-foreground/60">{delivery.senderName} ★{delivery.senderRating}</span>
        </div>
        <button
          onClick={() => onBook(delivery)}
          className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          Авах <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
