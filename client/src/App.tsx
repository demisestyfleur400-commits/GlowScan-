import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, lazy, Suspense } from "react";
import { useAutoTheme } from "@/hooks/use-auto-theme";
import * as Sentry from "@sentry/react";

// 🔴 SENTRY INITIALIZATION — Error monitoring & alerting
if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    environment: "production",
    tracesSampleRate: 0.1, // 10% of transactions sampled
    release: "glowscan-1.0.0",
  });
}

import ReconnectBanner from "@/components/ReconnectBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import PWAInstallBanner from "@/components/PWAInstallBanner";

// Recharge la page UNE fois si un chunk lazy échoue à se charger. Après un
// déploiement, les anciens fichiers hashés (ex. ProAnalyze-XXXX.js) sont supprimés ;
// un onglet resté ouvert essaie de charger l'ancien nom → "Failed to fetch
// dynamically imported module". On recharge → le navigateur récupère les nouveaux
// fichiers. Un flag sessionStorage évite toute boucle de rechargement.
function lazyWithRetry(factory: () => Promise<any>) {
  return lazy(() =>
    factory()
      .then((m: any) => { try { sessionStorage.removeItem("gs_chunk_reload"); } catch {} return m; })
      .catch((err: any) => {
        try {
          if (!sessionStorage.getItem("gs_chunk_reload")) {
            sessionStorage.setItem("gs_chunk_reload", "1");
            window.location.reload();
            return new Promise(() => {}) as Promise<any>; // ne résout jamais : la page recharge
          }
        } catch {}
        throw err;
      })
  );
}

const Home = lazyWithRetry(() => import("@/pages/Home"));
const Analyze = lazyWithRetry(() => import("@/pages/Analyze"));
const Profile = lazyWithRetry(() => import("@/pages/Profile"));
const Shop = lazyWithRetry(() => import("@/pages/Shop"));
const Admin = lazyWithRetry(() => import("@/pages/Admin"));
const Challenge = lazyWithRetry(() => import("@/pages/Challenge"));
const Chat = lazyWithRetry(() => import("@/pages/Chat"));
const ScanProduct = lazyWithRetry(() => import("@/pages/ScanProduct"));
const ProductScanCamera = lazyWithRetry(() => import("@/pages/ProductScanCamera"));
const NutrimentScan = lazyWithRetry(() => import("@/pages/NutrimentScan"));
const Routine = lazyWithRetry(() => import("@/pages/Routine"));
const Conseils = lazyWithRetry(() => import("@/pages/Conseils"));
const AuthPage = lazyWithRetry(() => import("@/pages/AuthPage"));
const Premium = lazyWithRetry(() => import("@/pages/Premium"));
const Pro = lazyWithRetry(() => import("@/pages/Pro"));
const ProInscription = lazyWithRetry(() => import("@/pages/pro/ProInscription"));
const ProConnexion = lazyWithRetry(() => import("@/pages/pro/ProConnexion"));
const ProMotDePasseOublie = lazyWithRetry(() => import("@/pages/pro/ProMotDePasseOublie"));
const ProDashboard = lazyWithRetry(() => import("@/pages/pro/ProDashboard"));
const ProPatients = lazyWithRetry(() => import("@/pages/pro/ProPatients"));
const ProPatient = lazyWithRetry(() => import("@/pages/pro/ProPatient"));
const ProAnalyze = lazyWithRetry(() => import("@/pages/pro/ProAnalyze"));
const ProStats = lazyWithRetry(() => import("@/pages/pro/ProStats"));
const ProCabinet = lazyWithRetry(() => import("@/pages/pro/ProCabinet"));
const DermOnboarding = lazyWithRetry(() => import("@/pages/pro/DermOnboarding"));
const DermConditions = lazyWithRetry(() => import("@/pages/pro/DermConditions"));
const MesConsultations = lazyWithRetry(() => import("@/pages/MesConsultations"));
const ProConsultations = lazyWithRetry(() => import("@/pages/pro/ProConsultations"));
const Privacy = lazyWithRetry(() => import("@/pages/Privacy"));
const DermatoPortal = lazyWithRetry(() => import("@/pages/DermatoPortal"));
const DermLanding = lazyWithRetry(() => import("@/pages/DermLanding"));
const DermDemo = lazyWithRetry(() => import("@/pages/DermDemo"));
const NotFound = lazyWithRetry(() => import("@/pages/not-found"));

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
      <Route path="/consultations" component={MesConsultations} />
      {/* GlowScan DERM routes (formerly /pro) */}
      <Route path="/derm" component={DermLanding} />
      <Route path="/derm/inscription" component={ProInscription} />
      <Route path="/derm/onboarding" component={DermOnboarding} />
      <Route path="/derm/conditions" component={DermConditions} />
      <Route path="/derm/connexion" component={ProConnexion} />
      <Route path="/derm/mot-de-passe-oublie" component={ProMotDePasseOublie} />
      <Route path="/derm/dashboard" component={ProDashboard} />
      <Route path="/derm/patients" component={ProPatients} />
      <Route path="/derm/patient/:id" component={ProPatient} />
      <Route path="/derm/analyse" component={ProAnalyze} />
      <Route path="/derm/statistiques" component={ProStats} />
      <Route path="/derm/cabinet" component={ProCabinet} />
      <Route path="/derm/consultations" component={ProConsultations} />

      {/* Redirects from old /pro paths to new /derm paths */}
      <Route path="/pro" component={() => { window.location.href = "/derm"; return null; }} />
      <Route path="/pro/*" component={() => {
        const newPath = window.location.pathname.replace("/pro", "/derm");
        window.location.href = newPath;
        return null;
      }} />
      <Route path="/confidentialite" component={Privacy} />
      <Route path="/dermato" component={DermatoPortal} />
      <Route path="/derm/demo" component={DermDemo} />
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
