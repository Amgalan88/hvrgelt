import { InstallButton } from "../shared/InstallApp";
import { motion } from "motion/react";
import {
  ArrowRight, Phone, Clock, MapPin, Truck, Package, Zap, BadgeCheck, Smartphone, Bike, IdCard, Navigation, type LucideIcon,
} from "lucide-react";
import { Logo, LogoMark } from "../shared/Logo";
import { SERVICES } from "../customer/services";
import { SERVICE_ICON } from "../customer/serviceIcons";
import { PHONES, WORK_HOURS, CITY, SOCIAL, SITE, COMPANY } from "../../lib/contact";

export type LegalKey = "terms" | "privacy" | "about" | "contact";

interface LandingProps {
  /** Нэвтэрсэн session байгаа эсэх — товчны бичиг өөрчлөгдөнө */
  hasSession: boolean;
  /** Захиалагчаар эсвэл хүргэгчээр эхлэх */
  onStart: (mode: "customer" | "courier") => void;
  onLegal: (page: LegalKey) => void;
}


/** Хүргэгчийн авах хувь — CourierApp-д price * 0.8 гэж тооцогддог */
const COURIER_SHARE = "80%";

const FACTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Zap, title: "30 секунд", body: "захиалга өгөхөд" },
  { icon: Clock, title: "~30 минут", body: "хотын дотор хүргэлт" },
  { icon: Navigation, title: "Бодит цагт", body: "хүргэгчээ газрын зураг дээр" },
  { icon: BadgeCheck, title: "Шалгагдсан", body: "хүргэгч бүр баримттай" },
];

const STEPS = [
  { title: "Хаягаа оруулна", body: "Юу, хаанаас, хаашаа хүргэхээ гурван асуултаар хэлнэ. Газрын зураг дээр цэгээ заавал хүргэгч шууд олно." },
  { title: "Үнээ зөвшөөрнө", body: "Оператор үнийг тогтооно. Та апп дээрээ зөвшөөрч төлбөрөө хийнэ." },
  { title: "Хүргэгч ирнэ", body: "Чөлөөтэй хүргэгч томилогдож ачааг авна. Хаана явааг газрын зураг дээр харна." },
  { title: "Хүлээн авна", body: "Хүргэгдсэний дараа хүргэгчээ үнэлж, санал хүсэлтээ үлдээнэ." },
];

