import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY;
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

export type PushRole = "customer" | "operator" | "courier";

// Хэрэглэгч мэдэгдлийг идэвхжүүлэхэд: SW бүртгэх → зөвшөөрөл асуух →
// push-д subscribe хийх → subscription-г DB-д хадгалах (Edge Function
// үүгээр дамжуулж мэдэгдэл илгээнэ).
export async function subscribeToPush(role: PushRole, userId: string): Promise<void> {
  if (!pushSupported()) throw new Error("Энэ browser push мэдэгдэл дэмждэггүй.");
  if (!VAPID_PUBLIC_KEY) throw new Error("Push тохиргоо дутуу байна (.env файлд VITE_VAPID_PUBLIC_KEY оруулна уу).");

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Мэдэгдлийн зөвшөөрөл өгөгдөөгүй байна.");

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint!,
      role,
      user_id: userId,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
      created_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

// Тухайн төхөөрөмж дээр аль хэдийн subscribe хийсэн эсэхийг шалгах
// (жиш нь Settings хуудас нээгдэх бүрд UI-г зөв төлөвт харуулах).
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  return !!subscription;
}
