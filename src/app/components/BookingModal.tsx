import { X, MapPin, Package, Star, Phone, CheckCircle } from "lucide-react";
import { useState } from "react";
import type { Delivery } from "./DeliveryCard";

interface BookingModalProps {
  delivery: Delivery | null;
  onClose: () => void;
  onConfirm: (delivery: Delivery) => void;
}

export function BookingModal({ delivery, onClose, onConfirm }: BookingModalProps) {
  const [step, setStep] = useState<"confirm" | "success">("confirm");

  if (!delivery) return null;

  if (step === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl mb-2" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700 }}>
            Амжилттай захиалагдлаа!
          </h3>
          <p className="text-muted-foreground text-sm mb-1">Захиалгын дугаар</p>
          <p className="text-primary font-mono text-lg mb-4">#{Math.floor(Math.random() * 90000 + 10000)}</p>
          <p className="text-muted-foreground text-sm mb-6">
            Хүргэлтийн мэдээллийг утсаар илгээлээ. Захиалгын явцыг <span className="text-foreground">Захиалга</span> хэсгээс харж болно.
          </p>
          <button
            onClick={() => { setStep("confirm"); onClose(); onConfirm(delivery); }}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Хаах
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700 }}>
            Хүргэлт авах
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-muted-foreground">Гарах цэг:</span>
              <span className="text-foreground font-medium">{delivery.from}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">Очих цэг:</span>
              <span className="text-foreground font-medium">{delivery.to}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Жин / хэмжээ:</span>
              <span className="text-foreground">{delivery.weight} · {delivery.size}</span>
            </div>
          </div>

          <div className="bg-secondary/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
                  {delivery.senderName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{delivery.senderName}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{delivery.senderRating}</span>
                    <span>· Илгээгч</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                <Phone className="w-3.5 h-3.5" />
                Залгах
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-muted-foreground text-sm">Хүргэлтийн үнэ</span>
            <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Roboto Slab', serif" }}>
              ₮{delivery.price.toLocaleString()}
            </span>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Захиалга баталгаажуулснаар та үйлчилгээний нөхцөлийг зөвшөөрсөнд тооцогдоно
          </p>
        </div>

        <div className="p-5 pt-0">
          <button
            onClick={() => setStep("success")}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Захиалга баталгаажуулах
          </button>
        </div>
      </div>
    </div>
  );
}
