import { useState } from "react";
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
import { Truck } from "lucide-react";

interface Session {
  role: UserRole;
  id: string;
  name: string;
}

function Inner() {
  const [session, setSession] = useState<Session | null>(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [myOrderId, setMyOrderId] = useState<string | null>(null);
  const store = useStore();
  const { pin, pattern } = useUser();
  const hasLock = !!(pin || pattern);

  function handleLogin(role: UserRole, id: string, name: string) {
    setSession({ role, id, name });
    setPinVerified(true); // LoginPage already verified auth for everyone
    setPinError("");
  }

  function handleLogout() {
    setSession(null);
    setMyOrderId(null);
    setPinVerified(false);
    setPinError("");
  }

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
      <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
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
              onCancel={handleLogout}
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
              onCancel={handleLogout}
            />
          )}
        </div>
      </div>
    );
  }

  if (session.role === "superadmin") {
    return (
      <SuperadminApp
        operatorAccounts={store.operatorAccounts}
        courierAccounts={store.courierAccounts}
        onAddOperator={store.addOperator}
        onUpdateOperator={store.updateOperator}
        onDeleteOperator={store.deleteOperator}
        onAddCourier={store.addCourier}
        onUpdateCourier={store.updateCourier}
        onDeleteCourier={store.deleteCourier}
        onLogout={handleLogout}
      />
    );
  }

  if (session.role === "customer") {
    return (
      <CustomerApp
        orders={store.orders}
        onAddOrder={store.addOrder}
        myOrderId={myOrderId}
        setMyOrderId={setMyOrderId}
        userName={session.name}
        userId={session.id}
        onLogout={handleLogout}
      />
    );
  }

  if (session.role === "operator") {
    return (
      <OperatorApp
        orders={store.orders}
        couriers={store.couriers}
        operatorName={session.name}
        onAssign={store.assignCourier}
        onUpdateStatus={() => {}}
        onLogout={handleLogout}
      />
    );
  }

  if (session.role === "courier") {
    return (
      <CourierApp
        orders={store.orders}
        courierId={session.id}
        courierName={session.name}
        courierInfo={store.couriers.find((c) => c.id === session.id)}
        onPickup={(id) => store.courierUpdateStatus(id, "авсан")}
        onDeliver={(id) => store.courierUpdateStatus(id, "хүргэгдсэн")}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}

export default function App() {
  return (
    <UserProvider>
      <Inner />
    </UserProvider>
  );
}
