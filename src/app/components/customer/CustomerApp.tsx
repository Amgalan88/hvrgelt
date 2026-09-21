import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, ArrowRight, Package, Clock, CheckCircle, Circle, Truck, Phone, X, Star, Home, Briefcase, Search, Store, Plus } from "lucide-react";
import type { Order, OrderStatus, CourierDocs, BasketItem, PartnerProduct } from "../shared/types";
import type { PaymentIntent } from "../shared/store";
import { useUser, type QuickOrder } from "../shared/UserContext";
import { Spinner } from "../shared/Spinner";
import { SettingsPage } from "./SettingsPage";
import { OrderHistory } from "./OrderHistory";
import { PARTNER_CATEGORIES, type Partner, type PartnerCategory } from "./partners";
import { SERVICES, serviceById, subServiceById } from "./services";
import { CourierProfileModal } from "./CourierProfileModal";
import { CargoDetails, type CargoInfo } from "./CargoDetails";
import { PaymentPanel } from "./PaymentPanel";
import { SearchingCourier } from "./SearchingCourier";
import { DeliveredCelebration } from "./DeliveredCelebration";
import { PartnerShop } from "./PartnerShop";
import { cloudinaryUrl } from "../../lib/cloudinary";
import { Logo } from "../shared/Logo";
import { useFirstVisitHelp, HelpButton, HelpModal } from "../shared/HelpGuide";

const CUSTOMER_HELP_STEPS = [
  "Утасны дугаараа оруулж нэг л удаа бүртгүүлнэ.",
  "Хэрэгтэй үйлчилгээгээ сонгоно — бараа хүргэлт, захаас бараа авах, портер, крантай машин, хүүхэд хүргэлт.",
  "\"Хаашаа хүргэх вэ?\" дээр авах болон хүргэх хаягаа бичнэ.",
  "Захиалга илгээгээд хүлээнэ — оператор үнийг тогтооно.",
  "Апп дээрээ ирсэн үнийг баталгаажуулна.",
  "Хүргэгч томилогдож, ачааг хүргэнэ — статусыг Захиалга tab дээрээс шууд хараарай.",
];

type AppTab = "order" | "places" | "history" | "settings";
type OrderStep = "form" | "confirm" | "tracking";

const STATUS_STEPS: { key: OrderStatus; label: string; sub: string }[] = [
  { key: "шинэ",                 label: "Захиалга хүлээгдэж байна",  sub: "Оператор тантай холбогдож үнийг тогтооно..." },
  { key: "үнэ батлах",           label: "Үнэ батлахыг хүлээж байна", sub: "Та доорх товчоор үнийг батлана уу" },
  { key: "төлбөр хүлээж байна",  label: "Төлбөр хүлээгдэж байна",    sub: "QR-аар төлбөрөө төлнө үү" },
  { key: "жолооч хайж байна",    label: "Жолооч хайж байна",         sub: "Танд жолооч хуваарилаад мэдээлэл илгээнэ" },
  { key: "томилогдсон",          label: "Хүргэгч томилогдлоо",       sub: "Хүргэгч таны ачааг авахаар явна" },
  { key: "авсан",                label: "Ачааг авлаа",               sub: "Хүргэгч таны захиалгыг хүргэж байна" },
  { key: "хүргэгдсэн",          label: "Амжилттай хүргэгдлээ! 🎉",  sub: "" },
];

function getStatusIdx(status: OrderStatus) {
  return STATUS_STEPS.findIndex((s) => s.key === status);
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
  onCreatePayment: (orderId: string, amount: number) => Promise<PaymentIntent>;
  onMarkPaid: (orderId: string, method: string) => Promise<void>;
  onRate: (orderId: string, score: number, comment?: string) => Promise<void>;
  onFeedback: (data: { phone: string; message: string; orderId?: string }) => Promise<void>;
  myOrderId: string | null;
  setMyOrderId: (id: string | null) => void;
  userName: string;
  userId: string;
  userPhone: string;
  onUpdateAuth: (authMethod: "pin" | "pattern", authKey: string) => void;
  onLogout: () => void;
  onGoHome: () => void;
}

