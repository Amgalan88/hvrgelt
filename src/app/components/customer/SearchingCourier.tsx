import { motion } from "motion/react";
import { Truck, ShieldCheck, Zap, PiggyBank } from "lucide-react";

/**
 * Төлбөр орсны дараах "жолооч хайж байна" төлөв.
 * Хайлтын радар + яагаад апп-аар захиалах давуу талын сануулга
 * (жолоочтой шууд тохирохоос сэргийлэх гол мессеж).
 */
export function SearchingCourier() {
  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center">
        <div className="relative w-28 h-28 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute rounded-full border-2 border-primary/50"
              style={{ width: 40, height: 40 }}
              animate={{ scale: [1, 2.6], opacity: [0.55, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
            />
          ))}
          <div className="relative w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Truck className="w-6 h-6 text-white" />
          </div>
        </div>

        <p className="mt-3 font-semibold text-center" style={{ fontFamily: "'Roboto Slab', serif" }}>
          Жолооч хайж байна...
        </p>
        <p className="text-xs text-muted-foreground text-center mt-1 max-w-[16rem]">
          Танд жолооч хуваарилаад мэдээллийг нь илгээнэ. Апп-аа хаасан ч мэдэгдэл ирнэ.
        </p>
      </div>

      <div className="bg-secondary/40 border border-border rounded-2xl p-4">
        <p className="text-xs text-muted-foreground mb-2.5">Апп-аар захиалахын давуу тал</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Zap, label: "Хүргэлтийн хурд өндөр" },
            { icon: PiggyBank, label: "Төлбөр хэмнэлттэй" },
            { icon: ShieldCheck, label: "Ачаа даатгалтай" },
            { icon: Truck, label: "Баталгаатай жолооч" },
          ].map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.label} className="flex items-center gap-2 text-[11px] text-foreground/80">
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                {b.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
