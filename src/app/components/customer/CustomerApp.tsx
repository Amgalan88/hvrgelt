import { InstallButton } from "../shared/InstallApp";
import { NotifyCard } from "../shared/NotifyCard";
import { useUndo } from "../shared/Undo";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { useEffect, useState, lazy, Suspense, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, ArrowRight, Package, Clock, CheckCircle, Circle, Truck, Phone, X, Star, Home, Briefcase, Search, Store, Plus, Map as MapIcon, ArrowLeft, LocateFixed, Hand, CircleX, ChevronDown, User as UserIcon } from "lucide-react";
import type { Order, OrderStatus, CourierDocs, BasketItem, PartnerProduct } from "../shared/types";
import type { PaymentIntent } from "../shared/store";
import { useUser, type QuickOrder } from "../shared/UserContext";
import { Spinner } from "../shared/Spinner";
import { SettingsPage } from "./SettingsPage";
import { OrderHistory } from "./OrderHistory";
import { PARTNER_CATEGORIES, type Partner, type PartnerCategory } from "./partners";
import { SERVICES, serviceById, subServiceById, visibleSubs } from "./services";
import { serviceIcon } from "./serviceIcons";
import { CourierProfileModal } from "./CourierProfileModal";
import { CargoDetails, type CargoInfo } from "./CargoDetails";
import { PaymentPanel } from "./PaymentPanel";
import { DeliveredCelebration } from "./DeliveredCelebration";
import { PartnerShop } from "./PartnerShop";
import { cloudinaryUrl } from "../../lib/cloudinary";
import { Logo } from "../shared/Logo";
import { useFirstVisitHelp, HelpButton, HelpModal } from "../shared/HelpGuide";
import { LocationPicker } from "./LocationPicker";
import { routeUrl, isLatLng, distanceKm, watchCourierLocation, agoText, currentPosition, geoErrorText, type GeoError, type LatLng, type CourierLocation } from "../../lib/geo";
import type { MapMarker } from "../shared/MapView";

const MapView = lazy(() => import("../shared/MapView"));

const CUSTOMER_HELP_STEPS = [
  "Утасны дугаараа оруулж нэг л удаа бүртгүүлнэ.",
  "\"Хаашаа хүргэх вэ?\" дээр авах болон хүргэх хаягаа бичнэ.",
  "Үйлчилгээ нь бараа хүргэлт байна. Өөр үйлчилгээ (ачааны машин, кран, хүүхэд хүргэлт г.м.) хэрэгтэй бол \"Солих\" дарна.",
  "Захиалга илгээгээд хүлээнэ — оператор үнийг тогтооно.",
  "Апп дээрээ ирсэн үнийг баталгаажуулна.",
  "Хүргэгч томилогдож, ачааг хүргэнэ — статусыг Захиалга tab дээрээс шууд хараарай.",
];

type AppTab = "order" | "places" | "history" | "settings";
const TAB_TITLE: Record<AppTab, string> = { order: "Захиалга", places: "Газрууд", history: "Миний захиалгууд", settings: "Профайл" };

/** Захиалгын асуултууд — нэг дэлгэцэнд нэг асуулт */
type FormStep = 0 | 1 | 2 | 3;
const WIZARD_STEPS: { q: string; hint: string }[] = [
  { q: "Юу хүргүүлэх вэ?", hint: "Үйлчилгээгээ сонгоно уу" },
  { q: "Хаанаас авах вэ?", hint: "Ачааг авах газрын хаяг" },
  { q: "Хаашаа хүргэх вэ?", hint: "Хүргэж өгөх газрын хаяг" },
  { q: "Нэмэлт мэдээлэл", hint: "Хүргэгч зөв бэлдэхэд тусална. Заавал биш." },
];
type OrderStep = "form" | "confirm" | "tracking";

/**
 * Захиалгын төлөв бүрийг үйлчлүүлэгчийн хэлээр:
 *  - action: үйлчлүүлэгч ямар нэг зүйл хийх ёстой ("Таны ээлж")
 *  - wait:   бусад хүн ажиллаж байна, хүлээнэ
 */
type StatusTone = "action" | "wait" | "done" | "cancelled";
interface StatusView {
  tone: StatusTone;
  /** Одоо хэн юу хийж байгаа — жижиг мөр */
  who: string;
  title: string;
  body: string;
}

function statusView(o: Order): StatusView {
  switch (o.status) {
    case "шинэ":
      return { tone: "wait", who: "Оператор ажиллаж байна", title: "Үнийг тогтоож байна", body: "Оператор таны захиалгыг харж хүргэлтийн үнийг тогтооно. Ихэвчлэн хэдэн минут болно." };
    case "үнэ батлах":
      return { tone: "action", who: "Таны ээлж", title: "Үнийг зөвшөөрнө үү", body: "Хүргэлтийн үнэ тогтоогдлоо. Зөвшөөрсний дараа төлбөрөө хийнэ." };
    case "төлбөр хүлээж байна":
      return { tone: "action", who: "Таны ээлж", title: "Төлбөрөө хийнэ үү", body: `Доорх аргаар ₮${o.price.toLocaleString()} төлөхөд хүргэгч хуваарилагдана.` };
    case "жолооч хайж байна":
      return { tone: "wait", who: "Төлбөр орлоо", title: "Хүргэгч хайж байна", body: "Ойр байгаа чөлөөтэй хүргэгчийг томилж байна." };
    case "томилогдсон":
      return { tone: "wait", who: "Хүргэгч томилогдлоо", title: "Ачааг авахаар явж байна", body: `${o.courierName ?? "Хүргэгч"} таны ачааг авахаар явж байна.` };
    case "авсан":
      return { tone: "wait", who: "Ачаа хүргэгчийн гарт", title: "Замдаа явж байна", body: "Хүргэгч ирэхэд утсаа авахад бэлэн байгаарай." };
    case "хүргэгдсэн":
      return { tone: "done", who: "Дууссан", title: "Хүргэгдлээ", body: "" };
    default:
      return { tone: "cancelled", who: "Цуцлагдсан", title: "Захиалга цуцлагдсан", body: "Дахин захиалах бол доорх товчийг дарна уу." };
  }
}

/** Үйлчлүүлэгчид харагдах 4 шат */
const MILESTONES = ["Үнэ", "Төлбөр", "Хүргэлт", "Хүлээн авсан"];
function milestoneIdx(status: OrderStatus): number {
  switch (status) {
    case "шинэ":
    case "үнэ батлах":
      return 0;
    case "төлбөр хүлээж байна":
      return 1;
    case "жолооч хайж байна":
    case "томилогдсон":
    case "авсан":
      return 2;
    case "хүргэгдсэн":
      return 4; // бүгд дууссан
    default:
      return -1;
  }
}

// ── Захиалгын ноорог ─────────────────────────────────────────────────
// Хуудас дахин ачаалах, апп хаагдахад бичсэн маягт алдагдахгүй.
// Төхөөрөмж дээр л хадгалагдана; захиалга илгээгдмэгц устна.
interface OrderDraft {
  fromAddr: string; fromDetail: string; toAddr: string; toDetail: string;
  note: string; serviceId: string; subServiceId: string | null;
  fromPos: LatLng | null; toPos: LatLng | null;
}
const draftKey = (userId: string) => `hvrgelt_order_draft_${userId}`;

function readDraft(userId: string): Partial<OrderDraft> {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    return raw ? (JSON.parse(raw) as Partial<OrderDraft>) : {};
  } catch {
    return {};
  }
}

