import { useState, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";

const SEEN_KEY_PREFIX = "hvrgelt_help_seen_";

// Тухайн үүргийн апп-д анх удаа орж ирэхэд зааврыг автоматаар нээнэ,
// дараа нь зөвхөн "?" товч дараад дахин үзэх боломжтой.
export function useFirstVisitHelp(role: string) {
  const key = SEEN_KEY_PREFIX + role;
  const [open, setOpen] = useState(() => {
    try { return !localStorage.getItem(key); } catch { return false; }
  });

  useEffect(() => {
    if (open) {
      try { localStorage.setItem(key, "1"); } catch { /* noop */ }
    }
  }, [open, key]);

  return [open, setOpen] as const;
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-muted-foreground hover:text-foreground transition-colors" title="Заавар">
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}

interface HelpModalProps {
  title: string;
  subtitle: string;
  steps: string[];
  onClose: () => void;
}

export function HelpModal({ title, subtitle, steps, onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h3 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ fontFamily: "'Roboto Slab', serif" }}>
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed pt-0.5">{step}</p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="w-full bg-primary text-white py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors"
            style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
          >
            Ойлголоо
          </button>
        </div>
      </div>
    </div>
  );
}
