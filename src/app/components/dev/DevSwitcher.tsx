import { useState } from "react";
import { motion } from "motion/react";
import { User, Truck, Headset, Store, Shield, ChevronRight, X, LogIn, FlaskConical } from "lucide-react";
import type { UserRole } from "../shared/types";
import type { CourierAccount, CustomerAccount, OperatorAccount } from "../shared/store";
import { SUPERADMIN } from "../shared/store";
import type { Partner } from "../customer/partners";
import { Logo } from "../shared/Logo";

export interface DevAccounts {
  operatorAccounts: OperatorAccount[];
  courierAccounts: CourierAccount[];
  customerAccounts: CustomerAccount[];
  partners: Partner[];
}

interface DevSwitcherProps extends DevAccounts {
  /** Одоогийн session (байвал аль role идэвхтэйг тодруулна) */
  currentRole?: UserRole;
  /** Хаагдах боломжтой эсэх — аппын дотроос нээхэд true */
  onClose?: () => void;
  /** Dev горимоос гарч, ердийн нэвтрэх хуудас руу */
  onRealLogin?: () => void;
  onEnter: (role: UserRole, id: string, name: string, phone: string) => void;
}

interface Choice {
  id: string;
  name: string;
  phone: string;
  hint?: string;
}

const ROLE_META: { role: UserRole; label: string; desc: string; icon: typeof User; color: string }[] = [
  { role: "customer",   label: "Үйлчлүүлэгч", desc: "Захиалга өгөх, хянах, үнэлэх",        icon: User,    color: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
  { role: "courier",    label: "Жолооч",      desc: "Ачаа авах, хүргэх, баримт оруулах",    icon: Truck,   color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
  { role: "operator",   label: "Оператор",    desc: "Үнэ тогтоох, төлбөр, жолооч хуваарилах", icon: Headset, color: "text-violet-400 bg-violet-500/10 border-violet-500/25" },
  { role: "partner",    label: "Партнёр",     desc: "Бараагаа оруулах, төлбөрийн QR",       icon: Store,   color: "text-green-400 bg-green-500/10 border-green-500/25" },
  { role: "superadmin", label: "Супер админ", desc: "Бүх бүртгэл, санал хүсэлт, тохиргоо",  icon: Shield,  color: "text-red-400 bg-red-500/10 border-red-500/25" },
];

/**
 * Хөгжүүлэлтийн горимын role сонгогч — нууц үггүйгээр аль ч role руу
 * шууд орно. Жинхэнэ бүртгэл байхгүй role дээр демо хэрэглэгч үүсгэнэ
 * (өгөгдөл нь хоосон харагдана).
 */
export function DevSwitcher({
  operatorAccounts,
  courierAccounts,
  customerAccounts,
  partners,
  currentRole,
  onClose,
  onRealLogin,
  onEnter,
}: DevSwitcherProps) {
  const [open, setOpen] = useState<UserRole | null>(null);

  function choicesFor(role: UserRole): Choice[] {
    switch (role) {
      case "customer":
        return customerAccounts.slice(0, 12).map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
      case "courier":
        return courierAccounts
          .filter((c) => c.active)
          .slice(0, 12)
          .map((c) => ({ id: c.id, name: c.name, phone: c.phone, hint: `${c.vehicle} · ${c.verified ? "баталгаажсан" : "шалгаагүй"}` }));
      case "operator":
        return operatorAccounts.filter((o) => o.active).map((o) => ({ id: o.id, name: o.name, phone: o.phone }));
      case "partner":
        return partners.slice(0, 12).map((p) => ({ id: p.id, name: `${p.emoji} ${p.name}`, phone: p.phone ?? "", hint: p.category }));
      case "superadmin":
        return [{ id: SUPERADMIN.id, name: SUPERADMIN.name, phone: SUPERADMIN.phone }];
      default:
        return [];
    }
  }

  function demoFor(role: UserRole): Choice {
    const map: Record<string, Choice> = {
      customer:  { id: "dev-customer",  name: "Демо Үйлчлүүлэгч", phone: "99000001" },
      courier:   { id: "dev-courier",   name: "Демо Жолооч",      phone: "99000002" },
      operator:  { id: "dev-operator",  name: "Демо Оператор",    phone: "99000003" },
      partner:   { id: "dev-partner",   name: "Демо Партнёр",     phone: "99000004" },
      superadmin:{ id: SUPERADMIN.id,   name: SUPERADMIN.name,    phone: SUPERADMIN.phone },
    };
    return map[role];
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Logo size="sm" />
            <div className="flex items-center gap-1.5 mt-2">
              <FlaskConical className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-500 font-medium">ХӨГЖҮҮЛЭЛТИЙН ГОРИМ</span>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div>
          <h1 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.2 }}>
            Аль role-оор орох вэ?
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Хөгжүүлэгчийн бүртгэлээр нэвтэрсэн тул role хооронд чөлөөтэй шилжинэ.
          </p>
        </div>

        <div className="space-y-2.5">
          {ROLE_META.map((r, i) => {
            const Icon = r.icon;
            const list = choicesFor(r.role);
            const expanded = open === r.role;
            const isCurrent = currentRole === r.role;

            return (
              <motion.div
                key={r.role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: "spring", damping: 22, stiffness: 300 }}
                className={`bg-card border rounded-2xl overflow-hidden ${isCurrent ? "border-primary" : "border-border"}`}
              >
                <button
                  onClick={() => setOpen(expanded ? null : r.role)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${r.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>{r.label}</p>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                          одоо
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {list.length > 0 ? `${list.length} бүртгэл` : "бүртгэл байхгүй — демо"}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {list.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onEnter(r.role, c.id, c.name, c.phone)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {c.phone || "дугааргүй"}{c.hint ? ` · ${c.hint}` : ""}
                          </p>
                        </div>
                        <LogIn className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                    {r.role !== "superadmin" && (
                      <button
                        onClick={() => {
                          const d = demoFor(r.role);
                          onEnter(r.role, d.id, d.name, d.phone);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
                      >
                        <div>
                          <p className="text-sm text-muted-foreground">Демо хэрэглэгчээр орох</p>
                          <p className="text-xs text-muted-foreground/70">Хоосон өгөгдөлтэй, зөвхөн дэлгэц үзэх</p>
                        </div>
                        <LogIn className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {onRealLogin && (
          <button
            onClick={onRealLogin}
            className="w-full border border-border text-muted-foreground py-3 rounded-2xl text-sm hover:text-foreground hover:border-primary/40 transition-colors"
          >
            Жинхэнэ нэвтрэлтээр орох
          </button>
        )}

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Энэ дэлгэц нь хөгжүүлэгчийн бүртгэлээр нэвтэрсэн үед л нээгддэг
          (<code className="font-mono">VITE_DEV_PASSWORD</code>). Хөгжүүлэлт дуусмагц
          .env-ээс хасахад бүх хүн өөрийн role-оороо л нэвтэрнэ.
        </p>
      </div>
    </div>
  );
}

/** Аппын дотроос role солих хөвөгч товч */
export function DevBadge({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Role солих (хөгжүүлэлтийн горим)"
      className="fixed left-3 bottom-20 z-[90] flex items-center gap-1.5 bg-amber-500 text-black px-3 py-2 rounded-full shadow-lg text-xs font-semibold hover:bg-amber-400 transition-colors"
      style={{ fontFamily: "'Roboto Slab', serif" }}
    >
      <FlaskConical className="w-3.5 h-3.5" /> DEV
    </button>
  );
}
