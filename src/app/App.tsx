import { useState, useEffect } from "react";
import type { UserRole } from "./components/shared/types";
import { useStore } from "./components/shared/store";
import { UserProvider, useUser } from "./components/shared/UserContext";
import { LoginPage } from "./components/auth/LoginPage";
import { CustomerApp } from "./components/customer/CustomerApp";
import { OperatorApp } from "./components/operator/OperatorApp";
import { CourierApp } from "./components/courier/CourierApp";
import { SuperadminApp } from "./components/superadmin/SuperadminApp";
import { PinPad } from "./components/shared/PinPad";
import { PatternLock } from "./components/shared/PatternLock";
import { LoadingScreen } from "./components/shared/Spinner";
import { Truck, LogOut, ArrowRight, Package, Clock, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Session {
  role: UserRole;
  id: string;
  name: string;
  phone: string;
}

function Inner() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const saved = localStorage.getItem("hvrgelt_session");
      return saved ? (JSON.parse(saved) as Session) : null;
    } catch {
      return null;
    }
  });
  const [landingDone, setLandingDone] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [myOrderId, setMyOrderId] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const store = useStore();
  const { pin, pattern, loadCustomer, clearCustomer } = useUser();
  const hasLock = !!(pin || pattern);

  // If a customer session was restored from localStorage, load their saved data
  useEffect(() => {
    if (session?.role === "customer") loadCustomer(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(role: UserRole, id: string, name: string, phone: string) {
    const s = { role, id, name, phone };
    setSession(s);
    localStorage.setItem("hvrgelt_session", JSON.stringify(s));
    setPinVerified(true);
    setPinError("");
    if (role === "customer") loadCustomer(id);
  }

  function doLogout() {
    localStorage.removeItem("hvrgelt_session");
    setSession(null);
    setMyOrderId(null);
    setPinVerified(false);
    setPinError("");
    setConfirmLogout(false);
    setLandingDone(false);
    clearCustomer();
  }

  // Logout buttons ask for confirmation first
  const requestLogout = () => setConfirmLogout(true);

  // ── Always show landing page first ──────────────────────────────────
  if (!landingDone) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Hero */}
        <div className="relative flex-1 flex flex-col">
          <img
            src="https://images.unsplash.com/photo-1765808172074-702dc0371f93?w=800&h=900&fit=crop&auto=format"
            alt="courier"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(7,9,15,0.2) 0%, rgba(7,9,15,0.95) 60%)" }} />

          <nav className="relative z-10 flex items-center justify-between px-5 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 900, fontSize: "1.15rem", color: "#fff" }}>
                hvrgelt<span className="text-primary">.mn</span>
              </span>
            </div>
            <button
              onClick={() => setLandingDone(true)}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              {session ? "Орох" : "Нэвтрэх"}
            </button>
          </nav>

          <div className="relative z-10 mt-auto px-5 pb-8 space-y-5">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <h1 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 900, fontSize: "2.6rem", lineHeight: 1.08, color: "#fff" }}>
                Хурдан.<br />Найдвартай.<br /><span className="text-primary">Дархандаа.</span>
              </h1>
              <p className="text-white/55 text-sm mt-3">30 секундэд захиалга өгч, 340+ хүргэгчтэй холбогдоорой.</p>
            </motion.div>

            {/* Feature chips */}
            <motion.div className="flex gap-2 flex-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              {[
                { icon: Clock, label: "30 минутад" },
                { icon: Package, label: "Аливаа ачаа" },
                { icon: Package, label: "+ Оператортай" },
                { icon: Package, label: "Хямд үнийн сонголттой" },
                { icon: Shield, label: "Найдвартай" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-xs text-white/80">
                  <Icon className="w-3 h-3" /> {label}
                </div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (session) {
                    setPinVerified(true);
                    setLandingDone(true);
                  } else {
                    setLandingDone(true);
                  }
                }}
                className="w-full bg-primary text-white py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1rem" }}
              >
                {session ? `Үргэлжлүүлэх` : "Эхлэх"} <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-background border-t border-border px-5 py-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="max-w-sm mx-auto space-y-5">
            {/* Tagline + contact */}
            <div className="space-y-1.5">

              <p className="text-xs text-muted-foreground leading-relaxed">
                Захиалга өгөхөөс хүргэлт хүлээн авах хүртэл бүгдийг манай хамт олон танд шийдэж ажиллана.
              </p>
              <div className="flex gap-4 text-xs text-muted-foreground pt-0.5">
                <a href="tel:85205258" className="hover:text-foreground transition-colors">📞 9973-9959</a>
                <span>📍 Дархан хот</span>
              </div>
            </div>

            {/* Social links */}
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/hvrgelt.mn"
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 hover:border-primary/40 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
              <a
                href="https://www.instagram.com/hvrgelt.mn"
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 hover:border-primary/40 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Instagram
              </a>
            </div>

            {/* Legal links */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Үйлчилгээний нөхцөл</a>
              <a href="#" className="hover:text-foreground transition-colors">Нууцлалын бодлого</a>
              <a href="#" className="hover:text-foreground transition-colors">Бидний тухай</a>
              <a href="#" className="hover:text-foreground transition-colors">Холбоо барих</a>
            </div>

            {/* Copyright */}
            <div className="border-t border-border pt-3 text-xs text-muted-foreground/50">
              © 2025 hvrgelt.mn — Бүх эрх хуулиар хамгаалагдсан
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginPage
        skipLanding
        onLogin={handleLogin}
        resolveByPhone={store.resolveByPhone}
        addCustomer={store.addCustomer}
        updateAccountAuth={store.updateAccountAuth}
      />
    );
  }

  // Customer with lock set → require PIN or Pattern before entering app
  if (session.role === "customer" && hasLock && !pinVerified) {
    const greeting = `Сайн байна уу, ${session.name.split(".")[0] ?? session.name}!`;
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="flex items-center gap-2 px-5 pt-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <span style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 900, fontSize: "1.1rem" }}>
            hvrgelt<span className="text-primary">.mn</span>
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {pattern ? (
            <PatternLock
              title={greeting}
              subtitle="Pattern зурна уу"
              error={pinError}
              onComplete={(entered) => {
                if (entered === pattern) { setPinVerified(true); setPinError(""); }
                else setPinError("Pattern буруу байна. Дахин зурна уу.");
              }}
              onCancel={doLogout}
            />
          ) : (
            <PinPad
              title={greeting}
              subtitle="PIN кодоо оруулна уу"
              error={pinError}
              onComplete={(entered) => {
                if (entered === pin) { setPinVerified(true); setPinError(""); }
                else setPinError("PIN код буруу байна. Дахин оролдоно уу.");
              }}
              onCancel={doLogout}
            />
          )}
        </div>
      </div>
    );
  }

  // Logged-in screens need DB data — show a loading screen until it arrives
  if (store.loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {session.role === "superadmin" && (
        <SuperadminApp
          operatorAccounts={store.operatorAccounts}
          courierAccounts={store.courierAccounts}
          partners={store.partners}
          onAddOperator={store.addOperator}
          onUpdateOperator={store.updateOperator}
          onDeleteOperator={store.deleteOperator}
          onAddCourier={store.addCourier}
          onUpdateCourier={store.updateCourier}
          onDeleteCourier={store.deleteCourier}
          onAddPartner={store.addPartner}
          onUpdatePartner={store.updatePartner}
          onDeletePartner={store.deletePartner}
          onLogout={requestLogout}
        />
      )}

      {session.role === "customer" && (
        <CustomerApp
          orders={store.orders}
          partners={store.partners}
          onAddOrder={store.addOrder}
          myOrderId={myOrderId}
          setMyOrderId={setMyOrderId}
          userName={session.name}
          userId={session.id}
          userPhone={session.phone}
          onUpdateAuth={(authMethod, authKey) => store.updateCustomerAuth(session.id, authMethod, authKey)}
          onLogout={requestLogout}
          onGoHome={() => setLandingDone(false)}
        />
      )}

      {session.role === "operator" && (
        <OperatorApp
          orders={store.orders}
          couriers={store.couriers}
          operatorName={session.name}
          onAssign={store.assignCourier}
          onUpdateStatus={() => { }}
          onLogout={requestLogout}
        />
      )}

      {session.role === "courier" && (
        <CourierApp
          orders={store.orders}
          courierId={session.id}
          courierName={session.name}
          courierInfo={store.couriers.find((c) => c.id === session.id)}
          onPickup={(id) => store.courierUpdateStatus(id, "авсан")}
          onDeliver={(id) => store.courierUpdateStatus(id, "хүргэгдсэн")}
          onLogout={requestLogout}
        />
      )}

      <AnimatePresence>
        {confirmLogout && (
          <motion.div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <motion.div className="bg-card border border-border rounded-2xl w-full max-w-xs p-6 text-center"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}>
              <div className="w-12 h-12 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <p className="font-bold mb-1" style={{ fontFamily: "'Roboto Slab', serif" }}>Гарахдаа итгэлтэй байна уу?</p>
              <p className="text-sm text-muted-foreground mb-5">Та дахин нэвтрэх шаардлагатай болно.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-secondary/50 transition-colors"
                >
                  Болих
                </button>
                <button
                  onClick={doLogout}
                  className="flex-1 bg-destructive text-white py-2.5 rounded-xl text-sm hover:bg-destructive/90 transition-colors"
                >
                  Гарах
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Inner />
    </UserProvider>
  );
}
