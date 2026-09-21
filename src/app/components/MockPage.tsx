// /mock — хөгжүүлэлтийн туршилтын хуудас. Захиалга үүсгэлгүйгээр
// хүргэгчийн профайл цонхыг шууд нээж харах зорилготой.
// Хаяг: http://localhost:5173/mock

import { useState } from "react";
import { Star, ArrowRight, Sun, Moon, ArrowLeft } from "lucide-react";
import { useUser } from "./shared/UserContext";
import { Logo } from "./shared/Logo";
import { CourierProfileModal } from "./customer/CourierProfileModal";
import { courierProfile, DEMO_COURIERS } from "./customer/courierProfiles";

export function MockPage() {
  const { theme, toggleTheme } = useUser();
  const [open, setOpen] = useState<string | null>(null);
  const active = DEMO_COURIERS.find((c) => c.id === open);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">MOCK</span>
            <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-5 space-y-4">
        <div>
          <h1 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.4rem", lineHeight: 1.2 }}>
            Хүргэгчийн профайл
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Хүргэгч дээр дарж захиалагчид харагдах цонхыг үзнэ. Бүх өгөгдөл туршилтын.
          </p>
        </div>

        <div className="space-y-2.5">
          {DEMO_COURIERS.map((c) => {
            const p = courierProfile(c.id, c.name, c.phone);
            return (
              <button
                key={c.id}
                onClick={() => setOpen(c.id)}
                className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 text-left hover:border-primary/50 transition-colors group"
              >
                <img
                  src={p.photo}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 bg-secondary shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.vehicle} · {p.plate}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {p.rating.toFixed(1)} · {p.deliveries} хүргэлт
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            );
          })}
        </div>

        <a
          href="/"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-3"
        >
          <ArrowLeft className="w-4 h-4" /> Апп руу буцах
        </a>
      </div>

      {active && (
        <CourierProfileModal
          courierId={active.id}
          name={active.name}
          phone={active.phone}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