function writeDraft(userId: string, d: OrderDraft) {
  try {
    const empty = !d.fromAddr && !d.toAddr && !d.note && !d.fromPos && !d.toPos;
    if (empty) localStorage.removeItem(draftKey(userId));
    else localStorage.setItem(draftKey(userId), JSON.stringify(d));
  } catch {
    /* хадгалах боломжгүй — энэ удаад л санана */
  }
}

const ICON_MAP = {
  home: { icon: Home, color: "text-blue-400" },
  work: { icon: Briefcase, color: "text-purple-400" },
  other: { icon: MapPin, color: "text-orange-400" },
};

const QUICK_EMOJIS = ["📦", "🧳", "🛒", "☕", "🏪", "📄", "🎁", "🍱", "💊", "👕"];

interface CustomerAppProps {
  orders: Order[];
  partners: Partner[];
  products: PartnerProduct[];
  bankInfo: string;
  courierDocs: (courierId?: string) => CourierDocs | undefined;
  onAddOrder: (order: Omit<Order, "id" | "createdAt" | "status">) => Promise<string>;
  onCancelOrder: (orderId: string) => void;
  onConfirmOrder: (orderId: string) => void;
  onCreatePayment: (orderId: string, amount: number, opts?: { test?: boolean }) => Promise<PaymentIntent>;
  onCheckPayment: (paymentId: string, opts?: { test?: boolean }) => Promise<boolean>;
  onMarkPaid: (orderId: string, method: string) => Promise<void>;
  /** Туршилтын QPay харуулах эсэх (супер админ role-оор үзэж байх үед) */
  testPayments?: boolean;
  /** Супер админ role-оор үзэж байна — мэдэгдлийг өөрийн утсанд бүртгэхгүй */
  viewAs?: boolean;
  onRate: (orderId: string, score: number, comment?: string) => Promise<void>;
  onFeedback: (data: { phone: string; message: string; orderId?: string }) => Promise<void>;
  myOrderId: string | null;
  setMyOrderId: (id: string | null) => void;
  userName: string;
  userId: string;
  userPhone: string;
  onUpdateAuth: (authMethod: "pin" | "pattern", authKey: string) => void;
  onLogout: () => void;
}

/** Үйлчилгээний icon — emoji-ийн оронд нэг хэв маяг */
function SvcIcon({ id, className = "w-5 h-5" }: { id?: string; className?: string }) {
  const I = serviceIcon(id);
  return <I className={className} />;
}

/**
 * Үндсэн товч — дэлгэцийн доод хэсэгт (доод цэсний дээр) үргэлж харагдана.
 * Урт хуудсыг гүйлгэж товч хайх шаардлагагүй.
 */
function BottomBar({ children }: { children: ReactNode }) {
  return (
    // Доод цэсний голын "Захиалах" товч 1.25rem дээш цухуйдаг тул түүнээс дээр байрлана
    <div className="fixed inset-x-0 z-30 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] pointer-events-none">
      <div className="max-w-sm mx-auto px-4 pt-5 pb-1 bg-gradient-to-t from-background via-background to-transparent pointer-events-auto">
        {children}
      </div>
    </div>
  );
}

