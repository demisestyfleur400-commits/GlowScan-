import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, lazy, Suspense } from "react";
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

import ErrorBoundary from "@/components/ErrorBoundary";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { TabBar } from "@/components/b2c/TabBar";

// Rechargement automatique si un fichier du site a changé après un déploiement.
import { lazyWithRetry, installChunkReloadHandler } from "@/lib/chunkReload";
installChunkReloadHandler();

// Écran de transition pendant le chargement d'une page : aux couleurs de la page
// visée (plus d'écran noir). Espace médical : barre latérale et fond clair.
// Appli patient (B2C) : toutes ses pages prennent la nouvelle palette (blanc
// cassé, vert profond, sauge), sauf la landing vue par un visiteur non connecté.
const B2C_PAGES = ["/", "/analyze", "/ma-peau", "/profile", "/shop", "/routine", "/consultations", "/chat", "/premium",
  "/product-scan-camera", "/dermatologues", "/commande", "/auth", "/magic", "/consultation/confirmee", "/confidentialite", "/rejoindre"];
const isB2CPage = (p: string) => B2C_PAGES.includes(p) || p.startsWith("/dr/");
const hadAccount = () => { try { return !!localStorage.getItem("glowscan_had_account"); } catch { return false; } };
const isVisitorLanding = (p: string, loggedIn?: boolean) => p === "/" && !(loggedIn ?? hadAccount());

function RouteFallback() {
  const p = typeof window !== "undefined" ? window.location.pathname : "/";
  const dermPublic = /^\/derm(\/(connexion|inscription|mot-de-passe-oublie|conditions|demo|magic|register))?\/?$/.test(p);
  if (p.startsWith("/derm") && !dermPublic) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f3f6f3" }}>
        <div className="hidden md:block" style={{ width: 250, flex: "none", background: "#0d2929" }} />
        <div style={{ flex: 1 }}><div style={{ height: 72, background: "rgba(255,255,255,.82)", borderBottom: "1px solid #e2e8e4" }} /></div>
      </div>
    );
  }
  return <div style={{ minHeight: "100vh", background: p.startsWith("/derm") ? "#ffffff" : isVisitorLanding(p) ? "#f5ead8" : "#f8f8f6" }} />;
}

