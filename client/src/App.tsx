import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, lazy, Suspense } from "react";
import { useAutoTheme } from "@/hooks/use-auto-theme";

import ReconnectBanner from "@/components/ReconnectBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import PWAInstallBanner from "@/components/PWAInstallBanner";

const Home = lazy(() => import("@/pages/Home"));
const Analyze = lazy(() => import("@/pages/Analyze"));
const Profile = lazy(() => import("@/pages/Profile"));
const Shop = lazy(() => import("@/pages/Shop"));
const Admin = lazy(() => import("@/pages/Admin"));
const Challenge = lazy(() => import("@/pages/Challenge"));
const Chat = lazy(() => import("@/pages/Chat"));
const ScanProduct = lazy(() => import("@/pages/ScanProduct"));
const ProductScanCamera = lazy(() => import("@/pages/ProductScanCamera"));
const NutrimentScan = lazy(() => import("@/pages/NutrimentScan"));
const Routine = lazy(() => import("@/pages/Routine"));
const Conseils = lazy(() => import("@/pages/Conseils"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const Premium = lazy(() => import("@/pages/Premium"));
const Pro = lazy(() => import("@/pages/Pro"));
const ProInscription = lazy(() => import("@/pages/pro/ProInscription"));
const ProConnexion = lazy(() => import("@/pages/pro/ProConnexion"));
const ProDashboard = lazy(() => import("@/pages/pro/ProDashboard"));
const ProPatients = lazy(() => import("@/pages/pro/ProPatients"));
const ProPatient = lazy(() => import("@/pages/pro/ProPatient"));
const ProAnalyze = lazy(() => import("@/pages/pro/ProAnalyze"));
const ProStats = lazy(() => import("@/pages/pro/ProStats"));
const ProCabinet = lazy(() => import("@/pages/pro/ProCabinet"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const DermatoPortal = lazy(() => import("@/pages/DermatoPortal"));
const DermLanding = lazy(() => import("@/pages/DermLanding"));
const NotFound = lazy(() => import("@/pages/not-found"));

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
    <Suspense fallback={<div style={{ background: "#0d0a0e", minHeight: "100vh" }} />}>
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
      <Route path="/derm" component={DermLanding} />
      <Route path="/derm/register" component={ProInscription} />
      <Route path="/challenge/:token" component={Challenge} />
      <Route path="/ref/:code" component={RefRedirect} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
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
