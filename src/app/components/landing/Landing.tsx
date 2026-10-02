import { motion } from "motion/react";
import { ArrowRight, Phone, Clock, MapPin, Truck, Zap, Users, ShieldCheck } from "lucide-react";
import { Logo } from "../shared/Logo";
import { SERVICES } from "../customer/services";
import { PHONES, WORK_HOURS, CITY, SOCIAL, SITE } from "../../lib/contact";

export type LegalKey = "terms" | "privacy" | "about" | "contact";

interface LandingProps {
  /** Нэвтэрсэн session байгаа эсэх — товчны бичиг өөрчлөгдөнө */
  hasSession: boolean;
  /** Захиалагчаар эсвэл жолоочоор эхлэх */
  onStart: (mode: "customer" | "courier") => void;
  onLegal: (page: LegalKey) => void;
}

const STATS = [
  { icon: Zap, value: "30 сек", label: "захиалга өгөх" },
  { icon: Clock, value: "30 мин", label: "дунджаар хүргэнэ" },
  { icon: Users, value: "30+", label: "хүргэгч" },
];

const STEPS = [
  { title: "Хаягаа оруулна", body: "Авах, хүргэх хаяг болон үйлчилгээгээ сонгоно." },
  { title: "Үнээ батална", body: "Оператор үнийг тогтоож, та апп дээрээ зөвшөөрнө." },
  { title: "Хүргэгч ирнэ", body: "Хамгийн ойр байгаа хүргэгч томилогдож ачааг авна." },
  { title: "Явцыг харна", body: "Ачаа хаана явааг бодит цагт апп дээрээ хянана." },
];

function FacebookIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

