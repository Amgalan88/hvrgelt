import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { pushConfigured, pushSupported, notificationPermission, subscribeToPush, isSubscribed, type PushRole } from "../../lib/push";
import { isIOS, isStandalone } from "../../lib/install";
import { InstallButton } from "./InstallApp";

type State = "hidden" | "off" | "ios-install" | "denied";

const COPY: Record<PushRole, { title: string; body: string }> = {
  customer: {
    title: "Явцыг мэдэгдлээр авах",
    body: "Үнэ гарах, хүргэгч томилогдох, ачаа ирэх үед утсанд тань мэдэгдэл очно.",
  },
  courier: {
    title: "Шинэ захиалгын мэдэгдэл асаах",
    body: "Танд захиалга томилогдоход апп хаалттай байсан ч утас дуугарна.",
  },
  operator: {
    title: "Шинэ захиалгын мэдэгдэл асаах",
    body: "Шинэ захиалга орж ирэхэд апп хаалттай байсан ч мэдэгдэл ирнэ.",
  },
};

/**
 * Push мэдэгдлийг хэрэгтэй мөчид нь санал болгоно. Асаалттай, тохиргоо
 * дутуу (VAPID түлхүүргүй), эсвэл дэмжихгүй хөтөч дээр юу ч харуулахгүй.
 * iPhone дээр мэдэгдэл зөвхөн суулгасан апп-д ирдэг тул суулгахыг санал болгоно.
 */
export function NotifyCard({ role, userId }: { role: PushRole; userId: string }) {
  const [state, setState] = useState<State>("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pushConfigured()) return;
      if (!pushSupported()) {
        if (alive && isIOS() && !isStandalone()) setState("ios-install");
        return;
      }
      if (notificationPermission() === "denied") {
        if (alive) setState("denied");
        return;
      }
      const on = await isSubscribed();
      if (alive) setState(on ? "hidden" : "off");
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError("");
    try {
      await subscribeToPush(role, userId);
      setState("hidden");
    } catch (e) {
      if (notificationPermission() === "denied") setState("denied");
      else setError(e instanceof Error ? e.message : "Мэдэгдэл асааж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "hidden") return null;

  if (state === "denied") {
    return (
      <p className="text-xs text-muted-foreground text-center px-4">
        Мэдэгдэл хаалттай байна. Хөтчийн тохиргооноос энэ сайтад мэдэгдэл зөвшөөрөхөд явцаа мэдэгдлээр авна.
      </p>
    );
  }

  const copy = COPY[role];
  return (
    <div className="bg-card border border-primary/30 rounded-2xl p-4 flex gap-3">
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <BellRing className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0 space-y-2.5">
        <div>
          <p className="font-semibold leading-tight">{copy.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {state === "ios-install" ? "iPhone дээр мэдэгдэл авахын тулд эхлээд апп-аа нүүр дэлгэцэндээ суулгана уу." : copy.body}
          </p>
        </div>
        {state === "ios-install" ? (
          <InstallButton variant="inline" className="text-sm py-2.5" />
        ) : (
          <button
            onClick={enable}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />} Мэдэгдэл асаах
          </button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
