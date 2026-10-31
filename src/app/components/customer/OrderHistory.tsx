import { useState } from "react";
import { ChevronRight, RotateCcw, Package, Plus } from "lucide-react";
import type { Order, OrderStatus } from "../shared/types";
import { serviceById } from "./services";
import { serviceIcon } from "./serviceIcons";
import { useUndo } from "../shared/Undo";

/** Төлөв бүрийн шошго — хэрэглэгчийн хэлээр, өнгөөр ялгана */
const STATUS_PILL: Record<OrderStatus, { label: string; cls: string }> = {
  шинэ: { label: "Үнэ тогтоож байна", cls: "bg-amber-500/12 text-amber-700 dark:text-amber-300" },
  "үнэ батлах": { label: "Таны ээлж · үнэ", cls: "bg-primary text-primary-foreground" },
  "төлбөр хүлээж байна": { label: "Таны ээлж · төлбөр", cls: "bg-primary text-primary-foreground" },
  "жолооч хайж байна": { label: "Хүргэгч хайж байна", cls: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  томилогдсон: { label: "Хүргэгч явж байна", cls: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  авсан: { label: "Замдаа", cls: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  хүргэгдсэн: { label: "Хүргэгдсэн", cls: "bg-green-500/12 text-green-700 dark:text-green-300" },
  цуцлагдсан: { label: "Цуцлагдсан", cls: "bg-secondary text-muted-foreground" },
};

const isActive = (o: Order) => !["хүргэгдсэн", "цуцлагдсан"].includes(o.status);

/** "Өнөөдөр", "Өчигдөр", "10-р сарын 12" */
function dayLabel(iso?: string): string {
  if (!iso) return "Өмнө";
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86400000);
  if (diff === 0) return "Өнөөдөр";
  if (diff === 1) return "Өчигдөр";
  const md = `${d.getMonth() + 1}-р сарын ${d.getDate()}`;
  return d.getFullYear() === today.getFullYear() ? md : `${d.getFullYear()} оны ${md}`;
}

interface OrderHistoryProps {
  orders: Order[];
  userId: string;
  onTrack: (orderId: string) => void;
  /** Хүргэгдсэн захиалгыг ижил хаяг, үйлчилгээгээр дахин захиална */
  onRepeat: (order: Order) => void;
  onNew: () => void;
}

export function OrderHistory({ orders, userId, onTrack, onRepeat, onNew }: OrderHistoryProps) {
  const { offerUndo } = useUndo();
  // Нуусан захиалга зөвхөн энэ төхөөрөмжийн жагсаалтаас алга болно — DB-ээс устахгүй
  const HIDDEN_KEY = "hvrgelt_hidden_orders_" + userId;
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"));
    } catch {
      return new Set<string>();
    }
  });

  function saveHidden(next: Set<string>) {
    setHidden(next);
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next])); } catch { /* noop */ }
  }

  const mine = orders.filter((o) => o.customerId === userId && !hidden.has(o.id));
  const active = mine.filter(isActive);
  const past = mine.filter((o) => !isActive(o));
  const [seg, setSeg] = useState<"active" | "past">(() => (active.length > 0 ? "active" : "past"));
  const list = seg === "active" ? active : past;

  function clearPast() {
    const prev = hidden;
    const next = new Set(hidden);
    past.forEach((o) => next.add(o.id));
    saveHidden(next);
    offerUndo(`${past.length} захиалга жагсаалтаас нуугдлаа`, () => saveHidden(prev));
  }

  // Өдрөөр бүлэглэнэ (шинэ нь эхэнд)
  const groups: { day: string; items: Order[] }[] = [];
  for (const o of list) {
    const day = dayLabel(o.insertedAt);
    const g = groups.find((x) => x.day === day);
    if (g) g.items.push(o);
    else groups.push({ day, items: [o] });
  }

  return (
    <div className="space-y-4">
      {/* Сегмент */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-secondary rounded-2xl" role="tablist">
        {([
          { key: "active", label: "Идэвхтэй", n: active.length },
          { key: "past", label: "Дууссан", n: past.length },
        ] as const).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={seg === t.key}
            onClick={() => setSeg(t.key)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              seg === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
            {t.n > 0 && (
              <span className={`min-w-5 h-5 px-1.5 rounded-full text-xs flex items-center justify-center tabular ${seg === t.key && t.key === "active" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                {t.n}
              </span>
            )}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center text-center py-14 px-6">
          <span className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Package className="w-7 h-7 text-muted-foreground" />
          </span>
          <p className="text-lg font-bold mt-4">{seg === "active" ? "Идэвхтэй захиалга алга" : "Дууссан захиалга алга"}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">Хүргэлтээ захиалахад энд харагдана.</p>
          <button type="button" onClick={onNew} className="mt-5 w-full max-w-xs min-h-14 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-5 rounded-2xl text-base">
            <Plus className="w-5 h-5" /> Захиалга өгөх
          </button>
        </div>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.day} className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground px-1">{g.day}</p>
              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                {g.items.map((o) => {
                  const Icon = serviceIcon(o.serviceId);
                  const pill = STATUS_PILL[o.status] ?? STATUS_PILL["шинэ"];
                  const sv = serviceById(o.serviceId);
                  return (
                    <div key={o.id} className="flex items-stretch">
                      <button onClick={() => onTrack(o.id)} className="flex-1 min-w-0 flex items-center gap-3 px-3.5 py-3 text-left active:bg-secondary/60 transition-colors">
                        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isActive(o) ? "bg-primary/12 text-primary" : "bg-secondary text-muted-foreground"}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-semibold truncate">{o.toDetail || o.toAddress}</span>
                          <span className="block text-xs text-muted-foreground truncate mt-0.5">
                            {o.fromDetail || o.fromAddress}{sv ? ` · ${sv.label}` : ""}
                          </span>
                          <span className={`inline-block mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          {o.price > 0 && <span className="block font-bold tabular">₮{o.price.toLocaleString()}</span>}
                          <span className="block text-xs text-muted-foreground tabular">{o.createdAt}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                      {o.status === "хүргэгдсэн" && (
                        <button
                          onClick={() => onRepeat(o)}
                          aria-label="Дахин захиалах"
                          title="Дахин захиалах"
                          className="w-14 shrink-0 border-l border-border flex flex-col items-center justify-center gap-0.5 text-primary active:bg-primary/10"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span className="text-xs font-semibold">Дахин</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {seg === "past" && past.length > 0 && (
            <button onClick={clearPast} className="w-full text-sm text-muted-foreground py-2">
              Жагсаалтыг цэвэрлэх
            </button>
          )}
        </>
      )}
    </div>
  );
}
