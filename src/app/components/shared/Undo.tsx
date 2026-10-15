import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, X } from "lucide-react";

/** Мэдэгдэл хэдэн секунд харагдах вэ */
const UNDO_MS = 6000;

interface UndoEntry {
  id: number;
  message: string;
  restore: () => void;
}

interface UndoContextValue {
  /**
   * Үйлдлийн дараа "Буцаах" товчтой мэдэгдэл харуулна. restore нь
   * үйлдлийн өмнөх төлөвийг сэргээнэ. Шинэ үйлдэл хуучныг орлоно.
   */
  offerUndo: (message: string, restore: () => void) => void;
}

const UndoContext = createContext<UndoContextValue>({ offerUndo: () => {} });

export function useUndo() {
  return useContext(UndoContext);
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<UndoEntry | null>(null);
  const seq = useRef(0);

  const offerUndo = useCallback((message: string, restore: () => void) => {
    seq.current += 1;
    setEntry({ id: seq.current, message, restore });
  }, []);

  // Хугацаа дуусахад алга болно
  useEffect(() => {
    if (!entry) return;
    const t = setTimeout(() => setEntry((e) => (e?.id === entry.id ? null : e)), UNDO_MS);
    return () => clearTimeout(t);
  }, [entry]);

  function undo() {
    if (!entry) return;
    entry.restore();
    setEntry(null);
  }

  return (
    <UndoContext.Provider value={{ offerUndo }}>
      {children}
      <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[95] flex justify-center px-4 pointer-events-none">
        <AnimatePresence>
          {entry && (
            <motion.div
              key={entry.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className="relative overflow-hidden pointer-events-auto w-full max-w-sm flex items-center gap-2 bg-foreground text-background rounded-2xl pl-4 pr-1.5 py-1.5 shadow-xl"
            >
              <p className="flex-1 text-sm leading-snug py-1.5">{entry.message}</p>
              <button
                onClick={undo}
                className="shrink-0 flex items-center gap-1.5 text-sm font-bold text-[var(--brand)] px-3 py-2 rounded-xl hover:bg-background/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Буцаах
              </button>
              <button
                onClick={() => setEntry(null)}
                aria-label="Хаах"
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-background/10"
              >
                <X className="w-4 h-4" />
              </button>
              {/* Үлдсэн хугацааны зураас */}
              <motion.span
                className="absolute left-4 right-4 bottom-1 h-0.5 rounded-full bg-[var(--brand)] origin-left"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: UNDO_MS / 1000, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </UndoContext.Provider>
  );
}