const Home = lazyWithRetry(() => import("@/pages/Home"));
const Analyze = lazyWithRetry(() => import("@/pages/Analyze"));
const Profile = lazyWithRetry(() => import("@/pages/Profile"));
const Shop = lazyWithRetry(() => import("@/pages/Shop"));
const Admin = lazyWithRetry(() => import("@/pages/Admin"));
const Challenge = lazyWithRetry(() => import("@/pages/Challenge"));
const Chat = lazyWithRetry(() => import("@/pages/Chat"));
const MaPeau = lazyWithRetry(() => import("@/pages/MaPeau"));
const Commande = lazyWithRetry(() => import("@/pages/Commande"));
const ProductScanCamera = lazyWithRetry(() => import("@/pages/ProductScanCamera"));
const Routine = lazyWithRetry(() => import("@/pages/Routine"));
const AuthPage = lazyWithRetry(() => import("@/pages/AuthPage"));
const MagicLink = lazyWithRetry(() => import("@/pages/MagicLink"));
const Premium = lazyWithRetry(() => import("@/pages/Premium"));
const Pro = lazyWithRetry(() => import("@/pages/Pro"));
const ProInscription = lazyWithRetry(() => import("@/pages/pro/ProInscription"));
const ProConnexion = lazyWithRetry(() => import("@/pages/pro/ProConnexion"));
const ProMotDePasseOublie = lazyWithRetry(() => import("@/pages/pro/ProMotDePasseOublie"));
const DermVue = lazyWithRetry(() => import("@/pages/derm/DermVue"));
const DermPatients = lazyWithRetry(() => import("@/pages/derm/DermPatients"));
const DermPatientFiche = lazyWithRetry(() => import("@/pages/derm/DermPatientFiche"));
const DermDossiers = lazyWithRetry(() => import("@/pages/derm/DermDossiers"));
const DermDossier = lazyWithRetry(() => import("@/pages/derm/DermDossier"));
const DermCompteRendu = lazyWithRetry(() => import("@/pages/derm/DermCompteRendu"));
const DermAgenda = lazyWithRetry(() => import("@/pages/derm/DermAgenda"));
const DermMessagerie = lazyWithRetry(() => import("@/pages/derm/DermMessagerie"));
const DermActivite = lazyWithRetry(() => import("@/pages/derm/DermActivite"));
const DermAuto = lazyWithRetry(() => import("@/pages/derm/DermAuto"));
const DermParametres = lazyWithRetry(() => import("@/pages/derm/DermParametres"));
const AvisPatient = lazyWithRetry(() => import("@/pages/AvisPatient"));
const DermSuivis = lazyWithRetry(() => import("@/pages/derm/DermSuivis"));
const DermSuivi = lazyWithRetry(() => import("@/pages/derm/DermSuivi"));
const ProPatients = lazyWithRetry(() => import("@/pages/pro/ProPatients"));
const ProPatient = lazyWithRetry(() => import("@/pages/pro/ProPatient"));
const ProAnalyze = lazyWithRetry(() => import("@/pages/pro/ProAnalyze"));
const ProStats = lazyWithRetry(() => import("@/pages/pro/ProStats"));
const ProPayments = lazyWithRetry(() => import("@/pages/pro/ProPayments"));
const ProCabinet = lazyWithRetry(() => import("@/pages/pro/ProCabinet"));
const ProPublicProfile = lazyWithRetry(() => import("@/pages/pro/ProPublicProfile"));
const ProConfreres = lazyWithRetry(() => import("@/pages/pro/ProConfreres"));
const Verif = lazyWithRetry(() => import("@/pages/Verif"));
const HospitalRef = lazyWithRetry(() => import("@/pages/HospitalRef"));
const Developpeurs = lazyWithRetry(() => import("@/pages/Developpeurs"));
const ProMagicLink = lazyWithRetry(() => import("@/pages/pro/ProMagicLink"));
const DermOnboarding = lazyWithRetry(() => import("@/pages/pro/DermOnboarding"));
const DermConditions = lazyWithRetry(() => import("@/pages/pro/DermConditions"));
const MesConsultations = lazyWithRetry(() => import("@/pages/MesConsultations"));
const ConsultationConfirmee = lazyWithRetry(() => import("@/pages/ConsultationConfirmee"));
const DermPublicProfile = lazyWithRetry(() => import("@/pages/DermPublicProfile"));
const DermPublicList = lazyWithRetry(() => import("@/pages/DermPublicList"));
const ProConsultations = lazyWithRetry(() => import("@/pages/pro/ProConsultations"));
const ProAgenda = lazyWithRetry(() => import("@/pages/pro/ProAgenda"));
const ProPilotage = lazyWithRetry(() => import("@/pages/pro/ProPilotage"));
const ProPaiements = lazyWithRetry(() => import("@/pages/pro/ProPaiements"));
const ProAccueil = lazyWithRetry(() => import("@/pages/pro/ProAccueil"));
const RelayHome = lazyWithRetry(() => import("@/pages/relay/RelayHome"));
const Rejoindre = lazyWithRetry(() => import("@/pages/relay/Rejoindre"));
const ProReseau = lazyWithRetry(() => import("@/pages/pro/ProReseau"));
const Privacy = lazyWithRetry(() => import("@/pages/Privacy"));
const DermatoPortal = lazyWithRetry(() => import("@/pages/DermatoPortal"));
const DermLanding = lazyWithRetry(() => import("@/pages/DermLanding"));
const NotFound = lazyWithRetry(() => import("@/pages/not-found"));

