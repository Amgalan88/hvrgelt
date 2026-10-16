import { useState } from "react";
import { Check, ChevronRight, PartyPopper, Phone, X } from "lucide-react";
import { PHONES } from "../../lib/contact";
import { VEHICLE_REACH } from "../../lib/dispatch";

interface CourierOnboardingProps {
  courierId: string;
  vehicle?: string;
  /** Дутуу заавал баримтын нэрс */
  missing: string[];
  verified: boolean;
  /** Баримт табыг нээх */
  onOpenDocs: () => void;
}

const CELEBRATED_KEY = "hvrgelt_courier_verified_seen_";

/**
 * Шинэ хүргэгчийг ажилд гартал нь хөтөлнө:
 * бүртгүүлсэн → баримт оруулах → админ шалгах → ажилд гарах.
 * Баталгаажсаны дараа нэг удаа баяр хүргэж, дараа нь алга болно.
 */
export function CourierOnboarding({ courierId, vehicle, missing, verified, onOpenDocs }: CourierOnboardingProps) {
  const seenKey = CELEBRATED_KEY + courierId;
  const [celebrated, setCelebrated] = useState(() => {
    try { return !!localStorage.getItem(seenKey); } catch { return true; }
  });

  if (verified) {
    if (celebrated) return null;
    const dismiss = () => {
      try { localStorage.setItem(seenKey, "1"); } catch { /* хадгалах боломжгүй */ }
      setCelebrated(true);
    };
    return (
      <div className="rounded-2xl p-4 bg-green-500/10 border border-green-500/30 flex items-start gap-3">
        <PartyPopper className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
        <div className="flex-1">
          <p className="font-bold">Баталгаажлаа!</p>
          <p className="text-sm text-muted-foreground mt-0.5">Доорх «Ажилд гарах»-ыг асаагаад анхны саналаа хүлээж аваарай.</p>
        </div>
        <button onClick={dismiss} aria-label="Хаах" className="p-1 -m-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const docsDone = missing.length === 0;
  const steps: { title: string; body?: string; state: "done" | "now" | "next" }[] = [
    { title: "Бүртгүүлсэн", state: "done" },
    {
      title: "Баримтаа оруулах",
      body: docsDone ? undefined : `Дутуу: ${missing.join(", ")}`,
      state: docsDone ? "done" : "now",
    },
    {
      title: "Админ шалгаж баталгаажуулна",
      body: docsDone ? "Баталгаажмагц энд мэдэгдэнэ — апп-аа хаасан ч болно." : undefined,
      state: docsDone ? "now" : "next",
    },
    { title: "Ажилд гарч, захиалга авна", state: "next" },
  ];
  const reach = VEHICLE_REACH[vehicle ?? ""];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3.5">
      <div>
        <p className="font-bold">Хүргэгч болоход {docsDone ? "нэг л алхам үлдлээ" : "бараг бэлэн"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Алхмуудыг дуусгамагц захиалгын санал ирж эхэлнэ</p>
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span
              className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                s.state === "done"
                  ? "bg-green-500 text-white"
                  : s.state === "now"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {s.state === "done" ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className={`text-sm font-semibold leading-tight ${s.state === "next" ? "text-muted-foreground" : ""}`}>{s.title}</p>
              {s.body && <p className="text-xs text-muted-foreground mt-0.5">{s.body}</p>}
            </div>
          </li>
        ))}
      </ol>
      {!docsDone && (
        <button
          onClick={onOpenDocs}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-1.5"
        >
          Баримтаа оруулах <ChevronRight className="w-4 h-4" />
        </button>
      )}
      {reach && (
        <p className="text-xs text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2">
          {vehicle === "явган" ? "Явган" : "Дугуйгаар"} хүргэх тул танд {reach.pickupKm} км доторх, {reach.tripKm} км хүртэл замтай ойрхон захиалга л ирнэ.
        </p>
      )}
      <a href={`tel:${PHONES[0].tel}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Phone className="w-3.5 h-3.5" /> Асуух зүйл байвал: <span className="font-semibold text-foreground tabular">{PHONES[0].label}</span>
      </a>
    </div>
  );
}