const COURIER_NEEDS: { icon: LucideIcon; text: string }[] = [
  { icon: Bike, text: "Явган, дугуй, мопед, мотоцикл эсвэл машин" },
  { icon: Smartphone, text: "Интернэттэй ухаалаг утас" },
  { icon: IdCard, text: "Цээж зураг, үнэмлэх — моторт хэрэгсэлд жолооны үнэмлэх" },
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

/** Апп-ын жинхэнэ эхний дэлгэцийн жижигрүүлсэн загвар — hero-д бүтээгдэхүүнээ харуулна */
function PhonePreview() {
  const rows = SERVICES.slice(0, 5);
  return (
    <div className="relative mx-auto w-[280px] rounded-[2.6rem] bg-[#0b0d12] p-[10px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10" aria-hidden>
      <div className="rounded-[2rem] overflow-hidden bg-[#f7f5f2] text-[#16181d]">
        <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[10px] font-semibold">
          <span>9:41</span>
          <span className="w-16 h-4 rounded-full bg-[#0b0d12]" />
          <span>5G</span>
        </div>
        <div className="flex items-center gap-1.5 px-4 py-2">
          <LogoMark size={20} />
          <span className="text-[11px] font-extrabold tracking-tight">Дархан <span style={{ color: "#ff6028" }}>хүргэлт</span></span>
        </div>
        <div className="mx-3 rounded-2xl bg-[#16181d] text-white p-3.5">
          <p className="text-[9px] text-white/55 text-right">Алхам 1/4</p>
          <p className="text-[17px] font-extrabold leading-tight mt-0.5">Юу хүргүүлэх вэ?</p>
          <p className="text-[9.5px] text-white/60 mt-1">Үйлчилгээгээ сонгоно уу</p>
          <div className="grid grid-cols-4 gap-1 mt-2.5">
            <span className="h-[3px] rounded-full bg-[#ff6028]" />
            <span className="h-[3px] rounded-full bg-white/15" />
            <span className="h-[3px] rounded-full bg-white/15" />
            <span className="h-[3px] rounded-full bg-white/15" />
          </div>
        </div>
        <div className="mx-3 mt-2.5 mb-4 rounded-2xl bg-white border border-black/[0.06] divide-y divide-black/[0.06]">
          {rows.map((sv, i) => {
            const Icon = SERVICE_ICON[sv.id] ?? Package;
            return (
              <div key={sv.id} className={`flex items-center gap-2 px-2.5 py-2 ${i === 0 ? "bg-[#ff6028]/[0.06]" : ""}`}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === 0 ? "bg-[#ff6028]/15 text-[#ff6028]" : "bg-[#efece7] text-[#16181d]"}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] font-semibold leading-tight truncate">{sv.label}</span>
                  <span className="block text-[8.5px] text-[#646976] truncate">{sv.desc}</span>
                </span>
                <ArrowRight className="w-3 h-3 text-[#646976]" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Нийтэд нээлттэй нүүр хуудас — нэвтрээгүй зочинд харагдана */
export function Landing({ hasSession, onStart, onLegal }: LandingProps) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0b0d12] text-white">
        <img src="/banner.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(11,13,18,0.45) 0%, rgba(11,13,18,0.6) 45%, rgba(11,13,18,0.97) 100%)" }}
        />
        <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(90deg, rgba(11,13,18,0.92) 0%, rgba(11,13,18,0.55) 60%, rgba(11,13,18,0.35) 100%)" }} />

        <div className="relative max-w-6xl mx-auto px-5 md:px-8">
          <nav className="flex items-center justify-between py-5">
            <Logo textColor="#fff" />
            <div className="flex items-center gap-2 md:gap-6">
              <a href="#services" className="hidden md:inline text-sm text-white/75 hover:text-white">Үйлчилгээ</a>
              <a href="#how" className="hidden md:inline text-sm text-white/75 hover:text-white">Хэрхэн ажилладаг</a>
              <a href="#couriers" className="hidden md:inline text-sm text-white/75 hover:text-white">Хүргэгч болох</a>
              <button
                onClick={() => onStart("customer")}
                className="text-sm font-semibold bg-white text-[#16181d] hover:bg-white/90 px-4 py-2 rounded-full transition-colors"
              >
                {hasSession ? "Апп руу" : "Нэвтрэх"}
              </button>
            </div>
          </nav>

          <div className="grid md:grid-cols-[1.15fr_1fr] gap-10 items-center pt-16 pb-10 md:pt-14 md:pb-20">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="flex items-center gap-4">
                <img
                  src="/logo-full.png"
                  alt="Дархан хүргэлт — Хурдан. Найдвартай. Дархандаа. 9937 · 8837 · 9637-1961, «Морьтой Бэрс» ХХК"
                  width={112}
                  height={112}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full shadow-2xl ring-4 ring-white/15 shrink-0"
                />
                <p className="text-sm text-white/70">Дархан хотын 65 жилийн ойд зориулав</p>
              </div>
              <h1 className="text-white" style={{ fontWeight: 800, fontSize: "clamp(2.5rem, 7vw, 4.4rem)", lineHeight: 0.98, letterSpacing: "-0.04em" }}>
                Хурдан.<br />Найдвартай.<br />
                <span style={{ color: "var(--brand)" }}>Дархандаа.</span>
              </h1>
              <p className="text-white/75 text-base md:text-lg leading-relaxed max-w-md">
                Илгээмжээс эхлээд крантай машин хүртэл — нэг апп-аас захиалж, хүргэгчээ газрын зураг дээр хянаарай.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onStart("customer")}
                  className="bg-[var(--brand)] text-white px-7 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-base hover:brightness-105 transition"
                >
                  {hasSession ? "Үргэлжлүүлэх" : "Захиалга өгөх"} <ArrowRight className="w-5 h-5" />
                </motion.button>
                {!hasSession && (
                  <button
                    onClick={() => onStart("courier")}
                    className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold transition-colors"
                  >
                    <Truck className="w-4 h-4" /> Хүргэгч болох
                  </button>
                )}
              </div>

              {/* Утсаар захиалах — гурван дугаар бүгд */}
              <div className="pt-2">
                <p className="text-xs text-white/55 mb-2">Утсаар захиалах · {WORK_HOURS}</p>
                <div className="flex flex-wrap gap-2">
                  {PHONES.map((p) => (
                    <a
                      key={p.tel}
                      href={`tel:${p.tel}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 text-sm font-bold tabular transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[var(--brand)]" /> {p.label}
                    </a>
                  ))}
                </div>
                <InstallButton variant="hero" className="mt-4" />
              </div>
            </motion.div>

            <motion.div
              className="hidden md:block"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            >
              <PhonePreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Давуу тал ── */}
      <section className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-5 md:px-8 grid grid-cols-2 md:grid-cols-4">
          {FACTS.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className={`flex items-start gap-3 py-5 md:py-7 ${i % 2 === 1 ? "pl-4 md:pl-6" : "pr-4"} ${i >= 2 ? "border-t md:border-t-0 border-border" : ""} ${i > 0 ? "md:border-l md:border-border md:pl-6" : ""}`}
            >
              <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold text-[15px] leading-tight">{title}</p>
                <p className="text-sm text-muted-foreground leading-snug mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 md:px-8">
        {/* ── Үйлчилгээ ── */}
        <section id="services" className="py-16 md:py-24 scroll-mt-4">
          <div className="max-w-2xl">
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
              Жижиг илгээмжээс хүнд техник хүртэл
            </h2>
            <p className="text-muted-foreground text-base md:text-lg mt-3 leading-relaxed">
              Есөн төрлийн үйлчилгээ нэг дор. Сонгосон үйлчилгээндээ тохирох хүргэгч эсвэл техник томилогдоно.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-10">
            {SERVICES.map((sv) => {
              const Icon = SERVICE_ICON[sv.id] ?? Package;
              return (
                <button
                  key={sv.id}
                  onClick={() => onStart("customer")}
                  className="group flex items-center gap-4 bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold leading-snug">{sv.label}</span>
                    <span className="block text-sm text-muted-foreground mt-0.5 leading-snug">{sv.desc}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Хэрхэн ажилладаг — логоны маршрутын зураасаар ── */}
        <section id="how" className="py-16 md:py-24 border-t border-border scroll-mt-4">
          <div className="max-w-2xl">
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
              Авах цэгээс хүргэх цэг хүртэл
            </h2>
            <p className="text-muted-foreground text-base md:text-lg mt-3 leading-relaxed">
              Захиалга бүр дөрвөн шатаар явна. Аль шатанд явааг апп дээрээ шууд харна.
            </p>
          </div>

          <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
            {/* Цэгэн зам — утсан дээр босоо, компьютер дээр хэвтээ */}
            <span aria-hidden className="absolute left-[9px] top-3 bottom-8 border-l-2 border-dotted border-primary/40 md:hidden" />
            <span aria-hidden className="absolute hidden md:block left-3 right-8 top-[9px] border-t-2 border-dotted border-primary/40" />
            {STEPS.map((s, i) => {
              const last = i === STEPS.length - 1;
              return (
                <li key={s.title} className="relative pl-10 md:pl-0 md:pt-10">
                  <span className="absolute left-0 top-0 md:left-0 flex items-center justify-center w-5 h-5">
                    {i === 0 ? (
                      <span className="w-5 h-5 rounded-full bg-[#12a150] ring-4 ring-background" />
                    ) : last ? (
                      <MapPin className="w-6 h-6 text-primary fill-primary/15 bg-background" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-background border-[3px] border-primary" />
                    )}
                  </span>
                  <p className="font-bold text-lg leading-tight">{s.title}</p>
                  <p className="text-muted-foreground mt-2 leading-relaxed text-[15px]">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── Хүргэгч болох ── */}
        {!hasSession && (
          <section id="couriers" className="py-4 md:py-8 scroll-mt-4">
            <div className="rounded-3xl bg-[#16181d] text-white overflow-hidden grid md:grid-cols-[1.4fr_1fr]">
              <div className="p-7 md:p-12 space-y-6">
                <h2 className="text-white" style={{ fontWeight: 800, fontSize: "clamp(1.7rem, 4vw, 2.4rem)", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
                  Чөлөөт цагаараа хүргэлт хийж орлого ол
                </h2>
                <ul className="space-y-3">
                  {COURIER_NEEDS.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-white/85">
                      <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onStart("courier")}
                  className="inline-flex items-center gap-2 bg-white text-[#16181d] font-bold px-6 py-3.5 rounded-2xl hover:bg-white/90 transition-colors"
                >
                  Хүргэгчээр бүртгүүлэх <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-white/10 p-7 md:p-12 flex flex-col justify-center bg-white/[0.03]">
                <p className="font-extrabold tabular" style={{ fontSize: "clamp(3.5rem, 9vw, 5.5rem)", lineHeight: 1, color: "var(--brand)", letterSpacing: "-0.04em" }}>
                  {COURIER_SHARE}
                </p>
                <p className="text-lg font-semibold mt-3">хүргэлтийн төлбөр танд</p>
                <p className="text-white/60 text-sm mt-2 leading-relaxed">
                  Захиалга бүрийн орлогоо апп дээрээ шууд харна. Баримт бичиг баталгаажсаны дараа захиалга авч эхэлнэ.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Холбоо барих ── */}
        <section className="py-16 md:py-24">
          <div className="grid md:grid-cols-[1fr_1.3fr] gap-8 md:gap-12 items-start">
            <div>
              <h2 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
                Утсаар ч захиалж болно
              </h2>
              <p className="text-muted-foreground text-base md:text-lg mt-3 leading-relaxed">
                Оператор утсаар захиалгыг тань хүлээн авч, апп-д бүртгэнэ.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Өдөр бүр {WORK_HOURS}</span>
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {CITY}</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {PHONES.map((p) => (
                <a
                  key={p.tel}
                  href={`tel:${p.tel}`}
                  className="group flex sm:flex-col items-center sm:items-start justify-between gap-3 bg-card border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Phone className="w-4 h-4" />
                  </span>
                  <span className="flex-1 sm:flex-none font-extrabold text-xl tabular tracking-tight">{p.label}</span>
                  <span className="text-sm font-semibold text-primary">Залгах</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#0b0d12] text-white/70">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo textColor="#fff" />
            <p className="text-sm leading-relaxed max-w-xs">Дархан хотын хүргэлтийн платформ. Үйлчлүүлэгч, хүргэгч, дэлгүүрүүдийг нэг дор холбоно.</p>
            <div className="flex items-center gap-2">
              <a href={SOCIAL.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"
                className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors">
                <FacebookIcon />
              </a>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors">
                <InstagramIcon />
              </a>
            </div>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Үйлчилгээ</p>
            <ul className="space-y-2 text-sm">
              {SERVICES.slice(0, 5).map((sv) => (
                <li key={sv.id}><button onClick={() => onStart("customer")} className="hover:text-white text-left">{sv.label}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Компани</p>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onLegal("about")} className="hover:text-white">Бидний тухай</button></li>
              <li><button onClick={() => onStart("courier")} className="hover:text-white">Хүргэгч болох</button></li>
              <li><button onClick={() => onLegal("terms")} className="hover:text-white">Үйлчилгээний нөхцөл</button></li>
              <li><button onClick={() => onLegal("privacy")} className="hover:text-white">Нууцлалын бодлого</button></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Холбоо барих</p>
            <ul className="space-y-2 text-sm">
              {PHONES.map((p) => (
                <li key={p.tel}><a href={`tel:${p.tel}`} className="hover:text-white tabular">{p.label}</a></li>
              ))}
              <li className="pt-1">Өдөр бүр {WORK_HOURS}</li>
              <li>{CITY}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
            <span>© {year} {COMPANY} · {SITE}. Бүх эрх хуулиар хамгаалагдсан.</span>
            <button onClick={() => onLegal("contact")} className="hover:text-white">Холбоо барих</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