// Route preview — Google Maps link only (no fake embedded map)
function RoutePreview({ from, to }: { from: string; to: string }) {
  const mapsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(from + " Дархан Монгол")}/${encodeURIComponent(to + " Дархан Монгол")}`;
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between bg-secondary/50 border border-border rounded-2xl px-4 py-3 hover:border-primary/40 hover:bg-secondary/80 transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="w-px h-4 bg-border" />
          <MapPin className="w-3 h-3 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-foreground leading-relaxed">{from}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{to}</p>
        </div>
      </div>
      <span className="shrink-0 text-xs text-primary flex items-center gap-1 ml-3 group-hover:underline">
        Google Maps <ArrowRight className="w-3 h-3" />
      </span>
    </a>
  );
}

export function CustomerApp({ orders, partners, products, bankInfo, courierDocs, onAddOrder, onCancelOrder, onConfirmOrder, onCreatePayment, onMarkPaid, onRate, onFeedback, myOrderId, setMyOrderId, userName, userId, userPhone, onUpdateAuth, onLogout, onGoHome }: CustomerAppProps) {
  const { savedAddresses, quickOrders, saveQuickOrders } = useUser();
  const [helpOpen, setHelpOpen] = useFirstVisitHelp("customer");
  const [tab, setAppTab] = useState<AppTab>("order");
  // Start on form always; if there's an active order go to tracking
  const [orderStep, setOrderStep] = useState<OrderStep>(myOrderId ? "tracking" : "form");
  const [fromAddr, setFromAddr] = useState("");
  const [fromDetail, setFromDetail] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [toDetail, setToDetail] = useState("");
  const [note, setNote] = useState("");
  const [serviceId, setServiceId] = useState<string>(SERVICES[0].id);
  const [subServiceId, setSubServiceId] = useState<string | null>(null);
  const [cargo, setCargo] = useState<CargoInfo>({ fragile: false, urgent: false });
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [basketPartnerId, setBasketPartnerId] = useState<string | null>(null);
  const [shopPartner, setShopPartner] = useState<Partner | null>(null);
  const [courierProfileOpen, setCourierProfileOpen] = useState(false);
  const [estimated, setEstimated] = useState<{ price: number; distance: number } | null>(null);
  const [addrTarget, setAddrTarget] = useState<"from" | "to" | null>(null);

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

  function pickService(id: string) {
    setServiceId(id);
    setSubServiceId(null);
    const sv = serviceById(id);
    if (!sv?.needsCargo) setCargo({ fragile: false, urgent: false });
  }
  const myOrder = orders.find((o) => o.id === myOrderId);
  const statusIdx = myOrder ? getStatusIdx(myOrder.status) : 0;
  const activeCount = orders.filter((o) => (o.customerId === userId || o.customerId.startsWith("cu-new")) && !["хүргэгдсэн", "цуцлагдсан"].includes(o.status)).length;

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
    saveQuickOrders(quickOrders.filter((q) => q.id !== id));
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
    setAppTab("order");
  }

  function orderFromPartner(p: Partner) {
    const fullAddr = [p.name, p.address, p.detail].filter(Boolean).join(", ");
    setFromAddr(fullAddr);
    setFromDetail("");
    setNote("");
    setToAddr(""); setToDetail("");
    setOrderStep("form");
    setAppTab("order");
  }

  function handleNewOrder() {
    setMyOrderId(null);
    setBasket([]); setBasketPartnerId(null);
    setCargo({ fragile: false, urgent: false });
    setFromAddr(""); setFromDetail(""); setToAddr(""); setToDetail(""); setNote("");
    setEstimated(null);
    setOrderStep("form");
  }

  function fillAddress(target: "from" | "to", addr: string, detail: string) {
    if (target === "from") { setFromAddr(addr); setFromDetail(detail); }
    else { setToAddr(addr); setToDetail(detail); }
    setAddrTarget(null);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setHelpOpen(true)} />
          {tab === "order" && myOrder && orderStep === "tracking" && (
            <button onClick={handleNewOrder} className="text-xs border border-border px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              + Шинэ
            </button>
          )}
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs" style={{ fontFamily: "'Roboto Slab', serif" }}>
            {userName[0]}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-5 pb-24">
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
            {/* FORM */}
            {orderStep === "form" && (
              <div className="space-y-4">
                <div>
                  <h1 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.6rem", lineHeight: 1.2 }}>
                    Хаашаа<br />хүргэх вэ?
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">30 секундэд захиалаарай</p>
                </div>

                {/* Services — бидний санал болгож буй үндсэн үйлчилгээнүүд */}
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>Үйлчилгээ сонгох</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICES.map((sv, i) => {
                      const active = sv.id === serviceId;
                      return (
                        <motion.button
                          key={sv.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, type: "spring", damping: 20, stiffness: 300 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => pickService(sv.id)}
                          className={`flex items-start gap-2 rounded-2xl border p-2.5 text-left transition-colors ${
                            active ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-primary/40"
                          }`}
                        >
                          <span className="text-xl leading-none shrink-0">{sv.emoji}</span>
                          <span className="min-w-0">
                            <span className="block text-[12px] font-semibold leading-tight">{sv.label}</span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5 leading-snug">{sv.desc}</span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Дэд төрөл — үйлчилгээнээс хамаарна */}
                {service && service.subs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Төрлөө нарийвчилна уу</p>
                    <div className="flex flex-wrap gap-2">
                      {service.subs.map((sub) => {
                        const on = sub.id === subServiceId;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setSubServiceId(on ? null : sub.id)}
                            title={sub.desc}
                            className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                              on
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick orders — compact icon tiles */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>Хурдан захиалга</p>
                    {quickOrders.length > 0 && (
                      <button onClick={() => setQuickEdit((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {quickEdit ? "Болсон" : "Засах"}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {quickOrders.map((qo, i) => (
                      <motion.div
                        key={qo.id}
                        className="relative"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04, type: "spring", damping: 20, stiffness: 300 }}
                      >
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => (quickEdit ? openQuickEdit(qo) : setConfirmQO(qo))}
                          disabled={placingId === qo.id}
                          className="w-full flex flex-col items-center gap-1.5 group disabled:opacity-50"
                        >
                          <div className="w-full aspect-square rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl group-hover:bg-primary/15 transition-colors">
                            {placingId === qo.id ? "…" : qo.emoji}
                          </div>
                          <span className="text-[11px] text-center leading-tight truncate w-full">{qo.label}</span>
                        </motion.button>
                        {quickEdit && (
                          <button onClick={() => deleteQuick(qo.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                    <button onClick={openQuickAdd} className="flex flex-col items-center gap-1.5">
                      <div className="w-full aspect-square rounded-2xl bg-card border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] text-center text-muted-foreground">Нэмэх</span>
                    </button>
                  </div>
                </div>

                {/* Address box */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                      <input
                        value={fromAddr}
                        onChange={(e) => setFromAddr(e.target.value)}
                        onFocus={() => setAddrTarget("from")}
                        placeholder="Авах хаяг — дүүрэг, хороо"
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      {fromAddr && <button onClick={() => { setFromAddr(""); setFromDetail(""); }}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                    </div>
                    {(fromDetail || addrTarget === "from") && fromAddr && (
                      <input
                        value={fromDetail}
                        onChange={(e) => setFromDetail(e.target.value)}
                        placeholder="Хаяг, байр, тоот..."
                        className="w-full bg-transparent text-xs text-foreground/70 placeholder:text-muted-foreground/40 focus:outline-none pl-6"
                      />
                    )}
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <input
                        value={toAddr}
                        onChange={(e) => setToAddr(e.target.value)}
                        onFocus={() => setAddrTarget("to")}
                        placeholder="Хүргэх хаяг — дүүрэг, хороо"
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      {toAddr && <button onClick={() => { setToAddr(""); setToDetail(""); }}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                    </div>
                    {(toDetail || addrTarget === "to") && toAddr && (
                      <input
                        value={toDetail}
                        onChange={(e) => setToDetail(e.target.value)}
                        placeholder="Хаяг, байр, тоот..."
                        className="w-full bg-transparent text-xs text-foreground/70 placeholder:text-muted-foreground/40 focus:outline-none pl-6"
                      />
                    )}
                  </div>
                </div>

                {/* Saved address quick-select */}
                {addrTarget && savedAddresses.length > 0 && (
                  <div className="bg-card border border-primary/30 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {addrTarget === "from" ? "Авах хаяг сонгох" : "Хүргэх хаяг сонгох"}
                      </span>
                    </div>
                    {savedAddresses.map((addr, i) => {
                      const cfg = ICON_MAP[addr.icon];
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={addr.id}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            const addrFull = [addr.address, addr.detail].filter(Boolean).join(", ");
                            fillAddress(addrTarget, addr.label, addrFull);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors text-left ${i < savedAddresses.length - 1 ? "border-b border-border" : ""}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-none">{addr.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{addr.address}{addr.detail ? `, ${addr.detail}` : ""}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Сагс — партнёрын бараа */}
                {basket.length > 0 && (
                  <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>
                        🛒 {basketPartner?.name ?? "Сагс"}
                      </p>
                      <button
                        onClick={() => { setBasket([]); setBasketPartnerId(null); }}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Цэвэрлэх
                      </button>
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
                    <p className="text-[11px] text-muted-foreground">
                      Барааны төлбөрийг газарт нь төлнө. Хүргэлтийн үнийг оператор тогтооно.
                    </p>
                  </div>
                )}

                {/* Ачааны мэдээлэл — зураг, жин, хагарах, яаралтай */}
                {service?.needsCargo && <CargoDetails value={cargo} onChange={setCargo} />}

                {/* Note */}
                <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={service?.notePlaceholder ?? "Тэмдэглэл — нугалж болохгүй, эмзэг эд зүйл..."}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleEstimate}
                  disabled={!fromAddr.trim() || !toAddr.trim()}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                  style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
                >
                  Үргэлжлүүлэх <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* CONFIRM */}
            {orderStep === "confirm" && (
              <div className="space-y-4">
                <button onClick={() => setOrderStep("form")} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
                  ← Буцах
                </button>
                <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.3rem" }}>Баталгаажуулах</h2>

                {/* Map */}
                <RoutePreview from={fromAddr} to={toAddr} />

                {/* Route */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  {service && (
                    <div className="flex items-center gap-2.5 border-b border-border pb-3">
                      <span className="text-xl leading-none">{service.emoji}</span>
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

                <button
                  onClick={handleConfirm}
                  disabled={placing}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90 transition-colors"
                  style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
                >
                  {placing ? <Spinner className="w-5 h-5" /> : <>Захиалах <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}

            {/* TRACKING */}
            {orderStep === "tracking" && myOrder && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">#{myOrder.id}</p>
                    <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.2rem" }}>
                      {myOrder.status === "хүргэгдсэн" ? "Амжилттай!" : "Захиалгын явц"}
                    </h2>
                  </div>
                  <span className="text-right" style={{ fontFamily: "'Roboto Slab', serif" }}>
                    {myOrder.price > 0 ? (
                      <span className="text-xl font-bold text-primary">₮{myOrder.price.toLocaleString()}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Үнэ тогтоогдож байна</span>
                    )}
                  </span>
                </div>

                {/* Map */}
                <RoutePreview from={myOrder.fromAddress} to={myOrder.toAddress} />

                {/* Progress steps */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  {STATUS_STEPS.map((s, i) => {
                    const done = i <= statusIdx;
                    const active = i === statusIdx;
                    const isLast = i === STATUS_STEPS.length - 1;
                    return (
                      <div key={s.key} className="flex gap-3">
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${done ? "bg-primary border-primary" : "bg-secondary border-border"}`}>
                            {done && !active ? <CheckCircle className="w-3.5 h-3.5 text-white" />
                              : active ? <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                              : <Circle className="w-3 h-3 text-muted-foreground" />}
                          </div>
                          {!isLast && <div className={`w-0.5 h-6 ${i < statusIdx ? "bg-primary" : "bg-border"}`} />}
                        </div>
                        <div className={`pb-5 ${isLast ? "pb-0" : ""} pt-0.5`}>
                          <p className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"} ${active ? "font-medium" : ""}`}>{s.label}</p>
                          {active && s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
                          {active && myOrder.eta && myOrder.status !== "шинэ" && (
                            <p className="text-xs text-primary font-mono mt-0.5">~ {myOrder.eta}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Courier */}
                {myOrder.courierName && ["томилогдсон", "авсан", "хүргэгдсэн"].includes(myOrder.status) && (
                  <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                    <button
                      onClick={() => setCourierProfileOpen(true)}
                      className="flex items-center gap-3 text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold group-hover:border-primary transition-colors" style={{ fontFamily: "'Roboto Slab', serif" }}>
                        {myOrder.courierName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">{myOrder.courierName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Мэдээлэл харах
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </button>
                    <a href={`tel:${myOrder.courierPhone}`} className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-xl text-sm hover:border-primary/50 hover:text-primary transition-colors">
                      <Phone className="w-3.5 h-3.5" /> Залгах
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

                {/* Cancel before assignment */}
                {myOrder.status === "шинэ" && (
                  <div className="space-y-2">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <p className="text-xs text-amber-300">Оператор тантай холбогдож үнийг тогтооно...</p>
                    </div>
                    <button
                      onClick={() => { onCancelOrder(myOrder.id); setMyOrderId(null); setOrderStep("form"); }}
                      className="w-full border border-destructive/50 text-destructive py-2.5 rounded-xl text-sm hover:bg-destructive/10 transition-colors"
                    >
                      Захиалга цуцлах
                    </button>
                  </div>
                )}

                {/* Price approval */}
                {myOrder.status === "үнэ батлах" && (
                  <div className="space-y-3">
                    <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 space-y-2">
                      <p className="text-xs text-muted-foreground">Хүргэлтийн үнэ тогтоогдлоо</p>
                      <p className="text-3xl font-bold text-primary" style={{ fontFamily: "'Roboto Slab', serif" }}>
                        ₮{myOrder.price.toLocaleString()}
                      </p>
                      {myOrder.courierName && (
                        <p className="text-xs text-muted-foreground">Хүргэгч: {myOrder.courierName}</p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { onCancelOrder(myOrder.id); setMyOrderId(null); setOrderStep("form"); }}
                        className="flex-1 border border-destructive/50 text-destructive py-3 rounded-2xl text-sm hover:bg-destructive/10 transition-colors"
                      >
                        Цуцлах
                      </button>
                      <button
                        onClick={() => onConfirmOrder(myOrder.id)}
                        className="flex-1 bg-primary text-white py-3 rounded-2xl text-sm hover:bg-primary/90 transition-colors"
                        style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
                      >
                        Зөвшөөрч төлөх
                      </button>
                    </div>
                  </div>
                )}

                {/* Барааны төлбөрийн QR — тухайн газарт төлнө */}
                {(myOrder.basket?.length ?? 0) > 0 && ["томилогдсон", "авсан"].includes(myOrder.status) && (() => {
                  const shop = partners.find((x) => x.id === myOrder.partnerId);
                  return (
                    <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
                      <p className="text-sm font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>
                        🛒 Барааны төлбөр — ₮{(myOrder.basketTotal ?? 0).toLocaleString()}
                      </p>
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

                {/* Төлбөр */}
                {myOrder.status === "төлбөр хүлээж байна" && (
                  <PaymentPanel
                    order={myOrder}
                    bankInfo={bankInfo}
                    createPayment={onCreatePayment}
                    onPaid={(method) => onMarkPaid(myOrder.id, method)}
                  />
                )}

                {/* Жолооч хайж байна */}
                {myOrder.status === "жолооч хайж байна" && <SearchingCourier />}

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
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {/* ── PLACES TAB ── */}
        {tab === "places" && (
          <div className="space-y-3">
            <div>
              <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.4rem" }}>Газрууд</h2>
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
                          style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
                        >
                          Бараа үзэх <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => orderFromPartner(p)}
                          className="shrink-0 text-sm bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all"
                          style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
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
            <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.2rem" }}>Захиалгын түүх</h2>
            <OrderHistory
              orders={orders}
              userId={userId}
              onTrack={(id) => { setMyOrderId(id); setOrderStep("tracking"); setAppTab("order"); }}
            />
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div className="space-y-4">
            <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.2rem" }}>Тохиргоо</h2>
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
              <h3 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>{editingId ? "Хурдан захиалга засах" : "Хурдан захиалга нэмэх"}</h3>
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

            <button onClick={handleSaveQuick} disabled={!qLabel.trim() || !qFrom.trim() || !qTo.trim()} className="w-full bg-primary text-primary-foreground py-3 rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}>Хадгалах</button>
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
            <p className="font-bold mb-2" style={{ fontFamily: "'Roboto Slab', serif" }}>{confirmQO.label}</p>
            <div className="text-xs text-muted-foreground space-y-0.5 mb-3 text-left bg-secondary/40 rounded-xl p-3">
              <p className="leading-relaxed"><span className="text-green-400">●</span> {confirmQO.fromAddress}{confirmQO.fromDetail ? `, ${confirmQO.fromDetail}` : ""}</p>
              <p className="leading-relaxed"><span className="text-primary">◆</span> {confirmQO.toAddress}{confirmQO.toDetail ? `, ${confirmQO.toDetail}` : ""}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Хурдан захиалга үүсгэхэд итгэлтэй байна уу?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmQO(null)} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-secondary/50 transition-colors">Болих</button>
              <button onClick={confirmPlaceQuick} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}>Захиалах</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-sm mx-auto flex">
          {/* Нүүр — landing page руу буцах */}
          <button
            onClick={onGoHome}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Нүүр</span>
          </button>

          {([
            { key: "order" as AppTab, label: "Захиалга", icon: Truck, badge: 0 },
            { key: "places" as AppTab, label: "Газрууд", icon: Store, badge: 0 },
            { key: "history" as AppTab, label: "Түүх", icon: Clock, badge: activeCount },
            { key: "settings" as AppTab, label: "Тохиргоо", badge: 0, icon: ({ className }: { className?: string }) => (
              <div className={`w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold ${className}`} style={{ fontSize: "0.6rem" }}>
                {userName[0]}
              </div>
            )},
          ] as const).map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setAppTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 relative transition-colors ${tab === key ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
              {badge != null && badge > 0 && (
                <span className="absolute top-1.5 right-1/4 w-4 h-4 bg-primary rounded-full text-white flex items-center justify-center" style={{ fontSize: "0.55rem" }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
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
