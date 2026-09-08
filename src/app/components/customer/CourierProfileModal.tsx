import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IdCard, Car, Hash, Phone, Star, X, BadgeCheck } from "lucide-react";
import { courierProfile } from "./courierProfiles";
import { ImageWithFallback } from "../figma/ImageWithFallback";

interface CourierProfileModalProps {
  courierId: string;
  name: string;
  phone: string;
  onClose: () => void;
}

type PanelKey = "license" | "car" | "plate" | "phone" | "rating";

const ORBIT: { key: PanelKey; label: string; icon: typeof IdCard }[] = [
  { key: "license", label: "Үнэмлэх", icon: IdCard },
  { key: "car",     label: "Машин",   icon: Car },
  { key: "plate",   label: "Дугаар",  icon: Hash },
  { key: "phone",   label: "Утас",    icon: Phone },
  { key: "rating",  label: "Үнэлгээ", icon: Star },
];

const RING = 108; // товчнуудын тойргийн радиус (px)

export function CourierProfileModal({ courierId, name, phone, onClose }: CourierProfileModalProps) {
  const p = courierProfile(courierId, name, phone);
  const [panel, setPanel] = useState<PanelKey>("license");

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-sm my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>Таны хүргэгч</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Тойрсон товч дээр дарж мэдээллийг харна</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Гол зураг + тойрсон товчнууд */}
          <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
            {/* тойргийн заагч */}
            <div className="absolute rounded-full border border-dashed border-border" style={{ inset: 32 }} />

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-[124px] h-[124px] rounded-full overflow-hidden border-[3px] border-primary shadow-lg bg-secondary">
                <ImageWithFallback src={p.photo} alt={name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-green-500/90 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                <BadgeCheck className="w-3 h-3" /> Баталгаажсан
              </div>
            </div>

            {ORBIT.map((o, i) => {
              const angle = (-90 + i * (360 / ORBIT.length)) * (Math.PI / 180);
              const Icon = o.icon;
              const active = panel === o.key;
              return (
                <motion.button
                  key={o.key}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 + i * 0.05, type: "spring", damping: 18, stiffness: 300 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPanel(o.key)}
                  className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: 140 + RING * Math.cos(angle), top: 140 + RING * Math.sin(angle) }}
                >
                  <span
                    className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className={`text-[10px] whitespace-nowrap ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {o.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Нэр */}
          <div className="text-center">
            <p className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {p.vehicle} · {p.experience} жил туршлагатай · {p.deliveries} хүргэлт
            </p>
          </div>

          {/* Сонгосон товчны дэлгэрэнгүй */}
          <AnimatePresence mode="wait">
            <motion.div
              key={panel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="bg-secondary/40 border border-border rounded-2xl p-4"
            >
              {panel === "license" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Жолооны үнэмлэх</p>
                  <img src={p.licenseImg} alt="Жолооны үнэмлэх" className="w-full rounded-xl border border-border" />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Ангилал <span className="text-foreground font-medium">{p.licenseClass}</span></span>
                    <span className="text-muted-foreground">Хүчинтэй <span className="text-foreground font-medium">{p.licenseExpiry}</span></span>
                  </div>
                </div>
              )}

              {panel === "car" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Тээврийн хэрэгсэл</p>
                  <img src={p.carImg} alt="Машин" className="w-full rounded-xl border border-border" />
                </div>
              )}

              {panel === "plate" && (
                <div className="text-center space-y-1.5">
                  <p className="text-xs text-muted-foreground">Улсын дугаар</p>
                  <p className="text-2xl font-bold tracking-widest font-mono">{p.plate}</p>
                  <p className="text-xs text-muted-foreground">{p.vehicle}</p>
                </div>
              )}

              {panel === "phone" && (
                <div className="text-center space-y-2.5">
                  <p className="text-xs text-muted-foreground">Утасны дугаар</p>
                  <p className="text-2xl font-bold font-mono">{p.phone}</p>
                  <a
                    href={`tel:${p.phone}`}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" /> Залгах
                  </a>
                </div>
              )}

              {panel === "rating" && (
                <div className="text-center space-y-1.5">
                  <p className="text-xs text-muted-foreground">Үнэлгээ</p>
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-5 h-5 ${n <= Math.round(p.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                  <p className="text-2xl font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>{p.rating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{p.deliveries} хүргэлтийн үнэлгээ</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <p className="text-[10px] text-center text-amber-500/80">
            Энэ мэдээлэл одоогоор туршилтын (mock) өгөгдөл юм.
          </p>
        </div>
      </div>
    </div>
  );
}
