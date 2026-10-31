// Утасны талбар + Verify.MN: хэрэглэгч кодоо өөрийн утаснаасаа 144773 руу SMS-ээр илгээнэ.
import { useEffect, useRef, useState } from "react";
import { CheckCircle, Smartphone } from "lucide-react";
import { authSetPhone } from "../../lib/authApi";
import { normalizePhone } from "../../lib/phone";
import { supabase } from "../../lib/supabase";

export type PhonePurpose = "signup" | "reset" | "phone";

type Session = { id: string; code: string; shortcode: string; expiresAt: string; mock: boolean };
type Stage = "idle" | "starting" | "pending" | "verified" | "expired";

const POLL_MS = 3000;

/** Идэвхгүй үед саарал, хамгийн багадаа 44px. */
const actionBtn =
  "shrink-0 min-h-11 min-w-11 px-3 rounded-xl text-sm font-semibold disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed";

export function PhoneVerify({
  phone,
  onPhone,
  purpose = "signup",
  role,
  lockPhone = false,
  onVerified,
}: {
  phone: string;
  onPhone?: (v: string) => void;
  purpose?: PhonePurpose;
  role?: "customer" | "courier";
  lockPhone?: boolean;
  onVerified: (id: string | null) => void;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0);
  const [ios, setIos] = useState(false);
  const checking = useRef(false);
  const verifiedRef = useRef(onVerified);
  verifiedRef.current = onVerified;
  const clean = normalizePhone(phone);

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (stage !== "pending" || !session) return;
    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const r = await fetch(`/api/phone-verify?id=${encodeURIComponent(session.id)}`, { cache: "no-store" });
        const { status } = await r.json();
        if (status === "VERIFIED") {
          setStage("verified");
          verifiedRef.current(session.id);
        }
        if (status === "EXPIRED") setStage("expired");
      } catch {
        // сүлжээний түр алдаа — дараагийн удаа дахин шалгана
      } finally {
        checking.current = false;
      }
    };
    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const tick = window.setInterval(() => {
      const ms = new Date(session.expiresAt).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(ms / 1000)));
      if (ms <= 0) setStage("expired");
    }, 1000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [stage, session]);

  async function start() {
    if (clean.length !== 8) {
      setError("Утасны дугаар 8 оронтой байна");
      return;
    }
    setError("");
    setStage("starting");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (purpose === "phone") {
        const { data } = await supabase.auth.getSession();
        if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      const r = await fetch("/api/phone-verify", {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: clean, purpose, role }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.code === "NOT_READY") {
        setStage("idle");
        onVerified("skip");
        return;
      }
      if (!r.ok || !d.ok) {
        setError(d.error || "Алдаа гарлаа");
        setStage("idle");
        return;
      }
      setSession(d);
      setLeft(Math.max(0, Math.floor((new Date(d.expiresAt).getTime() - Date.now()) / 1000)));
      setStage("pending");
    } catch {
      setError("Сүлжээний алдаа. Дахин оролдоно уу");
      setStage("idle");
    }
  }

  function reset() {
    setSession(null);
    setStage("idle");
    setError("");
    onVerified(null);
  }

  const locked = stage !== "idle";
  const smsHref = session ? `sms:${session.shortcode}${ios ? "&" : "?"}body=${encodeURIComponent(session.code)}` : "#";
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="phone-verify" className="text-xs text-muted-foreground block mb-1.5">Утасны дугаар</label>
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="phone-verify"
              value={phone}
              readOnly={locked || lockPhone}
              inputMode="numeric"
              autoComplete="tel"
              maxLength={12}
              placeholder="99000000"
              onChange={(e) => onPhone?.(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && stage === "idle") {
                  e.preventDefault();
                  void start();
                }
              }}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-3 py-3 text-sm tabular focus:outline-none focus:border-primary/50"
            />
          </div>
          {stage === "idle" || stage === "starting" ? (
            <button
              type="button"
              onClick={() => void start()}
              disabled={stage === "starting" || clean.length !== 8}
              className={`${actionBtn} bg-primary text-primary-foreground disabled:hover:bg-secondary`}
            >
              {stage === "starting" ? "..." : "Баталгаажуулах"}
            </button>
          ) : stage === "verified" && lockPhone ? null : (
            <button type="button" onClick={reset} className={`${actionBtn} border border-border`}>
              {lockPhone ? "Цуцлах" : "Солих"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

      {stage === "pending" && session && (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm space-y-3" aria-live="polite">
          {session.mock && (
            <p className="text-xs font-semibold text-muted-foreground bg-secondary rounded-lg px-2 py-1">
              Туршилтын горим: SMS илгээхгүйгээр хэдэн секундэд баталгаажна
            </p>
          )}
          <p>
            <strong className="tabular">{clean}</strong> дугаараасаа <strong>{session.shortcode}</strong> руу энэ кодыг SMS-ээр илгээнэ үү.
          </p>
          <div className="flex items-center justify-center gap-3 bg-card rounded-xl py-3">
            <span className="text-muted-foreground font-semibold text-sm">→ {session.shortcode}</span>
            <input
              readOnly
              value={session.code}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Илгээх код"
              size={Math.max(4, session.code.length)}
              className="bg-transparent border-0 p-0 text-3xl font-extrabold tracking-[0.18em] tabular text-center focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Заавал энэ дугаартай утаснаасаа илгээнэ үү (2 SIM-тэй бол тэр SIM-ээр). SMS-ийн үнэ <strong className="text-foreground">150₮</strong> — утсанд тань нэгж байх шаардлагатай.
          </p>
          <a href={smsHref} className="flex items-center justify-center min-h-11 bg-primary text-primary-foreground py-3 rounded-xl font-semibold">
            ✉ SMS бичих
          </a>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-border border-t-primary animate-spin" aria-hidden="true" />
              SMS хүлээж байна…
            </span>
            <span className="tabular">{mmss} үлдсэн</span>
          </div>
        </div>
      )}

      {stage === "verified" && (
        <p className="text-sm text-green-500 font-semibold flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4" /> Утасны дугаар баталгаажлаа
        </p>
      )}

      {stage === "expired" && (
        <p className="text-xs text-destructive">
          Хугацаа дууссан — хуучин код хүчингүй.{" "}
          <button type="button" onClick={reset} className="inline-flex items-center min-h-11 underline font-semibold">Шинэ код авах</button>
        </p>
      )}
    </div>
  );
}

/** Нэвтэрсний дараах хаалт — purpose phone, баталгаажмагц onDone. */
export function PhoneGate({
  phone,
  onDone,
  onLogout,
  title = "Утасны дугаараа баталгаажуулна уу",
  body = "Захиалга, хүргэлт таны дугаар дээр очно. Нэг удаа баталгаажуулна.",
}: {
  phone: string;
  onDone: (phone: string) => void;
  onLogout: () => void;
  title?: string;
  body?: string;
}) {
  const [value, setValue] = useState(normalizePhone(phone));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [round, setRound] = useState(0);

  async function save(id: string | null) {
    if (!id || id === "skip") {
      if (id === "skip") onDone(normalizePhone(value));
      return;
    }
    setSaving(true);
    setError("");
    const r = await authSetPhone(normalizePhone(value), id);
    setSaving(false);
    if (!r.ok) {
      setError(r.error || "Холболтын алдаа гарлаа");
      setRound((n) => n + 1);
      return;
    }
    onDone(r.phone || normalizePhone(value));
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
      <h2 className="text-[1.6rem] font-extrabold leading-tight" style={{ fontFamily: "var(--font-display)" }}>{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">{body}</p>
      <PhoneVerify key={round} purpose="phone" phone={value} onPhone={setValue} onVerified={(id) => void save(id)} />
      {saving && <p className="text-sm text-muted-foreground mt-3">Хадгалж байна…</p>}
      {error && <p className="text-xs text-destructive mt-3">{error}</p>}
      <button type="button" onClick={onLogout} className="mt-auto min-h-11 text-sm text-muted-foreground">Гарах</button>
    </div>
  );
}

/** Тохиргоо: баталгаажсан тэмдэг, эсвэл дугаар солих. null = багана хараахан байхгүй. */
export function PhoneManage({
  phone,
  verified,
  onChanged,
}: {
  phone: string;
  verified: boolean | null;
  onChanged: (phone: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(normalizePhone(phone));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [round, setRound] = useState(0);
  if (verified === null) return null;

  async function save(id: string | null) {
    if (!id || id === "skip") return;
    setSaving(true);
    setError("");
    const r = await authSetPhone(normalizePhone(value), id);
    setSaving(false);
    if (!r.ok) {
      setError(r.error || "Холболтын алдаа гарлаа");
      setRound((n) => n + 1);
      return;
    }
    setOpen(false);
    onChanged(r.phone || normalizePhone(value));
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tabular">{phone}</p>
          <p className={`text-xs font-semibold ${verified ? "text-green-500" : "text-muted-foreground"}`}>
            {verified ? "✓ Баталгаажсан" : "Баталгаажаагүй"}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => { setOpen(true); setValue(normalizePhone(phone)); setError(""); }}
            className={`text-xs min-h-11 px-3 rounded-lg border ${verified ? "border-border text-muted-foreground" : "border-primary/40 text-primary"}`}
          >
            {verified ? "Дугаар солих" : "Баталгаажуулах"}
          </button>
        )}
      </div>
      {open && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {verified
              ? "Шинэ дугаараа бичээд тэр утаснаасаа SMS илгээнэ. Дараа нь шинэ дугаараараа нэвтэрнэ."
              : "Одоогийн дугаараа баталгаажуулах эсвэл шинэ дугаараа бичээд тэр утаснаасаа SMS илгээнэ."}
          </p>
          <PhoneVerify key={round} purpose="phone" phone={value} onPhone={setValue} onVerified={(id) => void save(id)} />
          {saving && <p className="text-xs text-muted-foreground">Хадгалж байна…</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center min-h-11 text-xs text-muted-foreground underline">Болих</button>
        </div>
      )}
    </div>
  );
}