// Маршрут — цэг заасан бол газрын зураг (OpenStreetMap), доор нь Google Maps чиглэл.
// Хүргэгчийн байршил ирвэл газрын зураг дээр хөдөлж харагдана.
function RoutePreview({
  from, to, fromPos, toPos, courier,
}: {
  from: string;
  to: string;
  fromPos?: LatLng | null;
  toPos?: LatLng | null;
  courier?: CourierLocation | null;
}) {
  const markers: MapMarker[] = [];
  if (isLatLng(fromPos)) markers.push({ pos: fromPos, kind: "from" });
  if (isLatLng(toPos)) markers.push({ pos: toPos, kind: "to" });
  if (courier) markers.push({ pos: courier, kind: "courier" });
  const km = isLatLng(fromPos) && isLatLng(toPos) ? distanceKm(fromPos, toPos) : null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {markers.length > 0 && (
        <Suspense fallback={<div className="h-44 bg-secondary animate-pulse" />}>
          <MapView className="h-44" markers={markers} fit />
        </Suspense>
      )}
      {courier && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border text-xs">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-semibold">Хүргэгчийн байршил</span>
          <span className="text-muted-foreground">· {agoText(courier.updatedAt)}</span>
        </div>
      )}
      <a
        href={routeUrl(fromPos, toPos, from, to)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <div className="w-px h-4 bg-border" />
            <MapPin className="w-3 h-3 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-foreground leading-relaxed truncate">{from}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed truncate">{to}</p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-primary flex flex-col items-end gap-0.5 ml-3">
          <span className="flex items-center gap-1 group-hover:underline">Google Maps <ArrowRight className="w-3 h-3" /></span>
          {km !== null && <span className="text-muted-foreground tabular">≈ {km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1)} км`}</span>}
        </span>
      </a>
    </div>
  );
}

export function CustomerApp({ orders, partners, products, bankInfo, courierDocs, onAddOrder, onCancelOrder, onConfirmOrder, onCreatePayment, onCheckPayment, onMarkPaid, testPayments = false, viewAs = false, onRate, onFeedback, myOrderId, setMyOrderId, userName, userId, userPhone, onUpdateAuth, onLogout }: CustomerAppProps) {
  const { savedAddresses, quickOrders, saveQuickOrders } = useUser();
  const { offerUndo } = useUndo();
  const [helpOpen, setHelpOpen] = useFirstVisitHelp("customer");
  const [tab, setAppTab] = useState<AppTab>("order");
  // Start on form always; if there's an active order go to tracking
  const [orderStep, setOrderStep] = useState<OrderStep>(myOrderId ? "tracking" : "form");
  const [draft] = useState(() => readDraft(userId));
  const [fromAddr, setFromAddr] = useState(draft.fromAddr ?? "");
  const [fromDetail, setFromDetail] = useState(draft.fromDetail ?? "");
  const [toAddr, setToAddr] = useState(draft.toAddr ?? "");
  const [toDetail, setToDetail] = useState(draft.toDetail ?? "");
  const [note, setNote] = useState(draft.note ?? "");
  const [serviceId, setServiceId] = useState<string>(
    draft.serviceId && serviceById(draft.serviceId) ? draft.serviceId : SERVICES[0].id,
  );
  const [subServiceId, setSubServiceId] = useState<string | null>(draft.subServiceId ?? null);
  const [cargo, setCargo] = useState<CargoInfo>({ fragile: false, urgent: false });
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [basketPartnerId, setBasketPartnerId] = useState<string | null>(null);
  const [shopPartner, setShopPartner] = useState<Partner | null>(null);
  const [courierProfileOpen, setCourierProfileOpen] = useState(false);
  const [estimated, setEstimated] = useState<{ price: number; distance: number } | null>(null);
  const [addrTarget, setAddrTarget] = useState<"from" | "to" | null>(null);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  // Газрын зураг дээр заасан цэгүүд
  const [fromPos, setFromPos] = useState<LatLng | null>(draft.fromPos ?? null);
  const [toPos, setToPos] = useState<LatLng | null>(draft.toPos ?? null);

  // Маягт өөрчлөгдөх бүрт ноорог хадгална
  useEffect(() => {
    writeDraft(userId, { fromAddr, fromDetail, toAddr, toDetail, note, serviceId, subServiceId, fromPos, toPos });
  }, [userId, fromAddr, fromDetail, toAddr, toDetail, note, serviceId, subServiceId, fromPos, toPos]);
  const [pickerFor, setPickerFor] = useState<"from" | "to" | null>(null);
  // Ноорогтой бол хаана хүрснээс нь үргэлжлүүлнэ
  const [formStep, setFormStep] = useState<FormStep>(() => (draft.toAddr ? 3 : draft.fromAddr ? 2 : 0));
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");

  function goStep(n: FormStep) {
    setGeoErr("");
    setFormStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function locateMe(target: "from" | "to") {
    setLocating(true);
    setGeoErr("");
    try {
      const p = await currentPosition();
      if (target === "from") {
        setFromPos(p);
        if (!fromAddr.trim()) setFromAddr("Миний байршил");
      } else {
        setToPos(p);
        if (!toAddr.trim()) setToAddr("Миний байршил");
      }
    } catch (e) {
      setGeoErr(geoErrorText(e as GeoError));
    } finally {
      setLocating(false);
    }
  }
  // Цуцлахын өмнө асуух — нэг товшилтоор санамсаргүй цуцлагдахаас сэргийлнэ
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // ── Quick orders (one-tap saved shortcuts) ──
  const [placesCat, setPlacesCat] = useState<PartnerCategory>("Карго");
  const [placesSearch, setPlacesSearch] = useState("");
  const [quickEdit, setQuickEdit] = useState(false);
  const [quickModal, setQuickModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qLabel, setQLabel] = useState("");
  const [qEmoji, setQEmoji] = useState("📦");
  const [qFrom, setQFrom] = useState("");
  const [qFromDetail, setQFromDetail] = useState("");
  const [qTo, setQTo] = useState("");
  const [qToDetail, setQToDetail] = useState("");
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [confirmQO, setConfirmQO] = useState<QuickOrder | null>(null);
  const [placing, setPlacing] = useState(false);

  const basketTotal = basket.reduce((s, i) => s + i.price * i.qty, 0);
  const basketPartner = partners.find((x) => x.id === basketPartnerId);

  const service = serviceById(serviceId);
  const subService = subServiceById(serviceId, subServiceId ?? undefined);

  /**
   * Үйлчилгээ солиход өмнөх үйлчилгээнд бичсэн тэмдэглэл, дэд төрөл,
   * ачааны мэдээлэл цэвэрлэгдэнэ (шинэ үйлчилгээнд хамааралгүй тул).
   * Андуурч солисон бол "Буцаах"-аар бүгд сэргэнэ.
   */
  function pickService(id: string) {
    if (id === serviceId) return;
    const prev = { serviceId, subServiceId, note, cargo };
    const hadInput = !!(subServiceId || note.trim() || cargo.photoUrl || cargo.weightKg != null || cargo.fragile || cargo.urgent);
    setServiceId(id);
    setSubServiceId(null);
    setNote("");
    setCargo({ fragile: false, urgent: false });
    const label = serviceById(id)?.label ?? "Үйлчилгээ";
    offerUndo(
      hadInput ? `${label} — өмнө бичсэн мэдээлэл арилсан` : `${label} сонгогдлоо`,
      () => {
        setServiceId(prev.serviceId);
        setSubServiceId(prev.subServiceId);
        setNote(prev.note);
        setCargo(prev.cargo);
      },
    );
  }

  /** Хаягийг арилгах — буцааж болно */
  function clearAddress(target: "from" | "to") {
    const prev =
      target === "from"
        ? { addr: fromAddr, detail: fromDetail, pos: fromPos }
        : { addr: toAddr, detail: toDetail, pos: toPos };
    if (target === "from") { setFromAddr(""); setFromDetail(""); setFromPos(null); }
    else { setToAddr(""); setToDetail(""); setToPos(null); }
    offerUndo(target === "from" ? "Авах хаяг арилсан" : "Хүргэх хаяг арилсан", () => {
      if (target === "from") { setFromAddr(prev.addr); setFromDetail(prev.detail); setFromPos(prev.pos); }
      else { setToAddr(prev.addr); setToDetail(prev.detail); setToPos(prev.pos); }
    });
  }

  /** Сагс цэвэрлэх — буцааж болно */
  function clearBasket() {
    const prev = { basket, basketPartnerId };
    setBasket([]);
    setBasketPartnerId(null);
    offerUndo("Сагс хоосорлоо", () => {
      setBasket(prev.basket);
      setBasketPartnerId(prev.basketPartnerId);
    });
  }
  const myOrder = orders.find((o) => o.id === myOrderId);

  const trackCourierId =
    myOrder && ["томилогдсон", "авсан"].includes(myOrder.status) ? myOrder.courierId ?? null : null;
  const [courierLoc, setCourierLoc] = useState<CourierLocation | null>(null);
  useEffect(() => {
    setCourierLoc(null);
    if (!trackCourierId) return;
    return watchCourierLocation(trackCourierId, setCourierLoc);
  }, [trackCourierId]);
  const activeCount = orders.filter((o) => o.customerId === userId && !["хүргэгдсэн", "цуцлагдсан"].includes(o.status)).length;

  function handleEstimate() {
    if (!fromAddr.trim() || !toAddr.trim()) return;
    setOrderStep("confirm");
  }

  async function handleConfirm() {
    if (placing) return;
    setPlacing(true);
    try {
      const id = await onAddOrder({
        fromAddress: fromAddr, toAddress: toAddr,
        fromDetail: fromDetail || fromAddr, toDetail: toDetail || toAddr,
        packageNote: note || "Тэмдэглэлгүй",
        fromLat: fromPos?.lat, fromLng: fromPos?.lng,
        toLat: toPos?.lat, toLng: toPos?.lng,
        serviceId,
        subServiceId: subServiceId ?? undefined,
        cargoPhotoUrl: cargo.photoUrl,
        weightKg: cargo.weightKg,
        fragile: cargo.fragile,
        urgent: cargo.urgent,
        basket,
        basketTotal,
        partnerId: basketPartnerId ?? undefined,
        price: 0, distance: 0, // үнийг оператор тогтооно
        customerName: userName, customerPhone: userPhone, customerId: userId,
      });
      setMyOrderId(id);
      setOrderStep("tracking");
      setFromAddr(""); setFromDetail(""); setToAddr(""); setToDetail(""); setNote("");
      setFromPos(null); setToPos(null); setSubServiceId(null);
      setFormStep(0);
      setCargo({ fragile: false, urgent: false });
      setBasket([]); setBasketPartnerId(null);
    } finally {
      setPlacing(false);
    }
  }

  // One-tap order from a saved quick-order shortcut
  async function placeQuickOrder(qo: QuickOrder) {
    if (placingId) return;
    setPlacingId(qo.id);
    try {
      const id = await onAddOrder({
        fromAddress: qo.fromAddress, toAddress: qo.toAddress,
        fromDetail: qo.fromDetail || qo.fromAddress,
        toDetail: qo.toDetail || qo.toAddress,
        packageNote: qo.label,
        serviceId: SERVICES[0].id, // хурдан захиалга = бараа хүргэлт
        price: 0, distance: 0, // үнийг оператор тогтооно
        customerName: userName, customerPhone: userPhone, customerId: userId,
      });
      setMyOrderId(id);
      setOrderStep("tracking");
    } finally {
      setPlacingId(null);
    }
  }

  function openQuickAdd() {
    setEditingId(null);
    setQLabel(""); setQEmoji("📦");
    setQFrom(""); setQFromDetail(""); setQTo(""); setQToDetail("");
    setQuickModal(true);
  }

  function openQuickEdit(qo: QuickOrder) {
    setEditingId(qo.id);
    setQLabel(qo.label); setQEmoji(qo.emoji);
    setQFrom(qo.fromAddress); setQFromDetail(qo.fromDetail);
    setQTo(qo.toAddress); setQToDetail(qo.toDetail);
    setQuickModal(true);
  }

  function handleSaveQuick() {
    if (!qLabel.trim() || !qFrom.trim() || !qTo.trim()) return;
    const item: QuickOrder = {
      id: editingId ?? "qo-" + Date.now(),
      label: qLabel.trim(), emoji: qEmoji,
      fromAddress: qFrom.trim(), fromDetail: qFromDetail.trim(),
      toAddress: qTo.trim(), toDetail: qToDetail.trim(),
    };
    saveQuickOrders(
      editingId ? quickOrders.map((q) => (q.id === editingId ? item : q)) : [...quickOrders, item],
    );
    setQuickModal(false);
  }

  function deleteQuick(id: string) {
    const prev = quickOrders;
    const removed = prev.find((q) => q.id === id);
    saveQuickOrders(prev.filter((q) => q.id !== id));
    offerUndo(`"${removed?.label ?? "Хурдан захиалга"}" устгагдлаа`, () => saveQuickOrders(prev));
  }

  async function confirmPlaceQuick() {
    if (!confirmQO) return;
    const qo = confirmQO;
    setConfirmQO(null);
    await placeQuickOrder(qo);
  }

  // Start an order from a partner place (pickup pre-filled)
  function openShop(p: Partner) {
    setShopPartner(p);
  }

  function confirmBasket(items: BasketItem[]) {
    if (!shopPartner) return;
    setBasket(items);
    setBasketPartnerId(shopPartner.id);
    // Сагслахад авах хаяг нь тухайн газар болно
    const fullAddr = [shopPartner.name, shopPartner.address, shopPartner.detail].filter(Boolean).join(", ");
    setFromAddr(fullAddr);
    setFromDetail("");
    setFromPos(null);
    setServiceId("goods");
    // Партнёрын ангилалыг үйлчилгээний дэд төрөл рүү буулгана
    const SUB_BY_CATEGORY: Record<string, string> = {
      "Карго": "cargo",
      "Тээш": "luggage",
      "Зах": "grocery",
      "Дэлгүүр": "shop",
      "Кофе шоп": "grocery",
      "Аптек": "shop",
    };
    setSubServiceId(SUB_BY_CATEGORY[shopPartner.category] ?? "shop");
    setShopPartner(null);
    setOrderStep("form");
    setFormStep(2);
    setAppTab("order");
  }

  function orderFromPartner(p: Partner) {
    const fullAddr = [p.name, p.address, p.detail].filter(Boolean).join(", ");
    setFromAddr(fullAddr);
    setFromDetail("");
    setFromPos(null);
    setNote("");
    setToAddr(""); setToDetail("");
    setOrderStep("form");
    setFormStep(2);
    setAppTab("order");
  }

  function handleNewOrder() {
    setMyOrderId(null);
    setBasket([]); setBasketPartnerId(null);
    setCargo({ fragile: false, urgent: false });
    setFromAddr(""); setFromDetail(""); setToAddr(""); setToDetail(""); setNote("");
    setFromPos(null); setToPos(null);
    setEstimated(null);
    setFormStep(0);
    setOrderStep("form");
  }

  function applyPick(pos: LatLng) {
    if (pickerFor === "from") {
      setFromPos(pos);
      if (!fromAddr.trim()) setFromAddr("Газрын зураг дээр заасан цэг");
    } else if (pickerFor === "to") {
      setToPos(pos);
      if (!toAddr.trim()) setToAddr("Газрын зураг дээр заасан цэг");
    }
    setPickerFor(null);
  }

  /** Доод цэсний "Захиалах" — хаанаас ч шинэ захиалга эхлүүлнэ */
  function startNewOrder() {
    setAppTab("order");
    if (orderStep === "tracking") handleNewOrder();
    else if (orderStep === "confirm") setOrderStep("form");
    else goStep(0);
  }

  /** Хүргэгдсэн захиалгыг ижил хаяг, үйлчилгээгээр дахин захиална */
  function repeatOrder(o: Order) {
    setMyOrderId(null);
    setServiceId(serviceById(o.serviceId) ? o.serviceId! : SERVICES[0].id);
    setSubServiceId(o.subServiceId ?? null);
    setFromAddr(o.fromAddress);
    setFromDetail(o.fromDetail && o.fromDetail !== o.fromAddress ? o.fromDetail : "");
    setToAddr(o.toAddress);
    setToDetail(o.toDetail && o.toDetail !== o.toAddress ? o.toDetail : "");
    setFromPos(o.fromLat != null ? { lat: o.fromLat, lng: o.fromLng! } : null);
    setToPos(o.toLat != null ? { lat: o.toLat, lng: o.toLng! } : null);
    setNote("");
    setCargo({ fragile: false, urgent: false });
    setOrderStep("form");
    setFormStep(3);
    setAppTab("order");
    window.scrollTo({ top: 0 });
  }

  function fillAddress(target: "from" | "to", addr: string, detail: string) {
    if (target === "from") { setFromAddr(addr); setFromDetail(detail); }
    else { setToAddr(addr); setToDetail(detail); }
    setAddrTarget(null);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      {/* Апп-ын дээд мөр */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-sm mx-auto h-14 px-4 flex items-center justify-between">
          {tab === "order" ? <Logo size="sm" /> : <p className="text-[17px] font-bold">{TAB_TITLE[tab]}</p>}
          <div className="flex items-center gap-1">
            <HelpButton onClick={() => setHelpOpen(true)} />
            <button
              onClick={() => setAppTab("settings")}
              aria-label="Профайл"
              className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center"
            >
              {userName[0]}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 max-w-sm mx-auto w-full px-4 pt-4 pb-56">
       <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >

        {/* ── ORDER TAB ── */}
        {tab === "order" && (
          <>
            {/* FORM — алхам алхмаар асуулт */}
            {orderStep === "form" && (
              <div className="space-y-4">
                {/* Асуултын баннер */}
                <div className="relative overflow-hidden rounded-3xl bg-[#16181d] text-white p-5 border border-white/5">
                  <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-[var(--brand)]/30 blur-2xl pointer-events-none" />
                  <div className="relative flex items-center justify-between h-8">
                    {formStep > 0 ? (
                      <button
                        onClick={() => goStep((formStep - 1) as FormStep)}
                        className="flex items-center gap-1 text-sm text-white/70 hover:text-white -ml-1 pr-2 py-1"
                      >
                        <ArrowLeft className="w-4 h-4" /> Буцах
                      </button>
                    ) : <span />}
                    <span className="text-xs font-semibold text-white/60 tabular">Алхам {formStep + 1}/{WIZARD_STEPS.length}</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={formStep}
                      className="relative mt-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      <h1 className="text-white" style={{ fontWeight: 800, fontSize: "1.75rem", lineHeight: 1.12 }}>
                        {WIZARD_STEPS[formStep].q}
                      </h1>
                      <p className="text-white/65 text-sm mt-1.5">{WIZARD_STEPS[formStep].hint}</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="relative grid gap-1.5 mt-4" style={{ gridTemplateColumns: `repeat(${WIZARD_STEPS.length}, 1fr)` }}>
                    {WIZARD_STEPS.map((_, i) => (
                      <span key={i} className={`h-1 rounded-full transition-colors ${i <= formStep ? "bg-[var(--brand)]" : "bg-white/15"}`} />
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={formStep}
                    className="space-y-4"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                {/* ── 1. Юу хүргүүлэх вэ? ── */}
                {formStep === 0 && (
                  <>
                    {quickOrders.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Давтан захиалах</p>
                          <button onClick={() => setQuickEdit((v) => !v)} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                            {quickEdit ? "Болсон" : "Засах"}
                          </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pt-1.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {quickOrders.map((qo) => (
                            <div key={qo.id} className="relative shrink-0">
                              <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => (quickEdit ? openQuickEdit(qo) : setConfirmQO(qo))}
                                disabled={placingId === qo.id}
                                className="flex items-center gap-2 bg-card border border-border rounded-2xl pl-2 pr-3.5 py-2 hover:border-primary/50 transition-colors disabled:opacity-50"
                              >
                                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-lg">{placingId === qo.id ? "…" : qo.emoji}</span>
                                <span className="text-sm font-medium max-w-[8rem] truncate">{qo.label}</span>
                              </motion.button>
                              {quickEdit && (
                                <button onClick={() => deleteQuick(qo.id)} aria-label="Устгах" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button onClick={openQuickAdd} className="shrink-0 flex items-center gap-1.5 border border-dashed border-border rounded-2xl px-3.5 py-2 text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
                            <Plus className="w-4 h-4" /> Нэмэх
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                      {SERVICES.map((sv) => {
                        const active = sv.id === serviceId;
                        return (
                          <button
                            key={sv.id}
                            onClick={() => { pickService(sv.id); goStep(1); }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors ${active ? "bg-primary/[0.07]" : "hover:bg-secondary/50"}`}
                          >
                            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}><SvcIcon id={sv.id} /></span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[15px] font-semibold leading-snug">{sv.label}</span>
                              <span className="block text-xs text-muted-foreground mt-0.5">{sv.desc}</span>
                            </span>
                            {active
                              ? <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                              : <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {quickOrders.length === 0 && (
                      <button onClick={openQuickAdd} className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1">
                        <Plus className="w-3.5 h-3.5" /> Байнгын хүргэлтээ хурдан захиалга болгох
                      </button>
                    )}
                  </>
                )}

                {/* ── 2–3. Хаанаас / Хаашаа ── */}
                {(formStep === 1 || formStep === 2) && (() => {
                  const target = formStep === 1 ? "from" : "to";
                  const addr = target === "from" ? fromAddr : toAddr;
                  const setAddr = target === "from" ? setFromAddr : setToAddr;
                  const detail = target === "from" ? fromDetail : toDetail;
                  const setDetail = target === "from" ? setFromDetail : setToDetail;
                  const pos = target === "from" ? fromPos : toPos;
                  const setPos = target === "from" ? setFromPos : setToPos;
                  return (
                    <>
                      {/* Өмнөх хариултууд — дарж засна */}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => goStep(0)} className="inline-flex items-center gap-1.5 bg-card border border-border rounded-full pl-2 pr-3 py-1 text-xs hover:border-primary/40">
                          <SvcIcon id={service?.id} className="w-3.5 h-3.5 text-primary" /> <span className="font-medium max-w-[11rem] truncate">{service?.label}</span>
                        </button>
                        {target === "to" && fromAddr && (
                          <button onClick={() => goStep(1)} className="inline-flex items-center gap-1.5 bg-card border border-border rounded-full pl-2.5 pr-3 py-1 text-xs hover:border-primary/40">
                            <span className="w-2 h-2 rounded-full bg-green-500" /> <span className="font-medium max-w-[11rem] truncate">{fromAddr}</span>
                          </button>
                        )}
                      </div>

                      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          {target === "from"
                            ? <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                            : <MapPin className="w-4 h-4 text-primary shrink-0" />}
                          <input
                            key={target}
                            value={addr}
                            onChange={(e) => setAddr(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && addr.trim()) goStep((formStep + 1) as FormStep); }}
                            placeholder={target === "from" ? "Жишээ: Номин супермаркет" : "Жишээ: 14-р хороо, Найрамдал хотхон"}
                            autoFocus
                            className="flex-1 min-w-0 bg-transparent text-base font-medium placeholder:text-muted-foreground/70 placeholder:font-normal focus:outline-none"
                          />
                          {addr && (
                            <button aria-label="Арилгах" onClick={() => clearAddress(target)} className="shrink-0 text-muted-foreground hover:text-foreground">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <input
                          value={detail}
                          onChange={(e) => setDetail(e.target.value)}
                          placeholder="Байр, орц, давхар, тоот (заавал биш)"
                          className="w-full bg-secondary/60 rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPickerFor(target)}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${pos ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
                          >
                            <MapIcon className="w-4 h-4" /> {pos ? "Цэг заасан ✓" : "Газрын зураг"}
                          </button>
                          <button
                            onClick={() => locateMe(target)}
                            disabled={locating}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-semibold hover:border-primary/40 transition-colors disabled:opacity-60"
                          >
                            {locating ? <Spinner className="w-4 h-4" /> : <LocateFixed className="w-4 h-4 text-primary" />} Миний байршил
                          </button>
                        </div>
                        {pos && (
                          <button onClick={() => setPos(null)} className="text-xs text-muted-foreground hover:text-foreground">
                            Газрын зураг дээрх цэгийг арилгах
                          </button>
                        )}
                        {geoErr && <p className="text-xs text-destructive">{geoErr}</p>}
                      </div>

                      {savedAddresses.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Хадгалсан хаягууд</p>
                          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                            {savedAddresses.map((sa) => {
                              const cfg = ICON_MAP[sa.icon];
                              const Icon = cfg.icon;
                              return (
                                <button
                                  key={sa.id}
                                  onClick={() => {
                                    fillAddress(target, sa.label, [sa.address, sa.detail].filter(Boolean).join(", "));
                                    goStep((formStep + 1) as FormStep);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left"
                                >
                                  <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold">{sa.label}</span>
                                    <span className="block text-xs text-muted-foreground truncate">{sa.address}{sa.detail ? `, ${sa.detail}` : ""}</span>
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <BottomBar>
                        <button
                          onClick={() => goStep((formStep + 1) as FormStep)}
                          disabled={!addr.trim()}
                          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/25 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                          {addr.trim() ? <>Үргэлжлүүлэх <ArrowRight className="w-4 h-4" /></> : target === "from" ? "Авах хаягаа бичнэ үү" : "Хүргэх хаягаа бичнэ үү"}
                        </button>
                      </BottomBar>
                    </>
                  );
                })()}

                {/* ── 4. Нэмэлт мэдээлэл ── */}
                {formStep === 3 && (
                  <>
                    {/* Хураангуй — мөр бүрийг дарж засна */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                      <button onClick={() => goStep(0)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40">
                        <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><SvcIcon id={service?.id} className="w-4 h-4" /></span>
                        <span className="flex-1 min-w-0 text-sm font-semibold truncate">{service?.label}</span>
                        <span className="text-xs font-semibold text-primary">Засах</span>
                      </button>
                      <button onClick={() => goStep(1)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 mx-1" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs text-muted-foreground">Авах</span>
                          <span className="block text-sm font-medium truncate">{fromAddr || "—"}{fromPos ? " 📍" : ""}</span>
                        </span>
                        <span className="text-xs font-semibold text-primary">Засах</span>
                      </button>
                      <button onClick={() => goStep(2)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40">
                        <MapPin className="w-4 h-4 text-primary shrink-0 mx-0.5" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs text-muted-foreground">Хүргэх</span>
                          <span className="block text-sm font-medium truncate">{toAddr || "—"}{toPos ? " 📍" : ""}</span>
                        </span>
                        <span className="text-xs font-semibold text-primary">Засах</span>
                      </button>
                    </div>

                    {visibleSubs(service).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Төрөл</p>
                        <div className="flex flex-wrap gap-2">
                          {visibleSubs(service).map((sub) => {
                            const on = sub.id === subServiceId;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => setSubServiceId(on ? null : sub.id)}
                                title={sub.desc}
                                className={`px-3.5 py-2 rounded-full border text-sm transition-colors ${
                                  on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                }`}
                              >
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {basket.length > 0 && (
                      <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">🛒 {basketPartner?.name ?? "Сагс"}</p>
                          <button onClick={clearBasket} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Цэвэрлэх</button>
                        </div>
                        <div className="space-y-1">
                          {basket.map((i) => (
                            <div key={i.productId} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate">{i.name} × {i.qty}</span>
                              <span className="font-mono shrink-0 ml-2">₮{(i.price * i.qty).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-2">
                          <span className="text-xs text-muted-foreground">Барааны дүн</span>
                          <span className="text-sm font-bold text-primary font-mono">₮{basketTotal.toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Барааны төлбөрийг газарт нь төлнө. Хүргэлтийн үнийг оператор тогтооно.</p>
                      </div>
                    )}

                    {service?.needsCargo && <CargoDetails value={cargo} onChange={setCargo} />}

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Хүргэгчид хэлэх зүйл</p>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder={service?.notePlaceholder ?? "Тэмдэглэл — эмзэг эд зүйл, утасдаж ирэх г.м."}
                        className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                      />
                    </div>

                    <BottomBar>
                      <button
                        onClick={handleEstimate}
                        disabled={!fromAddr.trim() || !toAddr.trim()}
                        className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/25 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                      >
                        Шалгаад захиалах <ArrowRight className="w-4 h-4" />
                      </button>
                    </BottomBar>
                  </>
                )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {/* CONFIRM */}
            {orderStep === "confirm" && (
              <div className="space-y-4">
                <button onClick={() => setOrderStep("form")} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
                  ← Буцах
                </button>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem" }}>Баталгаажуулах</h2>

                {/* Map */}
                <RoutePreview from={fromAddr} to={toAddr} fromPos={fromPos} toPos={toPos} />

                {/* Route */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  {service && (
                    <div className="flex items-center gap-2.5 border-b border-border pb-3">
                      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><SvcIcon id={service.id} className="w-4 h-4" /></span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Үйлчилгээ</p>
                        <p className="text-sm font-medium">{service.label}</p>
                        {subService && <p className="text-xs text-primary mt-0.5">{subService.label}</p>}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 items-stretch">
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <div className="w-px flex-1 bg-border min-h-5" />
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Авах хаяг</p>
                        <p className="text-sm font-medium">{fromAddr}</p>
                        {fromDetail && <p className="text-xs text-muted-foreground">{fromDetail}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Хүргэх хаяг</p>
                        <p className="text-sm font-medium">{toAddr}</p>
                        {toDetail && <p className="text-xs text-muted-foreground">{toDetail}</p>}
                      </div>
                    </div>
                  </div>
                  {(cargo.photoUrl || cargo.weightKg || cargo.fragile || cargo.urgent) && (
                    <div className="border-t border-border pt-3 flex gap-3 items-center">
                      {cargo.photoUrl && (
                        <img src={cargo.photoUrl} alt="Ачаа" className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" />
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {cargo.weightKg != null && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary border border-border">{cargo.weightKg} кг</span>
                        )}
                        {cargo.fragile && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500">Хагарах аюултай</span>
                        )}
                        {cargo.urgent && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-500">Онцгой яаралтай</span>
                        )}
                      </div>
                    </div>
                  )}
                  {note && (
                    <div className="flex gap-2 items-center border-t border-border pt-2 text-xs text-muted-foreground">
                      <Package className="w-3.5 h-3.5 shrink-0" /> {note}
                    </div>
                  )}
                </div>

                {/* Price — operator sets it after the order is placed */}
                <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">Үнэ операторын зүгээс тогтоогдоно</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Захиалга өгсний дараа оператор үнийг баталгаажуулна. Доод үнэ — 5,000₮.</p>
                </div>

                <BottomBar>
                  <button
                    onClick={handleConfirm}
                    disabled={placing}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/25 disabled:opacity-60"
                  >
                    {placing ? <Spinner className="w-5 h-5" /> : <>Хүргэлт захиалах <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </BottomBar>
              </div>
            )}

            {/* TRACKING — эхлээд "одоо юу болж байна", дараа нь дэлгэрэнгүй */}
            {orderStep === "tracking" && myOrder && (() => {
              const view = statusView(myOrder);
              const ms = milestoneIdx(myOrder.status);
              const canCancel = myOrder.status === "шинэ" || myOrder.status === "үнэ батлах";
              const onTheWay = myOrder.status === "томилогдсон" || myOrder.status === "авсан";
              const svc = serviceById(myOrder.serviceId);
              return (
              <div className="space-y-4">
                {/* 1. Одоогийн төлөв — "Таны ээлж" бол тод өнгөөр */}
                {view.tone !== "done" && (
                  <div
                    className={`rounded-3xl p-5 ${
                      view.tone === "action"
                        ? "bg-primary text-primary-foreground"
                        : view.tone === "cancelled"
                          ? "bg-card border border-border"
                          : "bg-[#16181d] text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide opacity-85">
                      {view.tone === "action" ? (
                        <Hand className="w-4 h-4" />
                      ) : view.tone === "cancelled" ? (
                        <CircleX className="w-4 h-4 text-destructive" />
                      ) : (
                        <span className="relative flex w-2.5 h-2.5">
                          <span className="absolute inset-0 rounded-full bg-[var(--brand)] animate-ping opacity-70" />
                          <span className="relative w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
                        </span>
                      )}
                      {view.who}
                    </div>
                    <h2 className="mt-2" style={{ fontWeight: 800, fontSize: "1.65rem", lineHeight: 1.12 }}>{view.title}</h2>
                    <p className={`text-sm mt-1.5 leading-relaxed ${view.tone === "cancelled" ? "text-muted-foreground" : "opacity-80"}`}>{view.body}</p>

                    {onTheWay && myOrder.eta && (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
                        <Clock className="w-4 h-4" /> Ойролцоогоор {myOrder.eta}-д
                      </p>
                    )}

                    {myOrder.status === "үнэ батлах" && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm opacity-80">Хүргэлтийн үнэ</span>
                          <span className="text-4xl font-extrabold tabular">₮{myOrder.price.toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => onConfirmOrder(myOrder.id)}
                          className="w-full bg-white text-[#16181d] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
                        >
                          Зөвшөөрөөд төлөх <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {view.tone === "cancelled" && (
                      <button
                        onClick={handleNewOrder}
                        className="mt-4 w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-bold hover:bg-primary/90 transition-colors"
                      >
                        Шинэ захиалга өгөх
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Дөрвөн шат — хаана явааг нэг харцаар */}
                {ms >= 0 && view.tone !== "done" && (
                  <div className="grid grid-cols-4 gap-1.5" aria-label="Захиалгын шат">
                    {MILESTONES.map((m, i) => (
                      <div key={m} className="space-y-1.5">
                        <span className={`block h-1.5 rounded-full ${i < ms ? "bg-primary" : i === ms ? "bg-primary/50 animate-pulse" : "bg-border"}`} />
                        <span className={`block text-[11px] leading-tight ${i <= ms ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{m}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!viewAs && (view.tone === "wait" || view.tone === "action") && (
                  <NotifyCard role="customer" userId={userId} />
                )}

                {/* 3. Хийх ёстой зүйл — төлбөр */}
                {myOrder.status === "төлбөр хүлээж байна" && (
                  <PaymentPanel
                    order={myOrder}
                    bankInfo={bankInfo}
                    createPayment={onCreatePayment}
                    checkPayment={onCheckPayment}
                    test={testPayments}
                    onPaid={(method) => onMarkPaid(myOrder.id, method)}
                  />
                )}

                {/* Барааны төлбөрийн QR — тухайн газарт төлнө */}
                {(myOrder.basket?.length ?? 0) > 0 && onTheWay && (() => {
                  const shop = partners.find((x) => x.id === myOrder.partnerId);
                  return (
                    <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-2.5">
                      <p className="text-sm font-bold">Барааны төлбөр — ₮{(myOrder.basketTotal ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {shop?.name ?? "Тухайн газар"}-т доорх QR-аар төлнө үү. Хүргэлтийн төлбөр аль хэдийн төлөгдсөн.
                      </p>
                      {shop?.paymentQrUrl ? (
                        <img src={shop.paymentQrUrl} alt="Газрын төлбөрийн QR" className="w-40 h-40 mx-auto rounded-xl bg-white p-2 border border-border" />
                      ) : (
                        <p className="text-xs text-amber-500">Энэ газар QR-аа байршуулаагүй байна — бэлнээр төлнө.</p>
                      )}
                    </div>
                  );
                })()}

                {/* Хүргэгдлээ — баяр хүргэе, үнэлгээ, санал */}
                {myOrder.status === "хүргэгдсэн" && (
                  <DeliveredCelebration
                    order={myOrder}
                    userPhone={userPhone}
                    onRate={onRate}
                    onFeedback={onFeedback}
                    onDone={handleNewOrder}
                  />
                )}

                {/* 4. Хүргэгч */}
                {myOrder.courierName && onTheWay && (
                  <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
                    <button onClick={() => setCourierProfileOpen(true)} className="flex items-center gap-3 text-left group min-w-0">
                      <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold shrink-0">
                        {myOrder.courierName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Таны хүргэгч</p>
                        <p className="font-semibold truncate group-hover:text-primary transition-colors">{myOrder.courierName}</p>
                        <p className="text-xs text-primary flex items-center gap-1">Мэдээлэл харах <ArrowRight className="w-3 h-3" /></p>
                      </div>
                    </button>
                    <a
                      href={`tel:${myOrder.courierPhone}`}
                      className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <Phone className="w-4 h-4" /> Залгах
                    </a>
                  </div>
                )}

                {courierProfileOpen && myOrder.courierName && (
                  <CourierProfileModal
                    courierId={myOrder.courierId ?? myOrder.courierName}
                    name={myOrder.courierName}
                    phone={myOrder.courierPhone ?? ""}
                    docs={courierDocs(myOrder.courierId)}
                    onClose={() => setCourierProfileOpen(false)}
                  />
                )}

                {/* 5. Маршрут */}
                {view.tone !== "cancelled" && (
                  <RoutePreview
                    from={myOrder.fromDetail || myOrder.fromAddress}
                    to={myOrder.toDetail || myOrder.toAddress}
                    fromPos={myOrder.fromLat != null ? { lat: myOrder.fromLat, lng: myOrder.fromLng! } : null}
                    toPos={myOrder.toLat != null ? { lat: myOrder.toLat, lng: myOrder.toLng! } : null}
                    courier={courierLoc}
                  />
                )}

                {/* 6. Дэлгэрэнгүй — хэрэгтэй үед л нээнэ */}
                <details className="group bg-card border border-border rounded-2xl">
                  <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer list-none text-sm font-semibold">
                    Захиалгын дэлгэрэнгүй
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <dl className="px-4 pb-4 space-y-2.5 text-sm border-t border-border pt-3">
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Дугаар</dt><dd className="font-mono">#{myOrder.id}</dd></div>
                    {svc && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Үйлчилгээ</dt><dd className="text-right">{svc.label}</dd></div>}
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground shrink-0">Авах</dt><dd className="text-right">{myOrder.fromDetail || myOrder.fromAddress}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground shrink-0">Хүргэх</dt><dd className="text-right">{myOrder.toDetail || myOrder.toAddress}</dd></div>
                    {myOrder.packageNote && myOrder.packageNote !== "Тэмдэглэлгүй" && (
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground shrink-0">Тэмдэглэл</dt><dd className="text-right">{myOrder.packageNote}</dd></div>
                    )}
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Хүргэлтийн үнэ</dt>
                      <dd className="font-semibold tabular">{myOrder.price > 0 ? `₮${myOrder.price.toLocaleString()}` : "Тогтоогдоогүй"}</dd>
                    </div>
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Захиалсан</dt><dd className="tabular">{myOrder.createdAt}</dd></div>
                  </dl>
                </details>

                {/* Цуцлах — туслах үйлдэл, анхаарал татахгүй */}
                {canCancel && (
                  <button
                    onClick={() => setCancelTarget(myOrder.id)}
                    className="w-full text-sm text-muted-foreground hover:text-destructive py-2 transition-colors"
                  >
                    Захиалга цуцлах
                  </button>
                )}

                {(view.tone === "wait") && (
                  <p className="text-xs text-muted-foreground text-center">Энэ дэлгэц өөрөө шинэчлэгдэнэ — хүлээж суух шаардлагагүй.</p>
                )}
              </div>
              );
            })()}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {/* ── PLACES TAB ── */}
        {tab === "places" && (
          <div className="space-y-3">
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem" }}>Газрууд</h2>
              <p className="text-muted-foreground text-sm mt-0.5">Карго, дэлгүүр, захаас шууд хүргүүл</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={placesSearch}
                onChange={(e) => setPlacesSearch(e.target.value)}
                placeholder="Газар хайх..."
                className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
              {placesSearch && (
                <button onClick={() => setPlacesSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category chips — hidden when searching */}
            {!placesSearch && (
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {PARTNER_CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setPlacesCat(c.key)}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${placesCat === c.key ? "bg-primary text-white border-primary shadow-sm" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
                  >
                    <span>{c.emoji}</span> {c.key}
                  </button>
                ))}
              </div>
            )}

            {/* Partner list */}
            {(() => {
              const q = placesSearch.toLowerCase();
              const filtered = placesSearch
                ? partners.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q))
                : partners.filter(p => p.category === placesCat);
              return (
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{placesSearch ? `"${placesSearch}" олдсонгүй` : "Энэ ангилалд газар байхгүй байна"}</p>
                </div>
              ) : (
                filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2, ease: "easeOut" }}
                  >
                    {p.image && (
                      <div className="relative w-full h-36 overflow-hidden">
                        <img
                          src={cloudinaryUrl(p.image!, 700)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <span className="absolute bottom-2 left-3 text-white text-xs font-medium opacity-80">{p.category}</span>
                      </div>
                    )}
                    <div className="p-3 flex items-center gap-3">
                      {!p.image && (
                        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl shrink-0">
                          {p.emoji}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.address}{p.detail ? ` · ${p.detail}` : ""}</p>
                      </div>
                      {products.some((pr) => pr.partnerId === p.id && pr.inStock) ? (
                        <button
                          onClick={() => openShop(p)}
                          className="shrink-0 text-sm bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all"
                          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                        >
                          Бараа үзэх <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => orderFromPartner(p)}
                          className="shrink-0 text-sm bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all"
                          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                        >
                          Захиалах <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
              );
            })()}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <OrderHistory
              orders={orders}
              userId={userId}
              onTrack={(id) => { setMyOrderId(id); setOrderStep("tracking"); setAppTab("order"); }}
              onRepeat={repeatOrder}
              onNew={startNewOrder}
            />
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div className="space-y-4">
            <InstallButton variant="card" />
            <SettingsPage userId={userId} userName={userName} userPhone={userPhone} onUpdateAuth={onUpdateAuth} onLogout={onLogout} />
          </div>
        )}

        </motion.div>
       </AnimatePresence>
      </div>

      {/* Партнёр дэлгүүрийн бараа */}
      {shopPartner && (
        <PartnerShop
          partner={shopPartner}
          products={products.filter((pr) => pr.partnerId === shopPartner.id)}
          initial={basketPartnerId === shopPartner.id ? basket : []}
          onClose={() => setShopPartner(null)}
          onConfirm={confirmBasket}
        />
      )}

      {/* Quick order add/edit modal */}
      <AnimatePresence>
      {quickModal && (
        <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setQuickModal(false)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div className="bg-card border border-border rounded-t-2xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>{editingId ? "Хурдан захиалга засах" : "Хурдан захиалга нэмэх"}</h3>
              <button onClick={() => setQuickModal(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Нэг удаа тохируулснаар дараа нь нэг товшилтоор захиална (жишээ: Карго авах, Тээш авах).</p>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Нэр</label>
              <input value={qLabel} onChange={(e) => setQLabel(e.target.value)} placeholder="Жишээ: Карго авах" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_EMOJIS.map((e) => (
                  <button key={e} onClick={() => setQEmoji(e)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition-colors ${qEmoji === e ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>{e}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="text-green-400">●</span> Авах хаяг</label>
              <input value={qFrom} onChange={(e) => setQFrom(e.target.value)} placeholder="Дүүрэг, хороо" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
              <input value={qFromDetail} onChange={(e) => setQFromDetail(e.target.value)} placeholder="Гудамж, байр (заавал биш)" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="text-primary">◆</span> Хүргэх хаяг</label>
              <input value={qTo} onChange={(e) => setQTo(e.target.value)} placeholder="Дүүрэг, хороо" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
              <input value={qToDetail} onChange={(e) => setQToDetail(e.target.value)} placeholder="Гудамж, байр (заавал биш)" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
              {savedAddresses.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {savedAddresses.map((a) => (
                    <button key={a.id} onClick={() => { setQTo(a.address); setQToDetail(a.detail); }} className="text-xs border border-border rounded-full px-2.5 py-1 hover:border-primary/40 transition-colors">{a.label}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleSaveQuick} disabled={!qLabel.trim() || !qFrom.trim() || !qTo.trim()} className="w-full bg-primary text-primary-foreground py-3 rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Хадгалах</button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Quick order confirm modal */}
      <AnimatePresence>
      {confirmQO && (
        <motion.div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6" onClick={() => setConfirmQO(null)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div className="bg-card border border-border rounded-2xl w-full max-w-xs p-6 text-center" onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl mx-auto mb-3">{confirmQO.emoji}</div>
            <p className="font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>{confirmQO.label}</p>
            <div className="text-xs text-muted-foreground space-y-0.5 mb-3 text-left bg-secondary/40 rounded-xl p-3">
              <p className="leading-relaxed"><span className="text-green-400">●</span> {confirmQO.fromAddress}{confirmQO.fromDetail ? `, ${confirmQO.fromDetail}` : ""}</p>
              <p className="leading-relaxed"><span className="text-primary">◆</span> {confirmQO.toAddress}{confirmQO.toDetail ? `, ${confirmQO.toDetail}` : ""}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Хурдан захиалга үүсгэхэд итгэлтэй байна уу?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmQO(null)} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-secondary/50 transition-colors">Болих</button>
              <button onClick={confirmPlaceQuick} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Захиалах</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Газрын зураг дээр цэг заах */}
      <AnimatePresence>
        {pickerFor && (
          <LocationPicker
            target={pickerFor}
            initial={pickerFor === "from" ? fromPos : toPos}
            onPick={applyPick}
            onClose={() => setPickerFor(null)}
          />
        )}
      </AnimatePresence>

      {/* Үйлчилгээ сонгох — доороос гарах цонх */}
      <AnimatePresence>
      {servicePickerOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setServicePickerOpen(false)}
        >
          <motion.div
            className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-4 pb-6 max-h-[85dvh] overflow-y-auto"
            initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Үйлчилгээ сонгох</h3>
              <button onClick={() => setServicePickerOpen(false)} aria-label="Хаах" className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SERVICES.map((sv) => {
                const active = sv.id === serviceId;
                return (
                  <button
                    key={sv.id}
                    onClick={() => { pickService(sv.id); setServicePickerOpen(false); }}
                    className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors ${
                      active ? "bg-primary/10 border-primary" : "bg-background border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-2xl leading-none">{sv.emoji}</span>
                    <span className="text-sm font-semibold leading-snug">{sv.label}</span>
                    <span className="text-xs text-muted-foreground leading-snug">{sv.desc}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Захиалга цуцлах уу?"
        body="Цуцалсан захиалгыг сэргээх боломжгүй."
        cancelLabel="Үгүй"
        confirmLabel="Тийм, цуцлах"
        onConfirm={() => {
          if (!cancelTarget) return;
          onCancelOrder(cancelTarget);
          setMyOrderId(null);
          setOrderStep("form");
        }}
        onClose={() => setCancelTarget(null)}
      />

      {/* Доод цэс — голд нь үргэлж харагдах "Захиалах" */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-sm mx-auto grid grid-cols-5 h-[4.75rem]">
          {([
            { key: "order" as AppTab, label: "Нүүр", icon: Home, badge: 0 },
            { key: "places" as AppTab, label: "Газрууд", icon: Store, badge: 0 },
            null,
            { key: "history" as AppTab, label: "Захиалгууд", icon: Clock, badge: activeCount },
            { key: "settings" as AppTab, label: "Профайл", icon: UserIcon, badge: 0 },
          ]).map((item) =>
            item === null ? (
              <div key="fab" className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={startNewOrder}
                  aria-label="Хүргэлт захиалах"
                  className="-mt-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35 ring-4 ring-background flex items-center justify-center"
                >
                  <Plus className="w-7 h-7" strokeWidth={2.5} />
                </motion.button>
                <span className="text-[11px] font-semibold text-primary mt-1">Захиалах</span>
              </div>
            ) : (
              <button
                key={item.key}
                onClick={() => setAppTab(item.key)}
                className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${tab === item.key ? "text-primary" : "text-muted-foreground"}`}
              >
                <span className={`flex items-center justify-center w-14 h-8 rounded-full transition-colors ${tab === item.key ? "bg-primary/12" : ""}`}>
                  <item.icon className="w-[22px] h-[22px]" strokeWidth={tab === item.key ? 2.4 : 2} />
                </span>
                <span className={`text-[11px] ${tab === item.key ? "font-bold" : "font-medium"}`}>{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute top-2 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 bg-primary rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-card tabular">
                    {item.badge}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      </nav>

      {helpOpen && (
        <HelpModal
          title="Хэрхэн ашиглах вэ?"
          subtitle="Захиалга өгөх алхмууд"
          steps={CUSTOMER_HELP_STEPS}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>
  );
}
