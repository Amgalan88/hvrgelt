import { AnimatePresence, motion } from "motion/react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Улаан товч — буцаах боломжгүй үйлдэлд */
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Буцаах боломжгүй үйлдлийн өмнө асуух цонх — бүх role-д нэг ижил */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Болих",
  destructive = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="bg-card border border-border rounded-3xl p-5 w-full max-w-xs text-center"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold">{title}</p>
            {body && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{body}</p>}
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={onClose}
                className="flex-1 border border-border py-3 rounded-2xl text-sm font-semibold hover:bg-secondary/60 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold text-white hover:opacity-90 transition-opacity ${
                  destructive ? "bg-destructive" : "bg-primary"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
