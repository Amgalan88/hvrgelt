import { NotifyCard } from "../shared/NotifyCard";
import { RoleHeader } from "../shared/RoleHeader";
import { useState, useEffect, useRef } from "react";
import { MapPin, Package, Phone, CheckCircle, LogOut, Star, TrendingUp, ChevronRight, Navigation, Sun, Moon, IdCard, Lock, ShieldAlert } from "lucide-react";
import type { Order, CourierUser, CourierDocs } from "../shared/types";
import type { CourierAccount } from "../shared/store";
import { CourierDocsForm } from "./CourierDocsForm";
import { VEHICLE_ICON, missingDocs } from "../../lib/vehicles";
import { alertNewOrder } from "../../lib/alert";
import { useUser } from "../shared/UserContext";
import { Logo } from "../shared/Logo";
import { PushToggle } from "../shared/PushToggle";
import { useFirstVisitHelp, HelpButton, HelpModal } from "../shared/HelpGuide";
import { serviceById, serviceLabel } from "../customer/services";
import { useLocationSharing } from "./useLocationSharing";
import { navigateUrl, watchAllCourierLocations, type CourierLocation } from "../../lib/geo";
import { offerFor, type DispatchCourier } from "../../lib/dispatch";
import { OfferCards, type Offer } from "./OfferCards";

const COURIER_HELP_STEPS = [
  "Шинэ захиалга томилогдоход мэдэгдэл авна (хонх идэвхжүүлсэн бол).",
  "Захиалгаа нээгээд авах болон хүргэх хаягийг харна.",
  "Ачааг авахдаа \"Авлаа\" товч дарна.",
  "Хүргэсний дараа \"Хүргэлээ\" товч дарна — дараагийн захиалга авахад бэлэн болно.",
];

interface CourierAppProps {
  orders: Order[];
  courierId: string;
  courierName: string;
  courierInfo?: CourierUser;
  account?: CourierAccount;
  onSaveDocs: (docs: CourierDocs) => Promise<void>;
  onPickup: (orderId: string) => void;
  onDeliver: (orderId: string) => void;
  onLogout: () => void;
  /** Байршлаа илгээх эсэх — супер админ role-оор үзэж байхад өөрийнхөө байршлыг илгээхгүй */
  shareLocation?: boolean;
  /** Бүх хүргэгч — "хамгийн ойр 4"-ийг тооцоход */
  courierAccounts: CourierAccount[];
  /** Санал дээр "Авах" — true бол амжилттай авсан */
  onClaim: (orderId: string) => Promise<boolean>;
  /** Ажилд гарах / амрах */
  onSetOnline: (online: boolean) => Promise<void>;
}


