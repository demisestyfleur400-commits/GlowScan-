import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAutoTheme } from "@/hooks/use-auto-theme";

import Home from "@/pages/Home";
import Analyze from "@/pages/Analyze";
import Profile from "@/pages/Profile";
import Shop from "@/pages/Shop";
import Admin from "@/pages/Admin";
import Challenge from "@/pages/Challenge";
import Chat from "@/pages/Chat";
import ScanProduct from "@/pages/ScanProduct";
import ProductScanCamera from "@/pages/ProductScanCamera";
import NutrimentScan from "@/pages/NutrimentScan";
import Routine from "@/pages/Routine";
import Conseils from "@/pages/Conseils";
import AuthPage from "@/pages/AuthPage";
import Premium from "@/pages/Premium";
import Pro from "@/pages/Pro";
import ProInscription from "@/pages/pro/ProInscription";
import ProConnexion from "@/pages/pro/ProConnexion";
import ProDashboard from "@/pages/pro/ProDashboard";
import ProPatients from "@/pages/pro/ProPatients";
import ProPatient from "@/pages/pro/ProPatient";
import ProAnalyze from "@/pages/pro/ProAnalyze";
import ProStats from "@/pages/pro/ProStats";
import ProCabinet from "@/pages/pro/ProCabinet";
import Privacy from "@/pages/Privacy";
import DermatoPortal from "@/pages/DermatoPortal";
import NotFound from "@/pages/not-found";
import ReconnectBanner from "@/components/ReconnectBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import PWAInstallBanner from "@/components/PWAInstallBanner";

function RefRedirect() {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const code = path.split("/ref/")[1];
  if (code) {
    try { localStorage.setItem("glowscan_referral", code); } catch {}
  }
  window.location.replace("/analyze");
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/profile" component={Profile} />
      <Route path="/shop" component={Shop} />
      <Route path="/admin" component={Admin} />
      <Route path="/chat" component={Chat} />
      <Route path="/scan-product" component={ScanProduct} />
      <Route path="/product-scan-camera" component={ProductScanCamera} />
      <Route path="/nutriment-scan" component={NutrimentScan} />
      <Route path="/routine" component={Routine} />
      <Route path="/conseils" component={Conseils} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/premium" component={Premium} />
      <Route path="/pro" component={Pro} />
      <Route path="/pro/inscription" component={ProInscription} />
      <Route path="/pro/connexion" component={ProConnexion} />
      <Route path="/pro/dashboard" component={ProDashboard} />
      <Route path="/pro/patients" component={ProPatients} />
      <Route path="/pro/patient/:id" component={ProPatient} />
      <Route path="/pro/analyse" component={ProAnalyze} />
      <Route path="/pro/statistiques" component={ProStats} />
      <Route path="/pro/cabinet" component={ProCabinet} />
      <Route path="/confidentialite" component={Privacy} />
      <Route path="/dermato" component={DermatoPortal} />
      <Route path="/challenge/:token" component={Challenge} />
      <Route path="/ref/:code" component={RefRedirect} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useAutoTheme();
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ReconnectBanner />
          <Router />
          <PWAInstallBanner />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
