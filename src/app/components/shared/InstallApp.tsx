import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Share, SquarePlus, X, Check } from "lucide-react";
import { useInstall } from "../../lib/install";
import { LogoMark } from "./Logo";

interface InstallButtonProps {
  /** hero: харанхуй дэвсгэр дээр, card: апп доторх мөр, inline: энгийн товч */
  variant?: "hero" | "card" | "inline";
  className?: string;
}

/**
 * "Апп суулгах" товч. Суулгасан эсвэл энэ хөтөч суулгах боломжгүй бол
 * юу ч харуулахгүй. iPhone дээр алхам алхмын заавар нээгдэнэ.
 */
export function InstallButton({ variant = "inline", className = "" }: InstallButtonProps) {
  const { mode, install } = useInstall();
  const [iosOpen, setIosOpen] = useState(false);
  if (mode === "installed" || mode === "unavailable") return null;

  const onClick = () => (mode === "ios" ? setIosOpen(true) : void install());

  return (
    <>
      {variant === "hero" && (
        <button
          onClick={onClick}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-white underline-offset-4 hover:underline ${className}`}
        >
          <Download className="w-4 h-4" /> Апп суулгах
        </button>
      )}
      {variant === "inline" && (
        <button
          onClick={onClick}
          className={`inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-4 py-3 rounded-xl hover:bg-primary/90 transition-colors ${className}`}
        >
          <Download className="w-4 h-4" /> Апп суулгах
        </button>
      )}
      {variant === "card" && (
        <button
          onClick={onClick}
          className={`w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/50 transition-colors ${className}`}
        >
          <LogoMark size={44} />
          <span className="flex-1 min-w-0">
            <span className="block font-semibold">Апп суулгах</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Утасныхаа нүүр дэлгэцээс шууд нээж, захиалгын мэдэгдэл авна
            </span>
          </span>
          <Download className="w-5 h-5 text-primary shrink-0" />
        </button>
      )}
      <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  );
}

/** iPhone/iPad — Safari-д суулгах товч байдаггүй тул заавар */
export function IosInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    { icon: Share, text: <>Хөтчийн доод (эсвэл дээд) талын <b>Хуваалцах</b> товчийг дарна</> },
    { icon: SquarePlus, text: <><b>Нүүр дэлгэцэнд нэмэх</b> (Add to Home Screen)-ийг сонгоно</> },
    { icon: Check, text: <>Баруун дээд буланд <b>Нэмэх</b> дарна</> },
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-card text-foreground w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <LogoMark size={44} />
                <div>
                  <p className="font-bold text-lg leading-tight">iPhone-д суулгах</p>
                  <p className="text-xs text-muted-foreground">30 секунд л болно</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Хаах" className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="mt-5 space-y-3">
              {steps.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-center gap-3 bg-secondary/60 rounded-2xl px-3.5 py-3">
                  <span className="w-9 h-9 rounded-xl bg-card flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </span>
                  <span className="text-sm leading-snug">{text}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Суулгасны дараа нүүр дэлгэц дээрх "Дархан хүргэлт" icon-оор нээгээрэй. iPhone дээр захиалгын мэдэгдэл зөвхөн суулгасан апп-д ирдэг.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
