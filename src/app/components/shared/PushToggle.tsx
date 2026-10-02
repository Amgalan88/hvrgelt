import { HEADER_ICON_BTN } from "./RoleHeader";
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { pushConfigured, pushSupported, notificationPermission, subscribeToPush, unsubscribeFromPush, isSubscribed, type PushRole } from "../../lib/push";

interface PushToggleProps {
  role: PushRole;
  userId: string;
  className?: string;
}

// Header дээр байрлах компакт push мэдэгдлийн товч (operator/courier-д зориулав).
// Хэрэглэгчийн Settings хуудсан дээрх бүрэн блокоос ялгаатай, зөвхөн icon.
export function PushToggle({ role, userId, className }: PushToggleProps) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isSubscribed().then(setOn);
  }, []);

  if (!pushConfigured() || !pushSupported()) return null;

  const denied = notificationPermission() === "denied";

  async function handleClick() {
    if (busy || denied) return;
    setBusy(true);
    try {
      if (on) {
        await unsubscribeFromPush();
        setOn(false);
      } else {
        await subscribeToPush(role, userId);
        setOn(true);
      }
    } catch {
      // Товч дээрээ л алдааг чимээгүй харуулна — header дотор дэлгэрэнгүй error UI-д зай багатай
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy || denied}
      title={denied ? "Мэдэгдэл хориглогдсон — browser тохиргооноос зөвшөөрнө үү" : on ? "Push мэдэгдэл идэвхтэй" : "Push мэдэгдэл идэвхжүүлэх"}
      aria-label="Push мэдэгдэл"
      className={`${HEADER_ICON_BTN} ${className ?? ""}`}
    >
      {on ? <BellRing className="w-[18px] h-[18px] text-primary" /> : denied ? <BellOff className="w-[18px] h-[18px]" /> : <Bell className="w-[18px] h-[18px]" />}
    </button>
  );
}
