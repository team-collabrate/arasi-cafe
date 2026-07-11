import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, Users, FileText, Package, Truck } from "lucide-react";
import { Toaster } from "sonner";

// Pages

import DashboardPage from "../pages/DashboardPage";
import CustomerListPage from "../pages/CustomerListPage";
import CustomerDetailPage from "../pages/CustomerDetailPage";
import AddCustomerPage from "../pages/AddCustomerPage";
import CreateBillPage from "../pages/CreateBillPage";
import BillDetailPage from "../pages/BillDetailPage";
import BillHistoryPage from "../pages/BillHistoryPage";
import ReceivePaymentPage from "../pages/ReceivePaymentPage";
import PaymentSuccessPage from "../pages/PaymentSuccessPage";
import PaymentHistoryPage from "../pages/PaymentHistoryPage";
import ProductListPage from "../pages/ProductListPage";
import AddEditProductPage from "../pages/AddEditProductPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import SuppliersPage from "../pages/SuppliersPage";
import SupplierDetailPage from "../pages/SupplierDetailPage";
import AddSupplierPage from "../pages/AddSupplierPage";
import ReceiptPreviewPage from "../pages/ReceiptPreviewPage";
import WhatsAppSharePage from "../pages/WhatsAppSharePage";

// ── Bottom Navigation ────────────────────────────────────────
const NAV_TABS = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { path: "/customers", icon: Users, label: "Customers" },
  { path: "/bills", icon: FileText, label: "Bills" },
  { path: "/products", icon: Package, label: "Products" },
  { path: "/suppliers", icon: Truck, label: "Suppliers" },
];

const BOTTOM_NAV_PATHS = ["/dashboard", "/customers", "/bills", "/products", "/suppliers"];

function BottomNav() {
  const location = useLocation();
  const show = BOTTOM_NAV_PATHS.includes(location.pathname);
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-40 pointer-events-none">
      <div className="w-full max-w-[430px] pointer-events-auto">
        <div
          className="bg-white border-t"
          style={{ borderColor: "#EDE0DB", boxShadow: "0 -4px 24px rgba(139,30,36,0.06)" }}
        >
          <div className="flex items-center justify-around px-2 py-2">
            {NAV_TABS.map(({ path, icon: Icon, label }) => {
              const active =
                location.pathname === path ||
                (path !== "/dashboard" && location.pathname.startsWith(path + "/"));
              return (
                <Link
                  key={path}
                  to={path}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <div
                    className="flex items-center justify-center rounded-lg transition-all duration-200"
                    style={{
                      width: 44,
                      height: 28,
                      background: active ? "#8B1E24" : "transparent",
                    }}
                  >
                    <Icon
                      size={19}
                      style={{ color: active ? "#FFF8F4" : "#6B4C4F" }}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                  </div>
                  <span
                    className="text-[10px] font-semibold leading-none"
                    style={{ color: active ? "#8B1E24" : "#6B4C4F" }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page transition wrapper ──────────────────────────────────
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ minHeight: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ── App shell ────────────────────────────────────────────────
function AppShell() {
  const location = useLocation();
  const isSplash = false;

  return (
    <div
      className="min-h-screen bg-[#F9F6F2] flex justify-center"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="w-full bg-white relative flex flex-col min-h-screen overflow-x-hidden"
        style={{ maxWidth: 430 }}
      >
        <style>{`
          ::-webkit-scrollbar { display: none; }
          * { -ms-overflow-style: none; scrollbar-width: none; }
          @media print { .no-print { display: none !important; } }
        `}</style>

        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: isSplash ? 0 : 88 }}
        >
          <PageTransition>
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/customers/new" element={<AddCustomerPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/customers/:id/edit" element={<AddCustomerPage />} />

              <Route path="/bills" element={<BillHistoryPage />} />
              <Route path="/bills/new" element={<CreateBillPage />} />
              <Route path="/bills/:id/edit" element={<CreateBillPage />} />
              <Route path="/bills/:id" element={<BillDetailPage />} />

              <Route path="/payments" element={<PaymentHistoryPage />} />
              <Route path="/payments/new" element={<ReceivePaymentPage />} />
              <Route path="/payments/success" element={<PaymentSuccessPage />} />
              <Route path="/payments/:id" element={<ReceiptPreviewPage />} />

              <Route path="/products" element={<ProductListPage />} />
              <Route path="/products/new" element={<AddEditProductPage />} />
              <Route path="/products/:id/edit" element={<AddEditProductPage />} />

              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/new" element={<AddSupplierPage />} />
              <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/receipts/:id" element={<ReceiptPreviewPage />} />
              <Route path="/share/:id" element={<WhatsAppSharePage />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </PageTransition>
        </main>

        <BottomNav />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            borderRadius: "0.875rem",
            fontSize: "13px",
            fontWeight: "600",
            border: "1px solid #EDE0DB",
          },
        }}
      />
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
