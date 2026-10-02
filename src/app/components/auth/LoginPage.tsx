import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowLeft, CheckCircle, Smartphone, Hash, Grid3x3, Eye, EyeOff, Lock, Truck, User } from "lucide-react";
import { Logo as AppLogo } from "../shared/Logo";
import { Spinner } from "../shared/Spinner";
import type { UserRole } from "../shared/types";
import type { AccountLookup } from "../shared/store";
import { PinPad } from "../shared/PinPad";
import { PatternLock } from "../shared/PatternLock";
import { useUser } from "../shared/UserContext";
import { normalizePhone, isValidPhone } from "../../lib/phone";

interface LoginPageProps {
  onLogin: (role: UserRole, id: string, name: string, phone: string) => void;
  resolveByPhone: (phone: string) => Promise<AccountLookup | null>;
  addCustomer: (data: { name: string; phone: string; authMethod: "pin" | "pattern"; authKey: string }) => Promise<string>;
  updateAccountAuth: (role: "operator" | "courier", id: string, authMethod: "pin" | "pattern", authKey: string) => void;
  updateCustomerAuth: (id: string, authMethod: "pin" | "pattern", authKey: string) => void;
  registerCourier: (data: {
    name: string;
    phone: string;
    vehicle: "мотоцикл" | "автомашин" | "дугуй" | "мопед";
    authMethod: "pin" | "pattern";
    authKey: string;
  }) => Promise<string>;
  /** Бүртгэлгүй дугаар оруулбал аль төрлөөр бүртгүүлэхийг урьдчилан сонгоно */
  initialMode?: LoginMode;
  /** Нүүр хуудас руу буцах */
  onBack?: () => void;
}

/** Нэвтрэх/бүртгүүлэх урсгалыг 2 салгана */
type LoginMode = "customer" | "courier";

const VEHICLES: { key: "мотоцикл" | "автомашин" | "дугуй" | "мопед"; emoji: string }[] = [
  { key: "мотоцикл",  emoji: "🏍️" },
  { key: "автомашин", emoji: "🚗" },
  { key: "мопед",     emoji: "🛵" },
  { key: "дугуй",     emoji: "🚲" },
];

type Screen = "phone" | "auth" | "first-setup" | "register";
type RegStep = "info" | "choose" | "pin" | "pattern";
type AuthStep = "pin" | "pattern" | "password";
type SetupStep = "choose" | "pin" | "pattern";

const WRONG_DELAY_MS   = 10_000;      // 10 секунд
const LOCKOUT_DELAY_MS = 10 * 60_000; // 10 минут
const MAX_ATTEMPTS     = 5;

const SAVED_PHONE_KEY = "hvrgelt_last_phone";

