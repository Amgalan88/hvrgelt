import { useState, useEffect } from "react";
import type { UserRole } from "./components/shared/types";
import { useStore } from "./components/shared/store";
import { UserProvider, useUser } from "./components/shared/UserContext";
import { LoginPage } from "./components/auth/LoginPage";
import { CustomerApp } from "./components/customer/CustomerApp";
import { OperatorApp } from "./components/operator/OperatorApp";
import { CourierApp } from "./components/courier/CourierApp";
import { SuperadminApp } from "./components/superadmin/SuperadminApp";
import { PartnerApp } from "./components/partner/PartnerApp";
import { RoleSwitcher, ViewAsBar } from "./components/superadmin/RoleSwitcher";
import { PinPad } from "./components/shared/PinPad";
import { PatternLock } from "./components/shared/PatternLock";
import { LoadingScreen } from "./components/shared/Spinner";
import { LogOut } from "lucide-react";
import { Logo } from "./components/shared/Logo";
import { MockPage } from "./components/MockPage";
import { Landing, type LegalKey } from "./components/landing/Landing";
import { LegalPage } from "./components/landing/LegalPage";
import { motion, AnimatePresence } from "motion/react";

interface Session {
  role: UserRole;
  id: string;
  name: string;
  phone: string;
  /** Супер админ энэ role-оор үзэж байна — PIN асуухгүй */
  viaAdmin?: boolean;
}

const SESSION_KEY = "hvrgelt_session";
/** Role-оор үзэж байхад супер админы анхны session-ыг хадгалах түлхүүр */
const ADMIN_RETURN_KEY = "hvrgelt_admin_return";

