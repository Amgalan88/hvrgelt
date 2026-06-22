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
import { Truck, LogOut } from "lucide-react";
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
    setPinVerified(true); // LoginPage already verified auth for everyone
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
    clearCustomer();
  }

  // Logout buttons ask for confirmation first
  const requestLogout = () => setConfirmLogout(true);

  if (!session) {
    return (
      <LoginPage
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
        />
      )}

      {session.role === "operator" && (
        <OperatorApp
          orders={store.orders}
          couriers={store.couriers}
          operatorName={session.name}
          onAssign={store.assignCourier}
          onUpdateStatus={() => {}}
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
