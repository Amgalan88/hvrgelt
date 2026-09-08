import { useMemo, useState } from "react";
import { Download, X, FileSpreadsheet } from "lucide-react";
import type { Order } from "../shared/types";
import { downloadOrdersCsv, ordersOnDate, summarize, todayYmd, ymd } from "../../lib/exportOrders";

interface ExportModalProps {
  orders: Order[];
  onClose: () => void;
}

function yesterdayYmd() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymd(d);
}

export function ExportModal({ orders, onClose }: ExportModalProps) {
  const today = todayYmd();
  const [date, setDate] = useState(today);

  const dayOrders = useMemo(() => ordersOnDate(orders, date), [orders, date]);
  const stat = useMemo(() => summarize(dayOrders), [dayOrders]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
      onClick={onClose}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>Захиалгын тайлан</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Өдрөөр шүүж Excel-д татах</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Огноо */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Огноо</label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            <div className="flex gap-2">
              {[
                { label: "Өнөөдөр", value: today },
                { label: "Өчигдөр", value: yesterdayYmd() },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDate(p.value)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    date === p.value
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Тойм */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Захиалга", value: stat.total, color: "text-foreground" },
              { label: "Хүргэгдсэн", value: stat.delivered, color: "text-green-400" },
              { label: "Цуцлагдсан", value: stat.cancelled, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="bg-secondary/50 border border-border rounded-xl p-2.5 text-center">
                <p className={`text-lg font-bold ${s.color}`} style={{ fontFamily: "'Roboto Slab', serif" }}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
            <span className="text-sm text-muted-foreground">Нийт дүн</span>
            <span className="text-lg font-bold text-primary" style={{ fontFamily: "'Roboto Slab', serif" }}>
              ₮{stat.revenue.toLocaleString()}
            </span>
          </div>

          {stat.total === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-1">Энэ өдөр захиалга бүртгэгдээгүй байна.</p>
          ) : (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {stat.total} захиалга, 16 багана бүхий CSV файл татагдана — Excel дээр давхар товшиж нээнэ.
            </p>
          )}

          <button
            onClick={() => downloadOrdersCsv(dayOrders, date)}
            disabled={stat.total === 0}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
          >
            <Download className="w-4 h-4" /> Excel татах
          </button>
        </div>
      </div>
    </div>
  );
}
