import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, ArrowRight, Package, Clock, CheckCircle, Circle, Truck, Phone, X, Star, Home, Briefcase, Search, Store, Plus } from "lucide-react";
import type { Order, OrderStatus } from "../shared/types";
import { useUser, type QuickOrder } from "../shared/UserContext";
import { Spinner } from "../shared/Spinner";
import { SettingsPage } from "./SettingsPage";
import { OrderHistory } from "./OrderHistory";
import { PARTNER_CATEGORIES, type Partner, type PartnerCategory } from "./partners";

type AppTab = "order" | "places" | "history" | "settings";
type OrderStep = "form" | "confirm" | "tracking";

const STATUS_STEPS: { key: OrderStatus; label: string; sub: string }[] = [
  { key: "шинэ",        label: "Захиалга хүлээгдэж байна", sub: "Оператор хүргэгч томилж байна..." },
  { key: "томилогдсон", label: "Хүргэгч томилогдлоо",      sub: "Хүргэгч таны ачааг авахаар явна" },
  { key: "авсан",       label: "Ачааг авлаа",              sub: "Хүргэгч таны захиалгыг хүргэж байна" },
  { key: "хүргэгдсэн", label: "Амжилттай хүргэгдлээ! 🎉", sub: "" },
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
  onAddOrder: (order: Omit<Order, "id" | "createdAt" | "status">) => Promise<string>;
  myOrderId: string | null;
  setMyOrderId: (id: string | null) => void;
  userName: string;
  userId: string;
  userPhone: string;
  onUpdateAuth: (authMethod: "pin" | "pattern", authKey: string) => void;
  onLogout: () => void;
}

// OpenStreetMap embed helper
function MapEmbed({ from, to, theme }: { from: string; to: string; theme: "dark" | "light" }) {
  const query = encodeURIComponent(from);
  const mapFilter = theme === "dark" ? "invert(1) hue-rotate(180deg) brightness(0.85)" : "none";
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border" style={{ height: 160 }}>
      <iframe
        title="Хүргэлтийн байршил"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=106.7,47.8,107.1,48.0&layer=mapnik&marker=47.9,106.9`}
        className="w-full h-full"
        style={{ filter: mapFilter, border: "none" }}
        loading="lazy"
      />
      <div className="absolute inset-0 pointer-events-none">
        {/* from pin */}
        <div className="absolute top-1/3 left-1/3 flex flex-col items-center">
          <div className="w-5 h-5 rounded-full bg-green-400 border-2 border-white shadow-lg" />
          <div className="text-xs bg-card border border-border px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap max-w-24 truncate shadow">
            {from.split(",")[0]}
          </div>
        </div>
        {/* to pin */}
        <div className="absolute top-1/2 right-1/3 flex flex-col items-center">
          <div className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-lg" />
          <div className="text-xs bg-card border border-border px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap max-w-24 truncate shadow">
            {to.split(",")[0]}
          </div>
        </div>
      </div>
      <a
        href={`https://www.google.com/maps/dir/${encodeURIComponent(from + " Монгол")}/${encodeURIComponent(to + " Монгол")}`}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 pointer-events-auto flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors shadow"
      >
        <MapPin className="w-3 h-3" /> Google Maps →
      </a>
    </div>
  );
}

export function CustomerApp({ orders, partners, onAddOrder, myOrderId, setMyOrderId, userName, userId, userPhone, onUpdateAuth, onLogout }: CustomerAppProps) {
  const { theme, savedAddresses, quickOrders, saveQuickOrders } = useUser();
  const [tab, setAppTab] = useState<AppTab>("order");
  // Start on form always; if there's an active order go to tracking
  const [orderStep, setOrderStep] = useState<OrderStep>(myOrderId ? "tracking" : "form");
  const [fromAddr, setFromAddr] = useState("");
  const [fromDetail, setFromDetail] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [toDetail, setToDetail] = useState("");
  const [note, setNote] = useState("");
  const [estimated, setEstimated] = useState<{ price: number; distance: number } | null>(null);
  const [addrTarget, setAddrTarget] = useState<"from" | "to" | null>(null);

  // ── Quick orders (one-tap saved shortcuts) ──
  const [placesCat, setPlacesCat] = useState<PartnerCategory>("Карго");
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
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Truck className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1rem" }}>
            hvrgelt<span className="text-primary">.mn</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
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
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{addr.address}{addr.detail ? `, ${addr.detail}` : ""}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Note */}
                <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Тэмдэглэл — нугалж болохгүй, эмзэг эд зүйл..."
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
                <MapEmbed from={fromAddr} to={toAddr} theme={theme} />

                {/* Route */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
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
                <MapEmbed from={myOrder.fromAddress} to={myOrder.toAddress} theme={theme} />

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
                {myOrder.courierName && myOrder.status !== "шинэ" && (
                  <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>
                        {myOrder.courierName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{myOrder.courierName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Таны хүргэгч
                        </div>
                      </div>
                    </div>
                    <a href={`tel:${myOrder.courierPhone}`} className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-xl text-sm hover:border-primary/50 hover:text-primary transition-colors">
                      <Phone className="w-3.5 h-3.5" /> Залгах
                    </a>
                  </div>
                )}

                {myOrder.status === "шинэ" && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <p className="text-xs text-amber-300">Оператор хүргэгч томилж байна...</p>
                  </div>
                )}

                {myOrder.status === "хүргэгдсэн" && (
                  <button onClick={handleNewOrder} className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl hover:bg-primary/90 transition-colors" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}>
                    Дахин захиалах
                  </button>
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

            {/* Category chips — hidden scrollbar */}
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

            {/* Partner list */}
            <div className="space-y-2">
              {partners.filter((p) => p.category === placesCat).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Энэ ангилалд газар байхгүй байна</p>
                </div>
              ) : (
                partners.filter((p) => p.category === placesCat).map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl shrink-0">{p.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.address}{p.detail ? ` · ${p.detail}` : ""}</p>
                    </div>
                    <button
                      onClick={() => orderFromPartner(p)}
                      className="shrink-0 text-sm bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all"
                      style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
                    >
                      Захиалах <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
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
            <SettingsPage userName={userName} userPhone={userPhone} onUpdateAuth={onUpdateAuth} onLogout={onLogout} />
          </div>
        )}

        </motion.div>
       </AnimatePresence>
      </div>

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
              <p className="truncate"><span className="text-green-400">●</span> {confirmQO.fromAddress}{confirmQO.fromDetail ? `, ${confirmQO.fromDetail}` : ""}</p>
              <p className="truncate"><span className="text-primary">◆</span> {confirmQO.toAddress}{confirmQO.toDetail ? `, ${confirmQO.toDetail}` : ""}</p>
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
          {([
            { key: "order" as AppTab, label: "Захиалга", icon: Truck },
            { key: "places" as AppTab, label: "Газрууд", icon: Store },
            { key: "history" as AppTab, label: "Түүх", icon: Clock, badge: activeCount },
            { key: "settings" as AppTab, label: "Тохиргоо", icon: ({ className }: { className?: string }) => (
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
    </div>
  );
}