function RefRedirect() {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const code = path.split("/ref/")[1];
  // Étape 14b : fiche de référence vers l'hôpital (REF-XXXX), page publique.
  if (code && /^REF-[A-Z0-9]+$/i.test(decodeURIComponent(code))) return <HospitalRef code={decodeURIComponent(code).toUpperCase()} />;
  if (code) {
    try { localStorage.setItem("glowscan_referral", code); } catch {}
  }
  window.location.replace("/analyze");
  return null;
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/profile" component={Profile} />
      <Route path="/shop" component={Shop} />
      <Route path="/admin" component={Admin} />
      <Route path="/chat" component={Chat} />
      <Route path="/ma-peau" component={MaPeau} />
      <Route path="/commande" component={Commande} />
      {/* Scan produit fusionné dans le Scanner (onglet « Un produit ») */}
      <Route path="/scan-product">{() => { window.location.replace("/analyze"); return null; }}</Route>
      <Route path="/product-scan-camera" component={ProductScanCamera} />
      <Route path="/routine" component={Routine} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/magic" component={MagicLink} />
      <Route path="/premium" component={Premium} />
      <Route path="/consultations" component={MesConsultations} />
      <Route path="/consultation/confirmee" component={ConsultationConfirmee} />
      <Route path="/dermatologues" component={DermPublicList} />
      <Route path="/dr/:slug" component={DermPublicProfile} />
      {/* GlowScan DERM routes (formerly /pro) */}
      <Route path="/derm" component={DermLanding} />
      <Route path="/derm/inscription" component={ProInscription} />
      <Route path="/derm/onboarding" component={DermOnboarding} />
      <Route path="/derm/conditions" component={DermConditions} />
      <Route path="/derm/connexion" component={ProConnexion} />
      <Route path="/derm/mot-de-passe-oublie" component={ProMotDePasseOublie} />
      <Route path="/derm/dashboard" component={DermVue} />
      <Route path="/derm/patients" component={DermPatients} />
      <Route path="/derm/patients/:id" component={DermPatientFiche} />
      <Route path="/derm/patientele" component={ProPatients} />
      <Route path="/derm/dossiers" component={DermDossiers} />
      <Route path="/derm/dossiers/:id" component={DermDossier} />
      <Route path="/derm/dossiers/:id/compte-rendu" component={DermCompteRendu} />
      <Route path="/derm/patient/:id" component={ProPatient} />
      <Route path="/derm/analyse" component={ProAnalyze} />
      <Route path="/derm/consultation" component={ProAnalyze} />
      <Route path="/derm/statistiques" component={DermActivite} />
      <Route path="/derm/activite" component={DermActivite} />
      <Route path="/derm/auto-evaluation" component={DermAuto} />
      <Route path="/avis/:token" component={AvisPatient} />
      <Route path="/derm/paiements" component={ProPaiements} />
      <Route path="/derm/portefeuille" component={ProPayments} />
      <Route path="/derm/cabinet" component={DermParametres} />
      <Route path="/derm/cabinet-avance" component={ProCabinet} />
      <Route path="/derm/profil-public" component={ProPublicProfile} />
      <Route path="/derm/consultations" component={DermMessagerie} />
      <Route path="/derm/agenda" component={DermAgenda} />
      <Route path="/derm/suivis" component={DermSuivis} />
      <Route path="/derm/suivis/:id" component={DermSuivi} />
      <Route path="/derm/accueil" component={ProAccueil} />
      <Route path="/derm/confreres" component={ProConfreres} />
      {/* Ancienne étape « profil 2/2 » sans lien : le profil se règle dans Paramètres. */}
      <Route path="/derm/profil">{() => { window.location.replace("/derm/cabinet"); return null; }}</Route>
      <Route path="/derm/magic" component={ProMagicLink} />
      <Route path="/derm/relais" component={RelayHome} />
      <Route path="/derm/reseau" component={ProReseau} />
      <Route path="/derm/pilotage" component={ProPilotage} />

      {/* Redirects from old /pro paths to new /derm paths */}
      <Route path="/pro" component={() => { window.location.href = "/derm"; return null; }} />
      <Route path="/pro/*" component={() => {
        const newPath = window.location.pathname.replace("/pro", "/derm");
        window.location.href = newPath;
        return null;
      }} />
      <Route path="/confidentialite" component={Privacy} />
      <Route path="/dermato" component={DermatoPortal} />
      {/* Démo interactive retirée (landing et connexion) : renvoie vers la présentation. */}
      <Route path="/derm/demo">{() => { window.location.replace("/derm"); return null; }}</Route>
      <Route path="/derm/register" component={ProInscription} />
      <Route path="/challenge/:token" component={Challenge} />
      <Route path="/ref/:code" component={RefRedirect} />
      <Route path="/rejoindre" component={Rejoindre} />
      <Route path="/developpeurs" component={Developpeurs} />
      <Route path="/verif" component={Verif} />
      <Route path="/verif/:ref" component={Verif} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

// Fond de la page derrière l'appli (visible en bas des pages courtes et en fin de
// défilement) : aux couleurs de l'espace visité, plus de beige de l'ancien thème.
// Pages B2C : blanc cassé + palette de la nouvelle maquette (classe .b2c-theme
// posée sur <html>, donc héritée par toute la page, fenêtres et bandeaux compris).
function BodyBackground() {
  const [loc] = useLocation();
  const { user, isLoading } = useAuth();
  useEffect(() => {
    const b2c = isB2CPage(loc) && !isVisitorLanding(loc, isLoading ? undefined : !!user);
    const bg = loc === "/derm" ? "#ffffff"
      : loc.startsWith("/derm") ? "#f3f6f3"
      : b2c ? "#f8f8f6"
      : "";
    document.documentElement.classList.toggle("b2c-theme", b2c);
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg || "#f5ead8");
  }, [loc, user, isLoading]);
  return null;
}

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BodyBackground />
          <Router />
          <TabBar />
          <PWAInstallBanner />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
