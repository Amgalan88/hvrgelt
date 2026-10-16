// Апп суулгах (PWA).
//
// Android/компьютер дээр Chrome, Edge нь "beforeinstallprompt" үйл явдал
// өгдөг — түүнийг хадгалж аваад өөрсдийн товчоор суулгах цонхыг нээнэ.
// iPhone/iPad (Safari) энэ API-гүй тул "Хуваалцах → Нүүр дэлгэцэнд нэмэх"
// заавар харуулна. iPhone дээр push мэдэгдэл зөвхөн суулгасан апп-д ирдэг.

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** main.tsx-ээс React ачаалахаас өмнө дуудна — үйл явдал эрт ирдэг */
export function initInstallCapture() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/** Service worker-ийг эхлэхэд бүртгэнэ — суулгах болон push-д хэрэгтэй */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW бүртгэгдээгүй ч апп ажиллана */
    });
  });
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/**
 * Facebook, Messenger, Instagram зэрэг апп доторх хөтөч — апп суулгах,
 * push мэдэгдэл авах боломжгүй. Холбоосыг ихэвчлэн эндээс нээдэг.
 */
export function isInAppBrowser(): boolean {
  return /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\/|MicroMessenger|TikTok|Snapchat/i.test(navigator.userAgent);
}

export type InstallMode = "prompt" | "ios" | "installed" | "unavailable";

/** Энэ төхөөрөмж дээр апп-ыг яаж суулгах вэ */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const mode: InstallMode = isStandalone()
    ? "installed"
    : deferred
      ? "prompt"
      : isIOS()
        ? "ios"
        : "unavailable";

  async function install(): Promise<boolean> {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    notify();
    return outcome === "accepted";
  }

  return { mode, install };
}
