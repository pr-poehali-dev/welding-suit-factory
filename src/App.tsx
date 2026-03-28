
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
import BackofficeLayout from "./components/backoffice/BackofficeLayout";
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

const queryClient = new QueryClient();

const BO = ({ children }: { children: React.ReactNode }) => (
  <BackofficeLayout>{children}</BackofficeLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminLayout><Admin /></AdminLayout>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/admin/promo" element={<AdminLayout><AdminPromo /></AdminLayout>} />
          <Route path="/admin/seo" element={<AdminLayout><AdminSeo /></AdminLayout>} />
          <Route path="/admin/payments" element={<AdminLayout><AdminPayments /></AdminLayout>} />
          <Route path="/manager" element={<Manager />} />
          <Route path="/backoffice" element={<BO><Dashboard /></BO>} />
          <Route path="/backoffice/units" element={<BO><UnitsPage /></BO>} />
          <Route path="/backoffice/clients" element={<BO><ClientsPage /></BO>} />
          <Route path="/backoffice/workers" element={<BO><WorkersPage /></BO>} />
          <Route path="/backoffice/materials" element={<BO><MaterialsPage /></BO>} />
          <Route path="/backoffice/fittings" element={<BO><FittingsPage /></BO>} />
          <Route path="/backoffice/operations" element={<BO><OperationsPage /></BO>} />
          <Route path="/backoffice/semi-products" element={<BO><SemiProductsPage /></BO>} />
          <Route path="/backoffice/finished-products" element={<BO><FinishedProductsPage /></BO>} />
          <Route path="/backoffice/stock" element={<BO><StockPage /></BO>} />
          <Route path="/backoffice/orders" element={<BO><OrdersPage /></BO>} />
          <Route path="/backoffice/production" element={<BO><ProductionPage /></BO>} />
          <Route path="/backoffice/reports/overconsumption" element={<BO><OverconsumptionReport /></BO>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;