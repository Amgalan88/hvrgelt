import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Copy, Check, Download, MoreHorizontal, X, Zap } from "lucide-react";
import { isInAppBrowser, useInstall } from "../../lib/install";
import { IosInstallSheet } from "./InstallApp";
import { LogoMark } from "./Logo";

type Role = "customer" | "courier" | "operator" | "partner" | "superadmin";

const COPY: Record<Role, string> = {
  customer: "Нүүр дэлгэцээсээ нэг товшоод захиална. Хүргэгч хаана явааг мэдэгдлээр авна.",
  courier: "Апп хаалттай байсан ч ойр захиалгын санал дуут дохиотой ирнэ — санал алгасахгүй.",
  operator: "Шинэ захиалга ирэхэд апп хаалттай байсан ч мэдэгдэл ирнэ.",
  partner: "Захиалгаа нүүр дэлгэцээсээ шууд нээж харна.",
  superadmin: "Шинэ хүргэгч шалгалт хүлээж байвал мэдэгдэл ирнэ.",
};

const DISMISS_KEY = "hvrgelt_install_asked_at";
/** "Дараа" дарсан бол хэд хоногийн дараа дахин асуух */
const ASK_AGAIN_MS = 3 * 24 * 3600_000;

function recentlyAsked(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < ASK_AGAIN_MS;
  } catch {
    return true;
  }
}

/**
 * Нэвтэрсний дараа апп суулгаагүй бол нэг удаа асууна.
 *  • Android, компьютер (Chrome, Edge) — "Суулгах" дармагц системийн цонх
 *  • iPhone (Safari) — "Нүүр дэлгэцэнд нэмэх" заавар
 *  • Facebook, Messenger, Instagram доторх хөтөч — суулгах боломжгүй тул
 *    жинхэнэ хөтчөөр нээх заавар
 * Суулгасан, эсвэл сүүлийн 3 хоногт асуусан бол харуулахгүй.
 */
export function InstallPrompt({ role }: { role: Role }) {
  const { mode, install } = useInstall();
  const inApp = isInAppBrowser();
  const [open, setOpen] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canOffer = mode === "prompt" || mode === "ios" || (inApp && mode !== "installed");

  // Нэвтэрмэгц шууд биш — дэлгэц ачаалсны дараа
  useEffect(() => {
    if (!canOffer || recentlyAsked()) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [canOffer]);

  function later() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* хадгалах боломжгүй */ }
    setOpen(false);
  }

  async function onInstall() {
    if (mode === "ios") {
      setOpen(false);
      setIosOpen(true);
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
      return;
    }
    const ok = await install();
    if (!ok) later();
    else setOpen(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      /* хуулах боломжгүй — заавраас гараар нээнэ */
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[115] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={later}
          >
            <motion.div
              role="dialog"
              aria-label="Апп суулгах"
              className="bg-card text-foreground w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              initial={{ y: 48 }}
              animate={{ y: 0 }}
              exit={{ y: 48 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <LogoMark size={52} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg leading-tight">Апп-аа суулгах уу?</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{COPY[role]}</p>
                </div>
                <button onClick={later} aria-label="Хаах" className="text-muted-foreground hover:text-foreground p-1 -m-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {inApp ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm bg-amber-500/10 border border-amber-500/30 rounded-2xl px-3.5 py-3 leading-snug">
                    Facebook, Messenger дотроос апп суулгах боломжгүй. Баруун дээд буланд{" "}
                    <MoreHorizontal className="inline w-4 h-4 -mt-0.5" /> дараад <b>«Хөтчөөр нээх»</b> (Open in browser)-ийг сонгоно уу.
                  </p>
                  <button
                    onClick={() => void copyLink()}
                    className="w-full border border-border py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  >
                    {copied ? <><Check className="w-4 h-4 text-green-600" /> Хуулагдлаа — хөтөчдөө наана уу</> : <><Copy className="w-4 h-4" /> Хаягийг хуулах</>}
                  </button>
                  <button onClick={later} className="w-full text-sm text-muted-foreground py-1.5">Дараа</button>
                </div>
              ) : (
                <>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2.5"><Zap className="w-4 h-4 text-primary shrink-0" /> Нүүр дэлгэцээс шууд нээгдэнэ, хурдан</li>
                    <li className="flex items-center gap-2.5"><Bell className="w-4 h-4 text-primary shrink-0" /> Апп хаалттай байсан ч мэдэгдэл ирнэ</li>
                  </ul>
                  <div className="mt-5 grid grid-cols-[1fr_2fr] gap-2">
                    <button onClick={later} className="border border-border py-3.5 rounded-2xl font-semibold text-muted-foreground">Дараа</button>
                    <button
                      onClick={() => void onInstall()}
                      className="bg-primary text-primary-foreground py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Суулгах
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  );
}
