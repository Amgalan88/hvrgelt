import { useState } from "react";
import { MapPin, ArrowRight, Package, Clock, CheckCircle, Circle, Truck, Phone, X, Star, Home, Briefcase, Search } from "lucide-react";
import type { Order, OrderStatus } from "../shared/types";
import { useUser } from "../shared/UserContext";
import { SettingsPage } from "./SettingsPage";
import { OrderHistory } from "./OrderHistory";

type AppTab = "order" | "history" | "settings";
type OrderStep = "form" | "confirm" | "tracking";

const STATUS_STEPS: { key: OrderStatus; label: string; sub: string }[] = [
  { key: "шинэ",        label: "Захиалга хүлээгдэж байна", sub: "Оператор куриер томилж байна..." },
  { key: "томилогдсон", label: "Куриер томилогдлоо",       sub: "Куриер таны ачааг авахаар явна" },
  { key: "авсан",       label: "Ачааг авлаа",              sub: "Куриер таны захиалгыг хүргэж байна" },
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

interface CustomerAppProps {
  orders: Order[];
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

export function CustomerApp({ orders, onAddOrder, myOrderId, setMyOrderId, userName, userId, userPhone, onUpdateAuth, onLogout }: CustomerAppProps) {
  const { theme, savedAddresses, cargoRoute, setCargoRoute } = useUser();
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

  // ── Cargo quick-order (one-tap saved route) ──
  const [cargoSetup, setCargoSetup] = useState(false);
  const [cFrom, setCFrom] = useState("");
  const [cFromDetail, setCFromDetail] = useState("");
  const [cTo, setCTo] = useState("");
  const [cToDetail, setCToDetail] = useState("");
  const [placingCargo, setPlacingCargo] = useState(false);

  const myOrder = orders.find((o) => o.id === myOrderId);
  const statusIdx = myOrder ? getStatusIdx(myOrder.status) : 0;
  const activeCount = orders.filter((o) => (o.customerId === userId || o.customerId.startsWith("cu-new")) && !["хүргэгдсэн", "цуцлагдсан"].includes(o.status)).length;

  function handleEstimate() {
    if (!fromAddr.trim() || !toAddr.trim()) return;
    setOrderStep("confirm");
  }

  async function handleConfirm() {
    const id = await onAddOrder({
      fromAddress: fromAddr, toAddress: toAddr,
      fromDetail: fromDetail || fromAddr, toDetail: toDetail || toAddr,
      packageNote: note || "Тэмдэглэлгүй",
      price: 0, distance: 0, // үнийг оператор тогтооно
      customerName: userName, customerPhone: userPhone, customerId: userId,
    });
    setMyOrderId(id);
    setOrderStep("tracking");
  }

  // One-tap cargo order from the saved cargo route
  async function handleCargoOrder() {
    if (!cargoRoute || placingCargo) return;
    setPlacingCargo(true);
    try {
      const id = await onAddOrder({
        fromAddress: cargoRoute.fromAddress, toAddress: cargoRoute.toAddress,
        fromDetail: cargoRoute.fromDetail || cargoRoute.fromAddress,
        toDetail: cargoRoute.toDetail || cargoRoute.toAddress,
        packageNote: "Карго",
        price: 0, distance: 0, // үнийг оператор тогтооно
        customerName: userName, customerPhone: userPhone, customerId: userId,
      });
      setMyOrderId(id);
      setOrderStep("tracking");
    } finally {
      setPlacingCargo(false);
    }
  }

  function openCargoSetup() {
    setCFrom(cargoRoute?.fromAddress ?? "");
    setCFromDetail(cargoRoute?.fromDetail ?? "");
    setCTo(cargoRoute?.toAddress ?? "");
    setCToDetail(cargoRoute?.toDetail ?? "");
    setCargoSetup(true);
  }

  function handleSaveCargoRoute() {
    if (!cFrom.trim() || !cTo.trim()) return;
    setCargoRoute({
      fromAddress: cFrom.trim(), fromDetail: cFromDetail.trim(),
      toAddress: cTo.trim(), toDetail: cToDetail.trim(),
    });
    setCargoSetup(false);
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

                {/* Cargo quick-order */}
                {cargoRoute ? (
                  <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold" style={{ fontFamily: "'Roboto Slab', serif" }}>Миний карго чиглэл</span>
                      </div>
                      <button onClick={openCargoSetup} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Өөрчлөх</button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="truncate"><span className="text-green-400">●</span> {cargoRoute.fromAddress}{cargoRoute.fromDetail ? `, ${cargoRoute.fromDetail}` : ""}</p>
                      <p className="truncate"><span className="text-primary">◆</span> {cargoRoute.toAddress}{cargoRoute.toDetail ? `, ${cargoRoute.toDetail}` : ""}</p>
                    </div>
                    <button
                      onClick={handleCargoOrder}
                      disabled={placingCargo}
                      className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
                      style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700 }}
                    >
                      {placingCargo ? "Үүсгэж байна..." : <>Карго авах <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={openCargoSetup}
                    className="w-full bg-card border border-dashed border-primary/40 rounded-2xl p-4 flex items-center gap-3 hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Карго авах — хурдан захиалга</p>
                      <p className="text-xs text-muted-foreground">Чиглэлээ тохируулаад нэг товчоор захиалаарай</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                )}

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
                    {fromAddr && (
                      <input
                        value={fromDetail}
                        onChange={(e) => setFromDetail(e.target.value)}
                        placeholder="Гудамж, байр, тоот..."
                        className="w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none pl-6"
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
                    {toAddr && (
                      <input
                        value={toDetail}
                        onChange={(e) => setToDetail(e.target.value)}
                        placeholder="Гудамж, байр, тоот..."
                        className="w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none pl-6"
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
                          onClick={() => fillAddress(addrTarget, addr.address, addr.detail)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors text-left ${i < savedAddresses.length - 1 ? "border-b border-border" : ""}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-none">{addr.label}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{addr.address}</p>
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
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                  style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}
                >
                  Захиалах <ArrowRight className="w-4 h-4" />
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
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Таны куриер
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
                    <p className="text-xs text-amber-300">Оператор куриер томилж байна...</p>
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
      </div>

      {/* Cargo route setup modal */}
      {cargoSetup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setCargoSetup(false)}>
          <div className="bg-card border border-border rounded-t-2xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>Карго чиглэл тохируулах</h3>
              <button onClick={() => setCargoSetup(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Нэг удаа тохируулснаар дараа нь "Карго авах" товчоор шууд захиална.</p>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="text-green-400">●</span> Карго авах цэг</label>
              <input value={cFrom} onChange={(e) => setCFrom(e.target.value)} placeholder="Дүүрэг, хороо" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
              <input value={cFromDetail} onChange={(e) => setCFromDetail(e.target.value)} placeholder="Гудамж, байр, тоот (заавал биш)" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="text-primary">◆</span> Хүргэх хаяг</label>
              <input value={cTo} onChange={(e) => setCTo(e.target.value)} placeholder="Дүүрэг, хороо" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
              <input value={cToDetail} onChange={(e) => setCToDetail(e.target.value)} placeholder="Гудамж, байр, тоот (заавал биш)" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
              {savedAddresses.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {savedAddresses.map((a) => (
                    <button key={a.id} onClick={() => { setCTo(a.address); setCToDetail(a.detail); }} className="text-xs border border-border rounded-full px-2.5 py-1 hover:border-primary/40 transition-colors">{a.label}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleSaveCargoRoute} disabled={!cFrom.trim() || !cTo.trim()} className="w-full bg-primary text-primary-foreground py-3 rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600 }}>Хадгалах</button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-sm mx-auto flex">
          {([
            { key: "order" as AppTab, label: "Захиалга", icon: Truck },
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
