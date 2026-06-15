import { useState } from "react";
import { Home, Briefcase, MapPin, Plus, Trash2, Moon, Sun, ChevronRight, X, Lock } from "lucide-react";
import { useUser, type SavedAddress } from "../shared/UserContext";
import { PinPad } from "../shared/PinPad";
import { PatternLock } from "../shared/PatternLock";

const ICON_MAP = {
  home: { icon: Home, label: "Гэр", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  work: { icon: Briefcase, label: "Ажил", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  other: { icon: MapPin, label: "Бусад", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
};

interface AddAddressModalProps {
  onClose: () => void;
  onSave: (a: Omit<SavedAddress, "id">) => void;
}

function AddAddressModal({ onClose, onSave }: AddAddressModalProps) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [detail, setDetail] = useState("");
  const [icon, setIcon] = useState<"home" | "work" | "other">("other");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>Хаяг нэмэх</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Icon type */}
        <div className="flex gap-2">
          {(Object.entries(ICON_MAP) as [SavedAddress["icon"], typeof ICON_MAP.home][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setIcon(key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${icon === key ? `${cfg.bg} border-opacity-100` : "border-border"}`}
              >
                <Icon className={`w-4 h-4 ${icon === key ? cfg.color : "text-muted-foreground"}`} />
                <span className={`text-xs ${icon === key ? cfg.color : "text-muted-foreground"}`}>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Нэр (жш: Гэр, Ажил, Эмээ)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Гэр"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Дүүрэг, хороо</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Баянзүрх дүүрэг, 3-р хороо"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Дэлгэрэнгүй хаяг</label>
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Гудамж, байр, тоот..."
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 border border-border py-3 rounded-xl text-sm hover:border-primary/40 transition-colors">
            Болих
          </button>
          <button
            onClick={() => { if (label && address) { onSave({ label, address, detail, icon }); onClose(); } }}
            disabled={!label || !address}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
            style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
          >
            Хадгалах
          </button>
        </div>
      </div>
    </div>
  );
}

interface SettingsPageProps {
  userName: string;
  userPhone: string;
  onUpdateAuth: (authMethod: "pin" | "pattern", authKey: string) => void;
  onLogout: () => void;
}

type LockFlow =
  | "verify"
  | "pin-new" | "pin-confirm"
  | "pattern-new" | "pattern-confirm"
  | null;

export function SettingsPage({ userName, userPhone, onUpdateAuth, onLogout }: SettingsPageProps) {
  const { theme, toggleTheme, savedAddresses, addAddress, removeAddress, pin, setPin, pattern, setPattern } = useUser();
  const [showAdd, setShowAdd] = useState(false);
  const [lockFlow, setLockFlow] = useState<LockFlow>(null);
  const [pending, setPending] = useState("");
  const [lockError, setLockError] = useState("");
  const [target, setTarget] = useState<"pin" | "pattern">("pin");

  // alias for backward compat
  const pinFlow = lockFlow;
  const setPinFlow = setLockFlow;
  const pendingPin = pending;
  const setPendingPin = setPending;
  const pinError = lockError;
  const setPinError = setLockError;

  return (
    <div className="space-y-5 pb-4">
      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary shrink-0" style={{ fontFamily: "'Roboto Slab', serif", fontSize: "1.4rem", fontWeight: 700 }}>
          {userName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>{userName}</p>
          <p className="text-sm text-muted-foreground">{userPhone}</p>
        </div>
        <button className="text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
          Засах
        </button>
      </div>

      {/* Appearance */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontSize: "0.7rem" }}>Харагдац</p>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
            <div>
              <p className="text-sm font-medium">{theme === "dark" ? "Шөнийн горим" : "Өдрийн горим"}</p>
              <p className="text-xs text-muted-foreground">{theme === "dark" ? "Харанхуй дэвсгэр" : "Цагаан дэвсгэр"}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full border transition-all relative ${theme === "dark" ? "bg-primary border-primary" : "bg-secondary border-border"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5 ${theme === "dark" ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Saved addresses */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontSize: "0.7rem" }}>Хадгалагдсан хаягууд</p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Нэмэх
          </button>
        </div>

        {savedAddresses.length === 0 && (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
            Хадгалагдсан хаяг байхгүй
          </div>
        )}

        {savedAddresses.map((addr, i) => {
          const cfg = ICON_MAP[addr.icon];
          const Icon = cfg.icon;
          return (
            <div key={addr.id} className={`px-4 py-3 flex items-center gap-3 ${i < savedAddresses.length - 1 ? "border-b border-border" : ""}`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{addr.label}</p>
                <p className="text-xs text-muted-foreground truncate">{addr.address}{addr.detail ? `, ${addr.detail}` : ""}</p>
              </div>
              <button
                onClick={() => removeAddress(addr.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-3 px-4 py-3 border-t border-border hover:bg-secondary/30 transition-colors text-muted-foreground"
        >
          <div className="w-9 h-9 rounded-xl border border-dashed border-border flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-sm">Шинэ хаяг нэмэх</span>
        </button>
      </div>

      {/* Security */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontSize: "0.7rem" }}>Аюулгүй байдал</p>
        </div>

        {/* PIN */}
        <button
          onClick={() => { setLockError(""); setTarget("pin"); setLockFlow((pin || pattern) ? "verify" : "pin-new"); }}
          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${pin ? "bg-primary/15 border-primary/30" : "bg-secondary border-border"}`}>
              <Lock className={`w-4 h-4 ${pin ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">PIN код</p>
              <p className="text-xs text-muted-foreground">{pin ? "Тохируулагдсан ✓" : "Тохируулаагүй"}</p>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${pin ? "bg-primary/15 border-primary/30 text-primary" : "bg-secondary border-border text-muted-foreground"}`}>
            {pin ? "Идэвхтэй" : "Тохируулах"}
          </span>
        </button>

        {/* Pattern */}
        <button
          onClick={() => { setLockError(""); setTarget("pattern"); setLockFlow((pin || pattern) ? "verify" : "pattern-new"); }}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${pattern ? "bg-primary/15 border-primary/30" : "bg-secondary border-border"}`}>
              <svg viewBox="0 0 20 20" className={`w-4 h-4 ${pattern ? "text-primary" : "text-muted-foreground"}`} fill="none">
                {[[3,3],[10,3],[17,3],[3,10],[10,10],[17,10],[3,17],[10,17],[17,17]].map(([cx,cy],i) => (
                  <circle key={i} cx={cx} cy={cy} r="2" fill="currentColor" />
                ))}
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Pattern зурах</p>
              <p className="text-xs text-muted-foreground">{pattern ? "Тохируулагдсан ✓" : "Тохируулаагүй"}</p>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${pattern ? "bg-primary/15 border-primary/30 text-primary" : "bg-secondary border-border text-muted-foreground"}`}>
            {pattern ? "Идэвхтэй" : "Тохируулах"}
          </span>
        </button>
      </div>

      {/* Other settings */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontSize: "0.7rem" }}>Тохиргоо</p>
        </div>
        {[
          { label: "Мэдэгдэл", sub: "Push notification" },
          { label: "Хэл", sub: "Монгол" },
        ].map((item, i, arr) => (
          <button key={item.label} className={`w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
            <div>
              <p className="text-sm text-left">{item.label}</p>
              {item.sub && <p className="text-xs text-muted-foreground text-left">{item.sub}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full border border-destructive/30 text-destructive py-3 rounded-xl text-sm hover:bg-destructive/10 transition-colors"
      >
        Гарах
      </button>

      {showAdd && <AddAddressModal onClose={() => setShowAdd(false)} onSave={addAddress} />}

      {/* Lock setup modals */}
      {lockFlow && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
          {/* Verify current credential before switching/changing */}
          {lockFlow === "verify" && pin && (
            <PinPad title="Баталгаажуулах" subtitle="Одоогийн PIN кодоо оруулна уу" error={lockError}
              onComplete={(p) => {
                if (p === pin) { setLockError(""); setLockFlow(target === "pin" ? "pin-new" : "pattern-new"); }
                else setLockError("PIN код буруу байна");
              }}
              onCancel={() => { setLockFlow(null); setLockError(""); }} />
          )}
          {lockFlow === "verify" && !pin && pattern && (
            <PatternLock title="Баталгаажуулах" subtitle="Одоогийн pattern-аа зурна уу" error={lockError}
              onComplete={(p) => {
                if (p === pattern) { setLockError(""); setLockFlow(target === "pin" ? "pin-new" : "pattern-new"); }
                else setLockError("Pattern буруу байна");
              }}
              onCancel={() => { setLockFlow(null); setLockError(""); }} />
          )}

          {/* PIN flows */}
          {lockFlow === "pin-new" && (
            <PinPad title="PIN тохируулах" subtitle="4 оронтой PIN код оруулна уу"
              onComplete={(p) => { setPending(p); setLockFlow("pin-confirm"); setLockError(""); }}
              onCancel={() => setLockFlow(null)} />
          )}
          {lockFlow === "pin-confirm" && (
            <PinPad title="PIN баталгаажуулах" subtitle="PIN кодоо дахин оруулна уу" error={lockError}
              onComplete={(p) => {
                if (p === pending) { setPin(p); setPattern(null); onUpdateAuth("pin", p); setLockFlow(null); setPending(""); }
                else { setLockError("PIN код таарахгүй байна"); setLockFlow("pin-new"); setPending(""); }
              }}
              onCancel={() => { setLockFlow(null); setPending(""); }} />
          )}

          {/* Pattern flows */}
          {lockFlow === "pattern-new" && (
            <PatternLock title="Pattern тохируулах" subtitle="Хүссэн хэлбэрээрээ зурна уу"
              onComplete={(p) => { setPending(p); setLockFlow("pattern-confirm"); setLockError(""); }}
              onCancel={() => setLockFlow(null)} />
          )}
          {lockFlow === "pattern-confirm" && (
            <PatternLock title="Pattern баталгаажуулах" subtitle="Мөн адил зурна уу" error={lockError}
              onComplete={(p) => {
                if (p === pending) { setPattern(p); setPin(null); onUpdateAuth("pattern", p); setLockFlow(null); setPending(""); }
                else { setLockError("Pattern таарахгүй байна. Дахин оролдоно уу."); setLockFlow("pattern-new"); setPending(""); }
              }}
              onCancel={() => { setLockFlow(null); setPending(""); }} />
          )}
        </div>
      )}
    </div>
  );
}