export function LoginPage({ onLogin, resolveByPhone, addCustomer, updateAccountAuth, updateCustomerAuth, registerCourier, initialMode = "customer", onBack }: LoginPageProps) {
  const { setPin, setPattern } = useUser();
  const [screen, setScreen] = useState<Screen>("phone");
  const [mode, setMode] = useState<LoginMode>(initialMode);

  // Phone input
  const savedPhone = localStorage.getItem(SAVED_PHONE_KEY) ?? "";
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auth
  const [account, setAccount] = useState<AccountLookup | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>("pin");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState("");

  // Lockout
  const [failCount, setFailCount]   = useState(0);
  const [lockUntil, setLockUntil]   = useState(0);
  const [countdown, setCountdown]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // First-login setup (staff OTP → set PIN/Pattern)
  const [setupStep, setSetupStep]   = useState<SetupStep>("choose");
  const [setupPinFirst, setSetupPinFirst]       = useState("");
  const [setupPatternFirst, setSetupPatternFirst] = useState("");
  const [setupError, setSetupError] = useState("");

  // Register
  const [rName, setRName]           = useState("");
  const [rPhone, setRPhone]         = useState("");
  const [rVehicle, setRVehicle]     = useState<"мотоцикл" | "автомашин" | "дугуй" | "мопед">("мотоцикл");
  const [regStep, setRegStep]       = useState<RegStep>("info");
  const [pinFirst, setPinFirst]     = useState("");
  const [patternFirst, setPatternFirst] = useState("");
  const [regError, setRegError]     = useState("");

  // ── Countdown timer ──────────────────────────────────────────────
  useEffect(() => {
    if (lockUntil <= Date.now()) { setCountdown(0); return; }
    function tick() {
      const left = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setCountdown(left);
      if (left === 0 && timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lockUntil]);

  // ── Fail handler ─────────────────────────────────────────────────
  function handleFail(msg: string) {
    const next = failCount + 1;
    setFailCount(next);
    if (next >= MAX_ATTEMPTS) {
      setLockUntil(Date.now() + LOCKOUT_DELAY_MS);
      setAuthError(`${MAX_ATTEMPTS} удаа буруу оруулсан. 10 минут хүлээнэ үү.`);
    } else {
      setLockUntil(Date.now() + WRONG_DELAY_MS);
      setAuthError(`${msg} (${next}/${MAX_ATTEMPTS})`);
    }
  }

  // ── Phone submit ─────────────────────────────────────────────────
  async function handlePhoneSubmit() {
    if (submitting) return;
    const clean = normalizePhone(phone);
    if (clean.length !== 8) { setPhoneError("Утасны дугаар 8 оронтой байх ёстой"); return; }
    setSubmitting(true);
    try {
      const found = await resolveByPhone(clean);
      if (!found) {
        setRPhone(phone);
        setScreen("register");
        return;
      }
      setAccount(found);
      // Admin PIN/Pattern-ийг нь цэвэрлэсэн бол (утсаар аль хэдийн
      // баталгаажуулсан) шинэ нууцлал тохируулах руу шууд шилжинэ.
      if (found.authMethod === "reset") {
        setSetupStep("choose");
        setSetupPinFirst(""); setSetupPatternFirst(""); setSetupError("");
        setScreen("first-setup");
        return;
      }
      setAuthStep(found.authMethod as AuthStep);
      setFailCount(0);
      setLockUntil(0);
      setAuthError("");
      setScreen("auth");
    } catch {
      // Сүлжээ/сервер алдаа гарвал "бүртгэлгүй" гэж андуураад дахин
      // бүртгүүлэх шаардлагатай мэт харуулахгүй — дахин оролдохыг санал болгоно.
      setPhoneError("Сүлжээний алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Auth: verify ─────────────────────────────────────────────────
  function verifyAuth(entered: string) {
    if (!account) return;
    if (countdown > 0) return;
    if (entered === account.authKey) {
      localStorage.setItem(SAVED_PHONE_KEY, phone);
      // Staff with OTP (authMethod === "password", not superadmin) → must set up PIN/Pattern first
      if (account.authMethod === "password" && account.role !== "superadmin") {
        setSetupStep("choose");
        setSetupPinFirst(""); setSetupPatternFirst(""); setSetupError("");
        setScreen("first-setup");
        return;
      }
      if (account.role === "customer") {
        if (account.authMethod === "pin") { setPin(entered); setPattern(null); }
        else if (account.authMethod === "pattern") { setPattern(entered); setPin(null); }
      }
      onLogin(account.role, account.id, account.name, normalizePhone(phone));
    } else {
      handleFail(
        account.authMethod === "pin"     ? "PIN буруу байна" :
        account.authMethod === "pattern" ? "Pattern буруу байна" :
                                           "Нууц үг буруу байна"
      );
    }
  }

  // ── First-login setup handlers ───────────────────────────────────
  function handleSetupPin(pin: string) {
    if (!setupPinFirst) { setSetupPinFirst(pin); return; }
    if (pin === setupPinFirst) {
      if (account!.role === "customer") {
        updateCustomerAuth(account!.id, "pin", pin);
        setPin(pin); setPattern(null);
      } else {
        updateAccountAuth(account!.role as "operator" | "courier", account!.id, "pin", pin);
      }
      localStorage.setItem(SAVED_PHONE_KEY, phone);
      onLogin(account!.role, account!.id, account!.name, normalizePhone(phone));
    } else {
      setSetupPinFirst("");
      setSetupError("PIN таарсангүй. Дахин оруулна уу.");
      setTimeout(() => setSetupError(""), 1500);
    }
  }

  function handleSetupPattern(pattern: string) {
    if (!setupPatternFirst) { setSetupPatternFirst(pattern); return; }
    if (pattern === setupPatternFirst) {
      if (account!.role === "customer") {
        updateCustomerAuth(account!.id, "pattern", pattern);
        setPattern(pattern); setPin(null);
      } else {
        updateAccountAuth(account!.role as "operator" | "courier", account!.id, "pattern", pattern);
      }
      localStorage.setItem(SAVED_PHONE_KEY, phone);
      onLogin(account!.role, account!.id, account!.name, normalizePhone(phone));
    } else {
      setSetupPatternFirst("");
      setSetupError("Pattern таарсангүй. Дахин зурна уу.");
      setTimeout(() => setSetupError(""), 1500);
    }
  }

  // ── Register helpers ─────────────────────────────────────────────
  async function handlePinEntry(pin: string) {
    if (!pinFirst) { setPinFirst(pin); return; }
    if (pin === pinFirst) {
      try {
        if (mode === "courier") {
          const id = await registerCourier({ name: rName.trim(), phone: normalizePhone(rPhone), vehicle: rVehicle, authMethod: "pin", authKey: pin });
          localStorage.setItem(SAVED_PHONE_KEY, rPhone);
          onLogin("courier", id, rName.trim(), normalizePhone(rPhone));
          return;
        }
        const id = await addCustomer({ name: rName.trim(), phone: normalizePhone(rPhone), authMethod: "pin", authKey: pin });
        setPin(pin); setPattern(null);
        localStorage.setItem(SAVED_PHONE_KEY, rPhone);
        onLogin("customer", id, rName.trim(), normalizePhone(rPhone));
      } catch (e) {
        setPinFirst("");
        setRegError(e instanceof Error ? e.message : "Бүртгэхэд алдаа гарлаа. Дахин оролдоно уу.");
      }
    } else {
      setPinFirst("");
      setRegError("PIN таарсангүй. Дахин оруулна уу.");
      setTimeout(() => setRegError(""), 1500);
    }
  }

  async function handlePatternEntry(pattern: string) {
    if (!patternFirst) { setPatternFirst(pattern); return; }
    if (pattern === patternFirst) {
      try {
        if (mode === "courier") {
          const id = await registerCourier({ name: rName.trim(), phone: normalizePhone(rPhone), vehicle: rVehicle, authMethod: "pattern", authKey: pattern });
          localStorage.setItem(SAVED_PHONE_KEY, rPhone);
          onLogin("courier", id, rName.trim(), normalizePhone(rPhone));
          return;
        }
        const id = await addCustomer({ name: rName.trim(), phone: normalizePhone(rPhone), authMethod: "pattern", authKey: pattern });
        setPattern(pattern); setPin(null);
        localStorage.setItem(SAVED_PHONE_KEY, rPhone);
        onLogin("customer", id, rName.trim(), normalizePhone(rPhone));
      } catch (e) {
        setPatternFirst("");
        setRegError(e instanceof Error ? e.message : "Бүртгэхэд алдаа гарлаа. Дахин оролдоно уу.");
      }
    } else {
      setPatternFirst("");
      setRegError("Pattern таарсангүй. Дахин зурна уу.");
      setTimeout(() => setRegError(""), 1500);
    }
  }

  function resetRegister() {
    setRName(""); setRPhone("");
    setRegStep("info");
    setPinFirst(""); setPatternFirst("");
    setRegError("");
  }

  // ── Logo bar ─────────────────────────────────────────────────────
  function Logo() {
    return <div className="mb-6"><AppLogo /></div>;
  }

  // ── PHONE INPUT ───────────────────────────────────────────────────
  // Дугаараар role автоматаар тодорхойлогдоно (үйлчлүүлэгч, хүргэгч,
  // оператор, партнёр, админ). Бүртгэлгүй бол шууд бүртгэл рүү шилжинэ.
  if (screen === "phone") {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-6 max-w-sm mx-auto w-full">
        {onBack ? (
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 self-start -ml-1 py-1">
            <ArrowLeft className="w-4 h-4" /> Нүүр хуудас
          </button>
        ) : <div className="h-6" />}
        <Logo />

        <h2 className="text-[1.75rem] font-extrabold leading-tight">
          {mode === "courier" ? "Хүргэгчээр нэвтрэх" : "Тавтай морил"}
        </h2>
        <p className="text-muted-foreground text-sm mt-1.5 mb-8 leading-relaxed">
          Утасны дугаараа оруулна уу. Бүртгэлгүй бол шууд бүртгүүлнэ.
        </p>

        <div className="space-y-3 flex-1">
          <div>
            <label htmlFor="login-phone" className="text-xs font-medium text-muted-foreground block mb-1.5">Утасны дугаар</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium tabular">+976</span>
              <input
                id="login-phone"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                placeholder={savedPhone || "9900 0000"}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                autoFocus
                className="w-full bg-card border border-border rounded-2xl pl-16 pr-4 py-4 text-lg font-semibold tracking-wide tabular focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition"
              />
            </div>
            {phoneError && <p className="text-xs text-destructive mt-2">{phoneError}</p>}
            {savedPhone && !phone && (
              <button
                onClick={() => { setPhone(savedPhone); setPhoneError(""); }}
                className="mt-3 w-full flex items-center justify-between bg-secondary/60 hover:bg-secondary rounded-xl px-3.5 py-2.5 text-sm transition-colors"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Smartphone className="w-4 h-4" /> Сүүлд нэвтэрсэн
                </span>
                <span className="font-semibold tabular">{savedPhone}</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handlePhoneSubmit}
            disabled={!isValidPhone(phone) || submitting}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Spinner className="w-4 h-4" /> : <>Үргэлжлүүлэх <ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Оператор, партнёр, админ бүгд энэ дэлгэцээс өөрийн дугаараар нэвтэрнэ
          </p>
        </div>
      </div>
    );
  }

  // ── AUTH ──────────────────────────────────────────────────────────
  if (screen === "auth" && account) {
    const locked = countdown > 0;
    const isLongLock = failCount >= MAX_ATTEMPTS;
    const lockMsg = isLongLock
      ? `Хэт олон буруу оролдлого. ${Math.floor(countdown / 60)}м ${countdown % 60}с хүлээнэ үү.`
      : `Дараагийн оролдлого ${countdown}с-д боломжтой.`;

    // Password (superadmin)
    if (authStep === "password") {
      return (
        <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
          <button onClick={() => setScreen("phone")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 self-start">
            <ArrowLeft className="w-4 h-4" /> Буцах
          </button>
          <Logo />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>{account.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Smartphone className="w-3 h-3" />{phone}</div>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Нууц үг</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && !locked && verifyAuth(password)}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {authError && <p className="text-xs text-red-400">{authError}</p>}
            {locked && <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 text-xs text-orange-400">{lockMsg}</div>}
          </div>

          <div className="mt-6">
            <button
              onClick={() => verifyAuth(password)}
              disabled={!password || locked}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              {locked ? `${countdown}с хүлээнэ үү` : "Нэвтрэх"}
            </button>
          </div>
        </div>
      );
    }

    // PIN
    if (authStep === "pin") {
      return (
        <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
          <button onClick={() => setScreen("phone")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 self-start">
            <ArrowLeft className="w-4 h-4" /> Буцах
          </button>
          <Logo />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>{account.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Smartphone className="w-3 h-3" />{phone}</div>
            </div>
          </div>
          {locked && <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 text-xs text-orange-400 mb-3">{lockMsg}</div>}
          <PinPad
            title="PIN оруулах"
            subtitle="Бүртгэлийн PIN кодоо оруулна уу"
            error={authError || undefined}
            onComplete={locked ? () => {} : verifyAuth}
          />
        </div>
      );
    }

    // Pattern
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
        <button onClick={() => setScreen("phone")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 self-start">
          <ArrowLeft className="w-4 h-4" /> Буцах
        </button>
        <Logo />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Grid3x3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>{account.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Smartphone className="w-3 h-3" />{phone}</div>
          </div>
        </div>
        {locked && <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 text-xs text-orange-400 mb-3">{lockMsg}</div>}
        <PatternLock
          title="Pattern зурах"
          subtitle="Бүртгэлийн pattern-ээ зурна уу"
          error={authError || undefined}
          onComplete={locked ? () => {} : verifyAuth}
        />
      </div>
    );
  }

  // ── FIRST-LOGIN SETUP ─────────────────────────────────────────────
  if (screen === "first-setup" && account) {
    const greeting = account.name.split(".").pop()?.trim() ?? account.name;

    if (setupStep === "choose") {
      return (
        <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
          <Logo />
          <div className="mb-8">
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem" }}>
              {account.role === "customer" ? `Сайн байна уу, ${greeting}!` : `Тавтай морил, ${greeting}!`}
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              {account.role === "customer"
                ? "Таны нууцлал цэвэрлэгдсэн байна. Шинэ PIN эсвэл Pattern-аа тохируулна уу."
                : "Анхны нэвтрэлт амжилттай. Цаашид ашиглах нууцлалаа тохируулна уу."}
            </p>
          </div>
          <div className="space-y-3 flex-1">
            <button
              onClick={() => { setSetupPinFirst(""); setSetupStep("pin"); }}
              className="w-full bg-card border border-border hover:border-primary/50 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-secondary/30 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Hash className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>4 оронтой PIN</div>
                <div className="text-xs text-muted-foreground mt-0.5">Тоон код ашиглан нэвтрэх</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </button>
            <button
              onClick={() => { setSetupPatternFirst(""); setSetupStep("pattern"); }}
              className="w-full bg-card border border-border hover:border-primary/50 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-secondary/30 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Grid3x3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>Pattern зурах</div>
                <div className="text-xs text-muted-foreground mt-0.5">Цэгүүдийг холбож нэвтрэх</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </button>
          </div>
        </div>
      );
    }

    if (setupStep === "pin") {
      return (
        <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
          <button onClick={() => setSetupStep("choose")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 self-start">
            <ArrowLeft className="w-4 h-4" /> Буцах
          </button>
          <Logo />
          <PinPad
            title={setupPinFirst ? "PIN баталгаажуулах" : "PIN тохируулах"}
            subtitle={setupPinFirst ? "Дахин оруулж баталгаажуулна уу" : "4 оронтой PIN оруулна уу"}
            error={setupError || undefined}
            onComplete={handleSetupPin}
          />
        </div>
      );
    }

    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
        <button onClick={() => setSetupStep("choose")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 self-start">
          <ArrowLeft className="w-4 h-4" /> Буцах
        </button>
        <Logo />
        <PatternLock
          title={setupPatternFirst ? "Pattern баталгаажуулах" : "Pattern тохируулах"}
          subtitle={setupPatternFirst ? "Дахин зуран баталгаажуулна уу" : "Дор хаяж 4 цэг холбоно уу"}
          error={setupError || undefined}
          onComplete={handleSetupPattern}
        />
      </div>
    );
  }

  // ── REGISTER ──────────────────────────────────────────────────────
  const stepLabels = ["Мэдээлэл", "Нууцлал", "Баталгаа"];
  const stepIndex = regStep === "info" ? 0 : regStep === "choose" ? 1 : 2;

  function RegHeader({ onBack }: { onBack: () => void }) {
    return (
      <>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 self-start">
          <ArrowLeft className="w-4 h-4" /> Буцах
        </button>
        <Logo />
        <div className="flex items-center gap-2 mb-6">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${i <= stepIndex ? "text-primary" : "text-muted-foreground/40"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${i < stepIndex ? "bg-primary text-white" : i === stepIndex ? "bg-primary/20 text-primary border border-primary" : "bg-muted text-muted-foreground/40"}`}>
                  {i < stepIndex ? <CheckCircle className="w-3 h-3" /> : i + 1}
                </div>
                {label}
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-px w-6 transition-colors ${i < stepIndex ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (screen === "register" && regStep === "info") {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
        <RegHeader onBack={() => { resetRegister(); setScreen("phone"); }} />
        <h2 className="text-[1.75rem] font-extrabold leading-tight">Бүртгүүлэх</h2>
        <p className="text-muted-foreground text-sm mt-1 mb-6">
          {mode === "courier"
            ? "Бүртгүүлсний дараа баримт бичгээ оруулна"
            : "Нэг удаа бүртгүүлж, хурдан захиалаарай"}
        </p>
        <div className="space-y-4 flex-1">
          {/* Бүртгэлийн төрөл — шинэ дугаар бол энд л сонгоно */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-2xl" role="radiogroup" aria-label="Бүртгэлийн төрөл">
            {([
              { key: "customer", label: "Үйлчлүүлэгч", icon: User },
              { key: "courier", label: "Хүргэгч", icon: Truck },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="radio"
                aria-checked={mode === key}
                onClick={() => setMode(key)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Овог нэр</label>
            <input
              value={rName}
              onChange={(e) => setRName(e.target.value)}
              placeholder="Б. Болд"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Утасны дугаар</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={rPhone}
                onChange={(e) => setRPhone(e.target.value)}
                placeholder="99000000"
                type="tel"
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
          {mode === "courier" && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Тээврийн хэрэгсэл</label>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setRVehicle(v.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      rVehicle === v.key
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span>{v.emoji}</span> {v.key}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
            {mode === "courier"
              ? "Жолооч захиалга авахын өмнө баримт бичиг нь шалгагдаж баталгаажна"
              : "Бүртгүүлснээр үйлчилгээний нөхцөлийг зөвшөөрсөнд тооцогдоно"}
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => setRegStep("choose")}
            disabled={!rName.trim() || !isValidPhone(rPhone)}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            Үргэлжлүүлэх <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => { resetRegister(); setScreen("phone"); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            Бүртгэлтэй юу? <span className="text-primary underline">Нэвтрэх</span>
          </button>
        </div>
      </div>
    );
  }

  if (screen === "register" && regStep === "choose") {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
        <RegHeader onBack={() => setRegStep("info")} />
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.6rem" }}>Нууцлал сонгох</h2>
        <p className="text-muted-foreground text-sm mt-1 mb-8">Аппыг хамгаалах аргаа сонгоорой</p>
        <div className="space-y-3 flex-1">
          <button
            onClick={() => { setPinFirst(""); setRegStep("pin"); }}
            className="w-full bg-card border border-border hover:border-primary/50 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-secondary/30 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Hash className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>4 оронтой PIN</div>
              <div className="text-xs text-muted-foreground mt-0.5">Тоон код ашиглан нэвтрэх</div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
          <button
            onClick={() => { setPatternFirst(""); setRegStep("pattern"); }}
            className="w-full bg-card border border-border hover:border-primary/50 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-secondary/30 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Grid3x3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>Pattern зурах</div>
              <div className="text-xs text-muted-foreground mt-0.5">Цэгүүдийг холбож нэвтрэх</div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </div>
      </div>
    );
  }

  if (screen === "register" && regStep === "pin") {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
        <RegHeader onBack={() => { setPinFirst(""); setRegStep("choose"); }} />
        <PinPad
          title={pinFirst ? "PIN баталгаажуулах" : "PIN тохируулах"}
          subtitle={pinFirst ? "Дахин оруулж баталгаажуулна уу" : "4 оронтой PIN оруулна уу"}
          error={regError || undefined}
          onComplete={handlePinEntry}
        />
      </div>
    );
  }

  if (screen === "register" && regStep === "pattern") {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col px-5 py-8 max-w-sm mx-auto w-full" style={{ fontFamily: "var(--font-body)" }}>
        <RegHeader onBack={() => { setPatternFirst(""); setRegStep("choose"); }} />
        <PatternLock
          title={patternFirst ? "Pattern баталгаажуулах" : "Pattern тохируулах"}
          subtitle={patternFirst ? "Дахин зуран баталгаажуулна уу" : "Дор хаяж 4 цэг холбоно уу"}
          error={regError || undefined}
          onComplete={handlePatternEntry}
        />
      </div>
    );
  }

  return null;
}
