
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminPromo from "./pages/AdminPromo";
import AdminSeo from "./pages/AdminSeo";
import Manager from "./pages/Manager";
import AdminPayments from "./pages/AdminPayments";
import AdminLayout from "./components/admin/AdminLayout";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import BackofficeGuard from "./components/backoffice/BackofficeGuard";
import Dashboard from "./pages/backoffice/Dashboard";
import UnitsPage from "./pages/backoffice/UnitsPage";
import ClientsPage from "./pages/backoffice/ClientsPage";
import WorkersPage from "./pages/backoffice/WorkersPage";
import MaterialsPage from "./pages/backoffice/MaterialsPage";
import FittingsPage from "./pages/backoffice/FittingsPage";
import OperationsPage from "./pages/backoffice/OperationsPage";
import SemiProductsPage from "./pages/backoffice/SemiProductsPage";
import FinishedProductsPage from "./pages/backoffice/FinishedProductsPage";
import StockPage from "./pages/backoffice/StockPage";
import OrdersPage from "./pages/backoffice/OrdersPage";
import ProductionPage from "./pages/backoffice/ProductionPage";
import OverconsumptionReport from "./pages/backoffice/OverconsumptionReport";
import CostReport from "./pages/backoffice/CostReport";
import StockOnDateReport from "./pages/backoffice/StockOnDateReport";
import PeriodSettingsPage from "./pages/backoffice/PeriodSettingsPage";

const queryClient = new QueryClient();

const BO = ({ children, module }: { children: React.ReactNode; module?: string }) => (
  <BackofficeGuard module={module}>{children}</BackofficeGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminLayout><Admin /></AdminLayout>} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/admin/promo" element={<AdminLayout><AdminPromo /></AdminLayout>} />
            <Route path="/admin/seo" element={<AdminLayout><AdminSeo /></AdminLayout>} />
            <Route path="/admin/payments" element={<AdminLayout><AdminPayments /></AdminLayout>} />
            <Route path="/manager" element={<Manager />} />
            <Route path="/backoffice" element={<BO module="dashboard"><Dashboard /></BO>} />
            <Route path="/backoffice/units" element={<BO module="units"><UnitsPage /></BO>} />
            <Route path="/backoffice/clients" element={<BO module="clients"><ClientsPage /></BO>} />
            <Route path="/backoffice/workers" element={<BO module="workers"><WorkersPage /></BO>} />
            <Route path="/backoffice/materials" element={<BO module="materials"><MaterialsPage /></BO>} />
            <Route path="/backoffice/fittings" element={<BO module="fittings"><FittingsPage /></BO>} />
            <Route path="/backoffice/operations" element={<BO module="operations"><OperationsPage /></BO>} />
            <Route path="/backoffice/semi-products" element={<BO module="semi_products"><SemiProductsPage /></BO>} />
            <Route path="/backoffice/finished-products" element={<BO module="finished_products"><FinishedProductsPage /></BO>} />
            <Route path="/backoffice/stock" element={<BO module="stock"><StockPage /></BO>} />
            <Route path="/backoffice/orders" element={<BO module="orders"><OrdersPage /></BO>} />
            <Route path="/backoffice/production" element={<BO module="production"><ProductionPage /></BO>} />
            <Route path="/backoffice/reports/stock-on-date" element={<BO module="stock"><StockOnDateReport /></BO>} />
            <Route path="/backoffice/reports/overconsumption" element={<BO module="reports"><OverconsumptionReport /></BO>} />
            <Route path="/backoffice/reports/cost" element={<BO module="reports"><CostReport /></BO>} />
            <Route path="/backoffice/settings/period" element={<BO><PeriodSettingsPage /></BO>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;