/** Нийтэд нээлттэй нүүр хуудас — нэвтрээгүй зочинд харагдана */
export function Landing({ hasSession, onStart, onLegal }: LandingProps) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-b-[2rem] bg-[#0b0d12]">
        <img src="/banner.jpg" alt="Дархан хот" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(11,13,18,0.35) 0%, rgba(11,13,18,0.55) 40%, rgba(11,13,18,0.96) 100%)" }}
        />

        <div className="relative z-10 max-w-xl mx-auto px-5 pt-5 pb-8 min-h-[min(88dvh,760px)] flex flex-col">
          <nav className="flex items-center justify-between">
            <Logo textColor="#fff" />
            <button
              onClick={() => onStart("customer")}
              className="text-sm font-semibold text-white bg-white/12 hover:bg-white/20 border border-white/20 backdrop-blur px-4 py-1.5 rounded-full transition-colors"
            >
              {hasSession ? "Апп руу" : "Нэвтрэх"}
            </button>
          </nav>

          <motion.div
            className="mt-auto space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs text-white/85">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
              Дархан хотын 65 жилийн ойд зориулав
            </span>

            <h1 className="text-white" style={{ fontWeight: 800, fontSize: "clamp(2.4rem, 11vw, 3.4rem)", lineHeight: 1.02, letterSpacing: "-0.035em" }}>
              Хурдан.<br />Найдвартай.<br />
              <span style={{ color: "var(--brand)" }}>Дархандаа.</span>
            </h1>

            <p className="text-white/70 text-[15px] leading-relaxed max-w-sm">
              Илгээмж, хүнд ачаа, крантай машин хүртэл — нэг апп-аас 30 секундэд захиалж, хүргэлтээ бодит цагт хянаарай.
            </p>

            <div className="space-y-2.5 pt-1">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onStart("customer")}
                className="w-full bg-[var(--brand)] text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-base shadow-[0_8px_24px_-8px_rgba(232,83,28,0.7)] hover:brightness-105 transition"
              >
                {hasSession ? "Үргэлжлүүлэх" : "Захиалга өгөх"} <ArrowRight className="w-5 h-5" />
              </motion.button>
              {!hasSession && (
                <button
                  onClick={() => onStart("courier")}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/20 text-white/90 hover:bg-white/10 transition-colors text-sm font-semibold"
                >
                  <Truck className="w-4 h-4" /> Хүргэгч болж орлого олох
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
              {PHONES.slice(0, 2).map((p) => (
                <a key={p.tel} href={`tel:${p.tel}`} className="flex items-center gap-1.5 text-white font-bold tabular hover:text-[var(--brand)] transition-colors">
                  <Phone className="w-4 h-4" /> {p.label}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <main className="max-w-xl mx-auto px-5 space-y-12 py-10">
        {/* ── Тоон үзүүлэлт ── */}
        <section className="grid grid-cols-3 gap-2.5">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-card border border-border rounded-2xl px-3 py-4 text-center">
              <Icon className="w-4 h-4 text-primary mx-auto" />
              <p className="mt-2 font-extrabold text-xl tracking-tight tabular">{value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </section>

        {/* ── Үйлчилгээ ── */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Үйлчилгээ</p>
            <h2 className="text-2xl font-extrabold mt-1">Юу хүргэх вэ?</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {SERVICES.map((sv) => (
              <button
                key={sv.id}
                onClick={() => onStart("customer")}
                className="bg-card border border-border rounded-2xl p-3.5 text-left hover:border-primary/50 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl">{sv.emoji}</span>
                <span className="block mt-2.5 text-sm font-semibold leading-snug">{sv.label}</span>
                <span className="block mt-0.5 text-xs text-muted-foreground leading-snug">{sv.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Хэрхэн ажилладаг ── */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Хэрхэн ажилладаг</p>
            <h2 className="text-2xl font-extrabold mt-1">Дөрвөн алхам</h2>
          </div>
          <ol className="bg-card border border-border rounded-2xl p-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3.5 p-3">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 tabular">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="font-semibold text-[15px]">{s.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Хүргэгч болох ── */}
        {!hasSession && (
          <section className="relative overflow-hidden rounded-2xl bg-[#16181d] text-white p-6">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[var(--brand)]/25 blur-2xl" />
            <div className="relative space-y-3">
              <ShieldCheck className="w-6 h-6 text-[var(--brand)]" />
              <h2 className="text-xl font-extrabold">Хүргэгч болох уу?</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Өөрийн машин, мотоцикл, дугуйгаараа чөлөөт цагтаа хүргэлт хийж орлого олоорой. Бүртгүүлээд баримт бичгээ оруулахад л болно.
              </p>
              <button
                onClick={() => onStart("courier")}
                className="inline-flex items-center gap-2 bg-white text-[#16181d] font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
              >
                Бүртгүүлэх <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ── Холбоо барих ── */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Холбоо барих</p>
            <h2 className="text-2xl font-extrabold mt-1">Утсаар ч захиалж болно</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            {PHONES.map((p) => (
              <a key={p.tel} href={`tel:${p.tel}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-secondary/50 transition-colors first:rounded-t-2xl">
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-[15px] tabular">{p.label}</span>
                </span>
                <span className="text-xs font-semibold text-primary">Залгах</span>
              </a>
            ))}
            <div className="flex items-center gap-4 px-4 py-3.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {WORK_HOURS}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {CITY}</span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-xl mx-auto px-5 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              <a href={SOCIAL.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"
                className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <FacebookIcon />
              </a>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <InstagramIcon />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <button onClick={() => onLegal("about")} className="hover:text-foreground transition-colors">Бидний тухай</button>
            <button onClick={() => onLegal("contact")} className="hover:text-foreground transition-colors">Холбоо барих</button>
            <button onClick={() => onLegal("terms")} className="hover:text-foreground transition-colors">Үйлчилгээний нөхцөл</button>
            <button onClick={() => onLegal("privacy")} className="hover:text-foreground transition-colors">Нууцлал</button>
          </div>
          <p className="text-xs text-muted-foreground/70">© {year} {SITE}</p>
        </div>
      </footer>
    </div>
  );
}