function Inner() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? (JSON.parse(saved) as Session) : null;
    } catch {
      return null;
    }
  });
  // Нэвтэрсэн хэрэглэгч апп нээх бүрт нүүр хуудсаар дамжихгүй
  const [landingDone, setLandingDone] = useState(() => session !== null);
  const [loginMode, setLoginMode] = useState<"customer" | "courier">("customer");
  const [legalPage, setLegalPage] = useState<LegalKey | null>(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [myOrderId, setMyOrderId] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  // Супер админ бусад role-оор үзэх — буцаж орох session-оо хадгална
  const [adminReturn, setAdminReturn] = useState<Session | null>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_RETURN_KEY);
      return saved ? (JSON.parse(saved) as Session) : null;
    } catch {
      return null;
    }
  });
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const store = useStore();
  const { pin, pattern, loadCustomer, clearCustomer } = useUser();
  const hasLock = !!(pin || pattern);

  // If a customer session was restored from localStorage, load their saved data
  useEffect(() => {
    if (session?.role === "customer") loadCustomer(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(role: UserRole, id: string, name: string, phone: string, viaAdmin = false) {
    const s: Session = { role, id, name, phone, viaAdmin };
    setSession(s);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setPinVerified(true);
    setPinError("");
    if (role === "customer") loadCustomer(id);
  }

  /**
   * Супер админ сонгосон role-оор үзнэ. Анхны супер админ session-ыг
   * хадгалж авснаар хүссэн үедээ буцаж орно.
   */
  function viewAs(role: UserRole, id: string, name: string, phone: string) {
    if (!session) return;
    const back = adminReturn ?? session;
    if (!adminReturn) {
      setAdminReturn(back);
      localStorage.setItem(ADMIN_RETURN_KEY, JSON.stringify(back));
    }
    clearCustomer();
    setMyOrderId(null);
    handleLogin(role, id, name, phone, true);
    setSwitcherOpen(false);
  }

  /** Role-оор үзэхээ больж супер админ руугаа буцах */
  function exitViewAs() {
    if (!adminReturn) return;
    clearCustomer();
    setMyOrderId(null);
    setSwitcherOpen(false);
    setAdminReturn(null);
    localStorage.removeItem(ADMIN_RETURN_KEY);
    handleLogin(adminReturn.role, adminReturn.id, adminReturn.name, adminReturn.phone);
  }

  function doLogout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ADMIN_RETURN_KEY);
    setAdminReturn(null);
    setSession(null);
    setMyOrderId(null);
    setPinVerified(false);
    setPinError("");
    setConfirmLogout(false);
    setLandingDone(false);
    setSwitcherOpen(false);
    clearCustomer();
  }

  // Logout buttons ask for confirmation first
  const requestLogout = () => setConfirmLogout(true);

  // ── Хууль эрх зүйн хуудсууд ──────────────────────────────────────
  if (legalPage) {
    return <LegalPage page={legalPage} onBack={() => setLegalPage(null)} />;
  }

  // ── Нүүр хуудас — зөвхөн нэвтрээгүй зочинд (эсвэл гарсны дараа) ─────
  if (!landingDone) {
    return (
      <Landing
        hasSession={!!session}
        onStart={(mode) => { setLoginMode(mode); setLandingDone(true); }}
        onLegal={setLegalPage}
      />
    );
  }

  if (!session) {
    return (
      <LoginPage
        onLogin={handleLogin}
        resolveByPhone={store.resolveByPhone}
        addCustomer={store.addCustomer}
        updateAccountAuth={store.updateAccountAuth}
        updateCustomerAuth={store.updateCustomerAuth}
        registerCourier={store.registerCourier}
        initialMode={loginMode}
        onBack={() => setLandingDone(false)}
      />
    );
  }

  // Customer with lock set → require PIN or Pattern before entering app
  if (session.role === "customer" && hasLock && !pinVerified && !session.viaAdmin) {
    const greeting = `Сайн байна уу, ${session.name.split(".")[0] ?? session.name}!`;
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
        <div className="px-5 pt-6">
          <Logo />
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
      {/* Супер админ өөр role-оор үзэж байгааг сануулах мөр */}
      {adminReturn && session.viaAdmin && (
        <ViewAsBar
          label={session.name}
          onSwitch={() => setSwitcherOpen(true)}
          onExit={exitViewAs}
        />
      )}
      {switcherOpen && (
        <div className="fixed inset-0 z-[120] bg-background overflow-y-auto">
          <RoleSwitcher
            operatorAccounts={store.operatorAccounts}
            courierAccounts={store.courierAccounts}
            customerAccounts={store.customerAccounts}
            partners={store.partners}
            currentRole={session.viaAdmin ? session.role : undefined}
            onClose={() => setSwitcherOpen(false)}
            onEnter={viewAs}
          />
        </div>
      )}

      {session.role === "superadmin" && (
        <SuperadminApp
          operatorAccounts={store.operatorAccounts}
          courierAccounts={store.courierAccounts}
          customerAccounts={store.customerAccounts}
          partners={store.partners}
          bankInfo={store.bankInfo}
          onAddOperator={store.addOperator}
          onUpdateOperator={store.updateOperator}
          onDeleteOperator={store.deleteOperator}
          onAddCourier={store.addCourier}
          onUpdateCourier={store.updateCourier}
          onDeleteCourier={store.deleteCourier}
          onResetCustomerAuth={store.resetCustomerAuth}
          onVerifyCourier={store.verifyCourier}
          onUpdatePartnerAccess={store.updatePartnerAccess}
          feedback={store.feedback}
          onHandleFeedback={store.setFeedbackHandled}
          onAddPartner={store.addPartner}
          onUpdatePartner={store.updatePartner}
          onDeletePartner={store.deletePartner}
          onUpdateBankInfo={store.updateBankInfo}
          onViewAs={() => setSwitcherOpen(true)}
          onLogout={requestLogout}
        />
      )}

      {session.role === "customer" && (
        <CustomerApp
          orders={store.orders}
          partners={store.partners}
          products={store.products}
          bankInfo={store.bankInfo}
          courierDocs={(courierId) => {
            const c = store.courierAccounts.find((x) => x.id === courierId);
            if (!c) return undefined;
            return {
              photoUrl: c.photoUrl,
              licensePhotoUrl: c.licensePhotoUrl,
              licenseNo: c.licenseNo,
              licenseClass: c.licenseClass,
              licenseExpiry: c.licenseExpiry,
              carPhotoUrl: c.carPhotoUrl,
              plate: c.plate,
              verified: c.verified,
              verifiedAt: c.verifiedAt,
            };
          }}
          onAddOrder={store.addOrder}
          onCancelOrder={store.cancelOrder}
          onConfirmOrder={store.confirmOrder}
          onCreatePayment={store.createPayment}
          onMarkPaid={store.markOrderPaid}
          onRate={store.rateOrder}
          onFeedback={store.submitFeedback}
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
          operatorId={session.id}
          operatorName={session.name}
          onSetPrice={store.operatorSetPrice}
          onAssign={store.assignCourier}
          onMarkPaid={store.markOrderPaid}
          onCancelOrder={store.cancelOrder}
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
          account={store.courierAccounts.find((c) => c.id === session.id)}
          onSaveDocs={(docs) => store.updateCourierDocs(session.id, docs)}
          onPickup={(id) => store.courierUpdateStatus(id, "авсан")}
          onDeliver={(id) => store.courierUpdateStatus(id, "хүргэгдсэн")}
          onLogout={requestLogout}
        />
      )}

      {session.role === "partner" && (
        <PartnerApp
          partner={store.partners.find((x) => x.id === session.id)}
          products={store.products.filter((x) => x.partnerId === session.id)}
          onAddProduct={store.addProduct}
          onUpdateProduct={store.updateProduct}
          onDeleteProduct={store.deleteProduct}
          onSaveQr={(url) => store.updatePartnerAccess(session.id, { paymentQrUrl: url })}
          onLogout={requestLogout}
        />
      )}

      <AnimatePresence>
        {confirmLogout && (
          <motion.div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6" style={{ fontFamily: "var(--font-body)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <motion.div className="bg-card border border-border rounded-2xl w-full max-w-xs p-6 text-center"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}>
              <div className="w-12 h-12 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <p className="font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>Гарахдаа итгэлтэй байна уу?</p>
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

// /mock — хөгжүүлэлтийн туршилтын хуудас (MockPage.tsx). Supabase-гүйгээр
// ажиллах тул store ачаалахгүй.
const isMockRoute = typeof window !== "undefined" && /^\/mock\/?$/.test(window.location.pathname);

export default function App() {
  return (
    <UserProvider>
      {isMockRoute ? <MockPage /> : <Inner />}
    </UserProvider>
  );
}