export function CourierApp({ orders, courierId, courierName, courierInfo, account, onSaveDocs, onPickup, onDeliver, onLogout, shareLocation = true, courierAccounts, onClaim, onSetOnline }: CourierAppProps) {
  const [tab, setTab] = useState<"active" | "done" | "docs">("active");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"авах" | "хүргэх" | null>(null);
  const { theme, toggleTheme } = useUser();
  const [helpOpen, setHelpOpen] = useFirstVisitHelp("courier");

  const courier = courierInfo;

  const myOrders = orders.filter((o) => o.courierId === courierId);
  const activeOrders = myOrders.filter((o) => o.status === "томилогдсон" || o.status === "авсан");
  const doneOrders = myOrders.filter((o) => o.status === "хүргэгдсэн");

  // Ажилд гарсан эсвэл идэвхтэй захиалгатай үед байршлаа илгээнэ
  const online = account?.available ?? false;
  const canWork = !!account?.verified && !!account?.active;
  const sharing = useLocationSharing(courierId, shareLocation && (online || activeOrders.length > 0));
  const [toggling, setToggling] = useState(false);

  // ── Хамгийн ойрын хүргэгчдэд санал ──
  const searching = orders.filter((o) => o.status === "жолооч хайж байна" && !o.courierId);
  const [locs, setLocs] = useState<Map<string, CourierLocation>>(new Map());
  useEffect(() => {
    if (!online || searching.length === 0) return;
    return watchAllCourierLocations(setLocs);
  }, [online, searching.length > 0]);
  // 2 минутын давалгааг шинэчлэхийн тулд 20 сек тутам дахин тооцно
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (searching.length === 0) return;
    const t = setInterval(() => setTick((n) => n + 1), 20_000);
    return () => clearInterval(t);
  }, [searching.length]);
  void tick;
  const dispatchCouriers: DispatchCourier[] = courierAccounts.map((c) => {
    const l = locs.get(c.id);
    return { id: c.id, available: c.available, active: c.active, verified: c.verified, pos: l ? { lat: l.lat, lng: l.lng } : undefined, locAt: l?.updatedAt };
  });
  const offers: Offer[] =
    online && canWork && activeOrders.length === 0
      ? searching.flatMap((o) => {
          const pickup = o.fromLat != null && o.fromLng != null ? { lat: o.fromLat, lng: o.fromLng } : null;
          const hit = offerFor(courierId, { pickup, searchingSince: o.searchingSince }, dispatchCouriers);
          return hit ? [{ order: o, kmToPickup: hit.km }] : [];
        })
      : [];

  // Шинэ санал ирэхэд дуут дохио
  const seenOffers = useRef<Set<string>>(new Set());
  useEffect(() => {
    const fresh = offers.some((o) => !seenOffers.current.has(o.order.id));
    offers.forEach((o) => seenOffers.current.add(o.order.id));
    if (fresh) alertNewOrder();
  }, [offers.map((o) => o.order.id).join(",")]);

  async function toggleOnline() {
    setToggling(true);
    try {
      await onSetOnline(!online);
    } finally {
      setToggling(false);
    }
  }

  // "Өнөөдөр" — delivered_at нь зөвхөн цаг (HH:MM) хадгалдаг тул өдрийг
  // захиалга үүссэн огноогоор (inserted_at) тогтооно. Өмнө нь бүх цаг
  // үеийн хүргэлтийг "өнөөдрийн орлого" гэж харуулдаг байв.
  const todayKey = new Date().toDateString();
  const todayDone = doneOrders.filter((o) => !!o.insertedAt && new Date(o.insertedAt).toDateString() === todayKey);
  const todayEarnings = todayDone.reduce((sum, o) => sum + Math.round(o.price * 0.8), 0);

  const docs: CourierDocs = {
    photoUrl: account?.photoUrl,
    licensePhotoUrl: account?.licensePhotoUrl,
    licenseNo: account?.licenseNo,
    licenseClass: account?.licenseClass,
    licenseExpiry: account?.licenseExpiry,
    carPhotoUrl: account?.carPhotoUrl,
    plate: account?.plate,
    verified: account?.verified ?? false,
  };
  const docsMissing = missingDocs(account?.vehicle, docs).length > 0;

  // ── Захиалгыг хүлээн авах ──
  // Үйлчлүүлэгчийн утасны дугаар зөвхөн захиалгыг хүлээн авсны дараа
  // харагдана — ингэснээр системээс гадуур шууд тохирох эрсдэл буурна.
  const ACCEPTED_KEY = "hvrgelt_courier_accepted";
  const [accepted, setAccepted] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(ACCEPTED_KEY) || "[]")); }
    catch { return new Set(); }
  });

  function acceptOrder(orderId: string) {
    const next = new Set(accepted);
    next.add(orderId);
    setAccepted(next);
    localStorage.setItem(ACCEPTED_KEY, JSON.stringify([...next]));
  }

  // ── Шинэ захиалга ирэхэд дуут дохио + чичиргээ ──
  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(activeOrders.map((o) => o.id));
    if (knownIds.current === null) {
      knownIds.current = ids; // эхний ачаалалт — дохио өгөхгүй
      return;
    }
    const fresh = [...ids].some((id) => !knownIds.current!.has(id));
    knownIds.current = ids;
    if (fresh) alertNewOrder();
  }, [activeOrders]);

  function handleConfirm() {
    if (!confirmId || !confirmAction) return;
    if (confirmAction === "авах") onPickup(confirmId);
    else onDeliver(confirmId);
    setConfirmId(null);
    setConfirmAction(null);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <RoleHeader
        title={courierName}
        subtitle={
          <span className="inline-flex items-center gap-1">
            Хүргэгч
            {courier?.vehicle && <span>· {VEHICLE_ICON[courier.vehicle]} {courier.vehicle}</span>}
            {courier?.rating ? (
              <span className="inline-flex items-center gap-0.5">
                · <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {courier.rating}
              </span>
            ) : null}
          </span>
        }
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={onLogout}
      >
        <HelpButton onClick={() => setHelpOpen(true)} />
        <PushToggle role="courier" userId={courierId} />
      </RoleHeader>

      <div className="max-w-sm mx-auto w-full px-4 py-4 space-y-4">
        {/* Today stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Идэвхтэй", value: activeOrders.length, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
            { label: "Өнөөдөр хүргэсэн", value: todayDone.length, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
            { label: "Өнөөдрийн орлого", value: `₮${todayEarnings.toLocaleString()}`, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border rounded-xl p-2.5 text-center`}>
              <p className={`text-lg font-bold font-mono ${s.color}`} style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Баримт дутуу бол сануулга */}
        {tab !== "docs" && docsMissing && (
          <button
            onClick={() => setTab("docs")}
            className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-left hover:border-amber-500/60 transition-colors"
          >
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-500">Баримт бичгээ оруулна уу</p>
              <p className="text-xs text-muted-foreground mt-0.5">Баталгаажих хүртэл захиалга хуваарилагдахгүй</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
          </button>
        )}

        {/* Баримт бичиг */}
        {tab === "docs" && (
          <CourierDocsForm key={account?.vehicle} docs={docs} vehicle={account?.vehicle} phone={courierInfo?.phone ?? ""} onSave={onSaveDocs} />
        )}

        {/* Active orders — PRIMARY FOCUS */}
        {tab === "active" && (
          <div className="space-y-3">
            {shareLocation && <NotifyCard role="courier" userId={courierId} />}

            {/* Ажилд гарах — гарсан үед л ойрын захиалгын санал ирнэ */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 border ${online ? "bg-green-500/10 border-green-500/30" : "bg-card border-border"}`}>
              <span className={`w-3 h-3 rounded-full shrink-0 ${online ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-bold leading-tight">{online ? "Ажилд гарсан" : "Амарч байна"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {!canWork
                    ? "Баримт бичиг баталгаажсаны дараа санал ирж эхэлнэ"
                    : online
                      ? "Танд ойр захиалга гармагц энд санал ирнэ"
                      : "Ажилд гарвал ойр байгаа захиалгын санал ирнэ"}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={online}
                aria-label="Ажилд гарах"
                onClick={() => void toggleOnline()}
                disabled={toggling || (!canWork && !online)}
                className={`relative w-14 h-8 rounded-full shrink-0 transition-colors disabled:opacity-50 ${online ? "bg-green-500" : "bg-switch-background"}`}
              >
                <span className={`absolute top-1 left-0 w-6 h-6 rounded-full bg-white shadow transition-transform ${online ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>

            <OfferCards
              offers={offers}
              onClaim={async (id) => {
                const ok = await onClaim(id);
                // Санал авсан нь хүлээн авсан гэсэн үг — "Хүлээн авах"-ыг дахин дарахгүй
                if (ok) acceptOrder(id);
                return ok;
              }}
            />
            {(activeOrders.length > 0 || online) && shareLocation && (
              <div
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs border ${
                  sharing.state === "on" || sharing.state === "starting"
                    ? "bg-green-500/10 border-green-500/25"
                    : "bg-amber-500/10 border-amber-500/30"
                }`}
              >
                <MapPin className={`w-4 h-4 shrink-0 ${sharing.state === "on" ? "text-green-600" : "text-amber-600"}`} />
                <p className="flex-1 leading-snug">
                  {sharing.state === "on" && "Байршлаа илгээж байна — үйлчлүүлэгч таныг газрын зураг дээр харна. Апп-аа нээлттэй байлгаарай."}
                  {sharing.state === "starting" && "Байршил тодорхойлж байна..."}
                  {sharing.state === "denied" && "Байршлын зөвшөөрөл өгөөгүй байна. Хөтчийн тохиргооноос зөвшөөрөөд дахин оролдоно уу."}
                  {sharing.state === "unsupported" && "Энэ төхөөрөмж байршил илгээх боломжгүй."}
                  {sharing.state === "error" && "Байршил илгээж чадсангүй. GPS асаалттай эсэхийг шалгана уу."}
                </p>
                {(sharing.state === "denied" || sharing.state === "error") && (
                  <button onClick={sharing.retry} className="shrink-0 font-semibold text-primary">Дахин</button>
                )}
              </div>
            )}
            {activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Package className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Одоогоор захиалга байхгүй</p>
                <p className="text-xs text-muted-foreground mt-1">Оператор захиалга томилоход энд харагдана</p>
              </div>
            ) : (
              activeOrders.map((order) => {
                const isAssigned = order.status === "томилогдсон";
                const isPicked = order.status === "авсан";

                return (
                  <div key={order.id} className={`bg-card rounded-2xl overflow-hidden border ${isAssigned ? "border-amber-500/40" : "border-primary/40"}`}>
                    {/* Status banner */}
                    <div className={`px-4 py-2 flex items-center justify-between ${isAssigned ? "bg-amber-500/10" : "bg-primary/10"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isAssigned ? "bg-amber-400" : "bg-primary"}`} />
                        <span className={`text-xs font-medium ${isAssigned ? "text-amber-400" : "text-primary"}`}>
                          {isAssigned ? "Авахаар явна уу" : "Хүргэж байна"}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">#{order.id}</span>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Route */}
                      <div className="space-y-3">
                        <div className="flex gap-3 items-start">
                          <div className="shrink-0 mt-1">
                            {isAssigned ? (
                              <div className="w-3 h-3 rounded-full bg-green-400" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">{isAssigned ? "Авах хаяг" : "✓ Авсан хаяг"}</p>
                            <p className={`text-sm font-medium ${!isAssigned ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {order.fromAddress}
                            </p>
                            {order.fromDetail && order.fromDetail !== order.fromAddress && (
                              <p className="text-xs text-muted-foreground">{order.fromDetail}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3 items-start">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isPicked ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Хүргэх хаяг</p>
                            <p className="text-sm font-medium text-foreground">{order.toAddress}</p>
                            {order.toDetail && order.toDetail !== order.toAddress && (
                              <p className="text-xs text-muted-foreground">{order.toDetail}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Service type */}
                      {serviceById(order.serviceId) && (
                        <div className="flex gap-2 items-center text-xs">
                          <span className="leading-none">{serviceById(order.serviceId)!.emoji}</span>
                          <span className="text-primary font-medium">{serviceLabel(order.serviceId, order.subServiceId)}</span>
                        </div>
                      )}

                      {/* Ачааны зураг, жин, тэмдэглэгээ */}
                      {(order.cargoPhotoUrl || order.weightKg != null || order.fragile || order.urgent || order.handToHand) && (
                        <div className="flex gap-3 items-center">
                          {order.cargoPhotoUrl && (
                            <a href={order.cargoPhotoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                              <img src={order.cargoPhotoUrl} alt="Ачаа" className="w-16 h-16 rounded-xl object-cover border border-border" />
                            </a>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {order.weightKg != null && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary border border-border">{order.weightKg} кг</span>
                            )}
                            {order.handToHand && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400">Гараас гарт</span>
                            )}
                            {order.fragile && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">Хагарамтгай</span>
                            )}
                            {order.urgent && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400">Яаралтай · 20 мин</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Package note */}
                      {order.packageNote && order.packageNote !== "Тэмдэглэлгүй" && (
                        <div className="flex gap-2 items-center bg-secondary/50 rounded-xl px-3 py-2">
                          <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground">{order.packageNote}</p>
                        </div>
                      )}

                      {/* Customer contact — дугаар зөвхөн хүлээн авсны дараа */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Захиалагч</p>
                          <p className="text-sm font-medium">{order.customerName}</p>
                          {accepted.has(order.id) && (
                            <p className="text-xs text-muted-foreground font-mono">{order.customerPhone}</p>
                          )}
                        </div>
                        {accepted.has(order.id) ? (
                          <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-lg text-sm hover:text-primary hover:border-primary/50 transition-colors">
                            <Phone className="w-3.5 h-3.5" /> Залгах
                          </a>
                        ) : (
                          <button
                            onClick={() => acceptOrder(order.id)}
                            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90 transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5" /> Хүлээн авах
                          </button>
                        )}
                      </div>
                      {!accepted.has(order.id) && (
                        <p className="text-[11px] text-muted-foreground -mt-2">
                          Захиалгыг хүлээн авсны дараа утасны дугаар нээгдэнэ.
                        </p>
                      )}

                      {/* Price */}
                      <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-2">
                        <span className="text-xs text-muted-foreground">Таны орлого</span>
                        <span className="font-bold text-primary font-mono" style={{ fontFamily: "var(--font-display)" }}>
                          ₮{Math.round(order.price * 0.8).toLocaleString()}
                        </span>
                      </div>

                      {/* ACTION BUTTONS — MINIMAL */}
                      <div className="flex gap-2">
                        <a
                          href={
                            isAssigned
                              ? navigateUrl(order.fromLat != null ? { lat: order.fromLat, lng: order.fromLng! } : null, order.fromDetail || order.fromAddress)
                              : navigateUrl(order.toLat != null ? { lat: order.toLat, lng: order.toLng! } : null, order.toDetail || order.toAddress)
                          }
                          aria-label={isAssigned ? "Авах цэг рүү чиглэл" : "Хүргэх цэг рүү чиглэл"}
                          className="flex items-center gap-1.5 border border-border px-3 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>

                        {isAssigned && (
                          <button
                            onClick={() => { setConfirmId(order.id); setConfirmAction("авах"); }}
                            className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Ачаа авлаа
                          </button>
                        )}

                        {isPicked && (
                          <button
                            onClick={() => { setConfirmId(order.id); setConfirmAction("хүргэх"); }}
                            className="flex-1 bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Хүргэлт дуусгах
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Done orders */}
        {tab === "done" && (
          <div className="space-y-2">
            {doneOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Өнөөдөр хүргэлт байхгүй байна</p>
              </div>
            ) : (
              doneOrders.map((o) => (
                <div key={o.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium leading-snug">{o.toAddress}</p>
                      <p className="text-xs text-muted-foreground">{o.deliveredAt}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-green-400">+₮{Math.round(o.price * 0.8).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Дотоод журмын сануулга */}
      <div className="max-w-sm mx-auto w-full px-4 pb-24">
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Захиалгыг апп-аар дамжуулан гүйцэтгэнэ. Хувийн дугаараар шууд тохирох нь
          даатгал, үнэлгээ, урамшууллаас хасагдах үндэслэл болно.
        </p>
      </div>

      {/* Bottom tab */}
      <div className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-sm mx-auto flex">
          {([
            { key: "active", label: "Захиалгууд", icon: Package, badge: activeOrders.length },
            { key: "done", label: "Дууссан", icon: CheckCircle, badge: 0 },
            { key: "docs", label: "Баримт", icon: IdCard, badge: docsMissing ? 1 : 0 },
          ] as const).map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 relative transition-colors ${tab === key ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/4 w-4 h-4 bg-primary rounded-full text-white flex items-center justify-center" style={{ fontSize: "0.6rem" }}>{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmId && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-center" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
              {confirmAction === "авах" ? "Ачаа авсныг баталгаажуулах" : "Хүргэлт дуусгах"}
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {confirmAction === "авах"
                ? "Та ачааг хүлээн авсан тул захиалагч болон операторт мэдэгдэнэ."
                : "Та амжилттай хүргэсэн тул орлого нэмэгдэнэ."}
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmId(null); setConfirmAction(null); }} className="flex-1 border border-border py-3 rounded-xl text-sm hover:border-primary/50 transition-colors">
                Цуцлах
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-medium transition-colors ${confirmAction === "авах" ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/90"}`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {confirmAction === "авах" ? "Авлаа" : "Хүргэлээ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <HelpModal
          title="Хэрхэн ашиглах вэ?"
          subtitle="Хүргэлт хийх алхмууд"
          steps={COURIER_HELP_STEPS}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>
  );
}
