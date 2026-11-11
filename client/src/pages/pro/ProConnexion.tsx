import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useProAccount } from "@/hooks/use-pro";
import { proHomeOf, type ProProfile } from "@shared/proProfile";
import { D, FONT_UI, FONT_HEAD, ensureDermFonts } from "@/components/derm/tokens";

// ════════════════════════════════════════════════════════════════════════
// Connexion / création de compte GlowScan Derm (maquettes « Connectez-vous »
// et « Rejoignez GlowScan »). Une page, deux modes (/derm/connexion et
// /derm/inscription). Sécurités inchangées : vérification en 2 étapes par
// email (codes de secours acceptés), lien de connexion par email, mot de passe
// oublié, connexion par téléphone des relais, conditions d'utilisation
// obligatoires à l'inscription. Pas d'identifiants publics de démonstration :
// la démo interactive (/derm/demo) se visite sans compte.
// ════════════════════════════════════════════════════════════════════════

// Doit rester synchronisé avec DERM_TERMS_VERSION dans DermConditions.tsx
const DERM_TERMS_VERSION = "v1-2026-07";
type Mode = "signin" | "signup";

const maskHint = (email: string) => (email.includes("@") ? email.replace(/^(.).*(@.*)$/, "$1•••$2") : "votre email");
async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, { method: "POST", credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Une erreur est survenue. Réessayez.");
  return data;
}

const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px", border: `1px solid #e3e7e4`, borderRadius: 6, background: "#fff", fontSize: 12.5, color: D.textAlt, outline: "none", fontFamily: FONT_UI };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 9.5, fontWeight: 600, color: D.textAlt };
const cta: React.CSSProperties = { width: "100%", height: 40, border: 0, borderRadius: 6, background: D.cta, color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 7px 16px rgba(29,112,105,.18)", fontFamily: FONT_UI };
const linkBtn: React.CSSProperties = { border: 0, background: "none", padding: 0, color: D.cta, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT_UI };

function Side({ mode }: { mode: Mode }) {
  const t = mode === "signup"
    ? { k: "COMMENCER AVEC GLOWSCAN", h: <>Votre cabinet.<br />Enfin unifié.</>, p: "Créez votre espace professionnel et découvrez une pratique plus fluide dès aujourd'hui." }
    : { k: "ESPACE PROFESSIONNEL", h: <>La dermatologie,<br />augmentée avec justesse.</>, p: "Retrouvez vos patients, vos suivis et votre assistant clinique dans un espace sécurisé." };
  return (
    <aside className="relative hidden flex-col overflow-hidden md:flex" style={{ flex: "1 1 50%", minHeight: "100vh", padding: "36px 60px", color: "#fff", background: "radial-gradient(circle at 35% 70%,rgba(26,140,132,.25),transparent 45%),linear-gradient(160deg,#0d2929,#103231 60%,#0f3a38)" }}>
      <span className="pointer-events-none absolute" style={{ right: -140, bottom: -180, width: 520, height: 520, borderRadius: "50%", border: "70px solid rgba(255,255,255,.035)" }} />
      <span className="pointer-events-none absolute" style={{ right: -40, bottom: -80, width: 300, height: 300, borderRadius: "50%", border: "50px solid rgba(255,255,255,.03)" }} />
      <Link href="/derm" className="flex items-center no-underline" style={{ gap: 8 }}>
        <img src="/img/glowscan-africa-dark.png" alt="GlowScan Africa" style={{ width: 150, height: "auto" }} />
        <span style={{ color: D.teal4, letterSpacing: 1.4, border: "1px solid rgba(46,209,196,.35)", borderRadius: 5, padding: "4px 6px", fontSize: 7, fontWeight: 800 }}>DERM</span>
      </Link>
      <div className="relative z-[1]" style={{ margin: "auto 0" }}>
        <span style={{ color: D.teal4, letterSpacing: 1.5, fontSize: 8, fontWeight: 700 }}>{t.k}</span>
        <h1 style={{ margin: "18px 0 18px", font: `700 clamp(36px,4.2vw,50px)/1.05 ${FONT_HEAD}`, letterSpacing: -1.6 }}>{t.h}</h1>
        <p style={{ margin: 0, maxWidth: 330, color: "#a9bfba", fontSize: 11, lineHeight: 1.6 }}>{t.p}</p>
      </div>
      {mode === "signin" && (
        <div className="relative z-[1] flex items-center" style={{ gap: 12, padding: "12px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>
          <span className="grid place-items-center" style={{ width: 34, height: 34, borderRadius: 6, background: D.teal3, color: D.side, fontSize: 9, fontWeight: 800 }}>Glow</span>
          <span style={{ fontSize: 9.5, color: "#c7d6d2" }}>Votre copilote clinique prépare déjà votre journée.</span>
        </div>
      )}
    </aside>
  );
}

export default function ProConnexion({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: accData } = useProAccount();
  useEffect(() => { ensureDermFonts(); }, []);

  const [step, setStep] = useState<"login" | "2fa">("login");
  const [mode, setModeState] = useState<Mode>(initialMode);
  const [profile, setProfile] = useState<ProProfile>("derm");
  const [otherProfile, setOtherProfile] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [cabinet, setCabinet] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [resent, setResent] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);
  const signup = mode === "signup";

  // Déjà connecté : on renvoie vers la page de son rôle.
  useEffect(() => {
    if (step !== "login") return;
    if (accData?.account) setLocation(proHomeOf((accData.account as any).profile, "doctor"));
    else if (accData?.user?.role === "secretary") setLocation(proHomeOf(null, "secretary"));
  }, [accData, step, setLocation]);

  const setMode = (m: Mode) => { setModeState(m); setError(""); window.history.replaceState(null, "", (m === "signup" ? "/derm/inscription" : "/derm/connexion") + window.location.search); };
  const goHome = async (data: any) => {
    await qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
    await qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    try { sessionStorage.removeItem("derm_autoresumed"); } catch {}
    setLocation(proHomeOf(data?.account?.profile, data?.role));
  };
  const start2fa = (data: any) => {
    setEmailHint(data.emailHint || maskHint(email));
    setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
    setCodesSaved(false); setCode(""); setResent(false); setStep("2fa");
    if (data.devFallback) toast({ title: "Mode développement", description: "Le code est dans les journaux du serveur." });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Relais : inscription par téléphone sur /rejoindre (écran R1).
    if (signup && profile === "relay") { setLocation("/rejoindre"); return; }
    if (!email.includes("@") && (signup || email.replace(/\D/g, "").length < 9)) return setError(signup ? "Entrez un email valide." : "Entrez votre email ou, pour un relais, votre téléphone.");
    if (pw.length < (signup ? 8 : 1)) return setError(signup ? "Mot de passe trop court : 8 caractères minimum." : "Entrez votre mot de passe.");
    if (signup && (!first.trim() || !last.trim())) return setError("Entrez votre prénom et votre nom.");
    if (signup && !consent) return setError("Acceptez les conditions d'utilisation pour continuer.");
    setBusy(true); setError("");
    try {
      const data = signup
        ? await postJson("/api/pro/register", {
            fullName: `${first.trim()} ${last.trim()}`, cabinetName: cabinet.trim() || null,
            email: email.trim().toLowerCase(), password: pw, profile, consent: true, consentVersion: DERM_TERMS_VERSION,
            ref: new URLSearchParams(window.location.search).get("ref") || undefined, // parrainage confrère
          })
        : await postJson("/api/pro/login", { email: email.trim(), password: pw });
      if (data.requires2fa) start2fa(data); else await goHome(data);
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await goHome(await postJson("/api/pro/login/2fa", { code })); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    try { const data = await postJson("/api/pro/login/2fa/resend"); if (data.emailHint) setEmailHint(data.emailHint); setResent(true); }
    catch (err: any) { setError(err.message); }
  };
  const magic = async () => {
    if (!email.includes("@")) return setError("Entrez votre email d'abord.");
    setError("");
    try { await postJson("/api/pro/login/magic/request", { email: email.trim() }); setMagicSent(true); }
    catch (err: any) { setError(err.message); }
  };
  const verifyOff = busy || code.replace(/\s/g, "").length < 6 || (backupCodes.length > 0 && !codesSaved);
  const err = error ? <div role="alert" style={{ padding: "9px 12px", borderRadius: 6, background: D.errBg, color: D.err, fontSize: 11 }}>{error}</div> : null;

  return (
    <main className="flex" style={{ minHeight: "100vh", background: "#f4f5f1", fontFamily: FONT_UI, color: D.textAlt }}>
      <Side mode={mode} />
      <section className="flex flex-1 items-center justify-center" style={{ flexBasis: "50%", padding: "40px 20px" }}>
        <div className="w-full" style={{ maxWidth: 330 }}>
          <Link href="/derm" className="mb-8 flex items-center no-underline md:hidden" style={{ gap: 8, color: D.textAlt, fontWeight: 700 }}>GlowScan <span style={{ fontSize: 8, color: D.cta }}>DERM</span></Link>
          {step === "login" ? (
            <form onSubmit={submit} noValidate className="flex flex-col" style={{ gap: 14 }}>
              <div>
                <span style={{ color: D.teal2, letterSpacing: 1.6, fontSize: 7.5, fontWeight: 800 }}>{signup ? "CRÉATION DE COMPTE" : "BON RETOUR"}</span>
                <h1 style={{ margin: "10px 0 8px", font: `600 26px/1.15 ${FONT_UI}`, letterSpacing: -.6, color: D.textAlt }}>{signup ? "Rejoignez GlowScan" : "Connectez-vous"}</h1>
                <p style={{ margin: 0, fontSize: 10, color: D.muted }}>{signup ? "Quelques informations pour préparer votre espace." : "Accédez à votre cabinet numérique GlowScan Derm."}</p>
              </div>

              {!signup && (
                <Link href="/derm/demo" className="flex items-center justify-between no-underline" data-testid="link-demo"
                  style={{ gap: 10, padding: "11px 12px", borderRadius: 6, border: "1px solid #cfe7df", background: "#e9f4f0", color: D.textAlt }}>
                  <span className="flex flex-col" style={{ gap: 3 }}><span style={{ color: D.cta, letterSpacing: 1, fontSize: 7, fontWeight: 800 }}>DÉCOUVRIR SANS COMPTE</span><span style={{ fontSize: 10 }}>Essayer la démonstration interactive</span></span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: D.cta }}>→</span>
                </Link>
              )}

              {signup && (
                <>
                  <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label style={lbl}>Prénom<input style={field} value={first} onChange={(e) => { setFirst(e.target.value); setError(""); }} autoComplete="given-name" data-testid="input-first" /></label>
                    <label style={lbl}>Nom<input style={field} value={last} onChange={(e) => { setLast(e.target.value); setError(""); }} autoComplete="family-name" data-testid="input-last" /></label>
                  </div>
                  <label style={lbl}>Cabinet ou structure<input style={field} value={cabinet} onChange={(e) => setCabinet(e.target.value)} autoComplete="organization" data-testid="input-cabinet" /></label>
                </>
              )}
              <label style={lbl}>{signup ? "Email professionnel" : "Email professionnel (ou téléphone pour les relais)"}
                <input style={field} type={signup ? "email" : "text"} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="docteur@cabinet.com" autoComplete={signup ? "email" : "username"} data-testid="input-email" />
              </label>
              <label style={lbl}>Mot de passe
                <span className="relative">
                  <input style={{ ...field, paddingRight: 70 }} type={showPw ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }}
                    placeholder={signup ? "8 caractères minimum" : ""} autoComplete={signup ? "new-password" : "current-password"} data-testid="input-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ ...linkBtn, position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} data-testid="button-toggle-password">{showPw ? "Masquer" : "Afficher"}</button>
                </span>
              </label>
              {!signup && <Link href="/derm/mot-de-passe-oublie" style={{ ...linkBtn, alignSelf: "flex-end", marginTop: -6, textDecoration: "none" }} data-testid="link-forgot-password">Mot de passe oublié ?</Link>}

              {signup && (
                <>
                  <label className="flex cursor-pointer items-start" style={{ gap: 8, fontSize: 10, lineHeight: 1.5, color: D.muted }}>
                    <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(""); }} style={{ marginTop: 2, accentColor: D.cta }} data-testid="checkbox-consent" />
                    <span>J'accepte les <Link href="/derm/conditions" style={{ color: D.cta, fontWeight: 700 }}>conditions d'utilisation</Link> et la politique de confidentialité.</span>
                  </label>
                  {!otherProfile ? (
                    <button type="button" onClick={() => setOtherProfile(true)} style={{ ...linkBtn, alignSelf: "flex-start", fontWeight: 600, color: D.muted }}>Vous êtes relais communautaire ou une ONG ?</button>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 6, padding: 10, borderRadius: 6, background: "#eef2ee", fontSize: 10 }}>
                      <span style={{ color: D.muted }}>Je m'inscris en tant que :</span>
                      <span className="flex flex-wrap" style={{ gap: 6 }}>
                        {([["derm", "Dermatologue"], ["relay", "Relais communautaire"], ["ngo", "ONG / programme"]] as [ProProfile, string][]).map(([k, l]) => (
                          <button key={k} type="button" onClick={() => setProfile(k)} aria-pressed={profile === k} data-testid={`profile-${k}`}
                            style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${profile === k ? D.cta : "#d5ddd9"}`, background: profile === k ? D.cta : "#fff", color: profile === k ? "#fff" : D.textAlt, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: FONT_UI }}>{l}</button>
                        ))}
                      </span>
                      {profile === "relay" && <span style={{ color: D.muted }}>Les relais s'inscrivent avec leur téléphone, leur carte professionnelle et un code SMS : <Link href="/rejoindre" style={{ color: D.cta, fontWeight: 700 }}>continuer avec mon téléphone</Link>.</span>}
                    </div>
                  )}
                </>
              )}

              {err}
              <button type="submit" disabled={busy} style={{ ...cta, opacity: busy ? .6 : 1 }} data-testid="button-submit">{busy ? "Patientez…" : signup ? (profile === "relay" ? "Continuer avec mon téléphone" : "Créer mon espace") : "Accéder à mon espace"}</button>

              {!signup && (
                <button type="button" onClick={magic} style={{ ...cta, background: "#fff", color: D.textAlt, border: "1px solid #e3e7e4", boxShadow: "none", fontWeight: 600 }} data-testid="button-magic-link">
                  {magicSent ? `Lien envoyé à ${maskHint(email)} (valable 15 min)` : "Recevoir un lien de connexion par email"}
                </button>
              )}
              <span className="text-center" style={{ fontSize: 10, color: D.muted }}>
                {signup ? <>Vous avez déjà un compte ? <button type="button" onClick={() => setMode("signin")} style={linkBtn} data-testid="tab-signin">Se connecter</button></>
                  : <>Nouveau sur GlowScan ? <button type="button" onClick={() => setMode("signup")} style={linkBtn} data-testid="tab-signup">Créer un compte</button></>}
              </span>
              <span className="text-center" style={{ fontSize: 8.5, color: D.faint }}>{signup ? "14 jours gratuits · sans carte bancaire · paiement Mobile Money ensuite" : "Données de santé protégées · Vérification en 2 étapes · Session sécurisée"}</span>
            </form>
          ) : (
            <form onSubmit={verify} noValidate className="flex flex-col" style={{ gap: 14 }}>
              <div>
                <span style={{ color: D.teal2, letterSpacing: 1.6, fontSize: 7.5, fontWeight: 800 }}>VÉRIFICATION EN 2 ÉTAPES</span>
                <h1 style={{ margin: "10px 0 8px", font: `600 24px/1.15 ${FONT_UI}`, letterSpacing: -.5 }}>Entrez votre code</h1>
                <p style={{ margin: 0, fontSize: 10.5, color: D.muted }}>Nous avons envoyé un code à 6 chiffres à <b>{emailHint}</b>.</p>
              </div>
              {backupCodes.length > 0 && (
                <div className="flex flex-col" style={{ gap: 8, padding: 12, borderRadius: 8, background: D.warnBg, color: "#7a4a1d" }}>
                  <b style={{ fontSize: 11 }}>Vos codes de secours : notez-les maintenant</b>
                  <span style={{ fontSize: 10 }}>Si vous perdez l'accès à votre email, un de ces codes vous connecte. Ils ne seront plus jamais affichés.</span>
                  <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 6 }}>{backupCodes.map((c) => <span key={c} style={{ padding: "5px 6px", borderRadius: 4, background: "#fff", textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{c}</span>)}</div>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(backupCodes.join("\n")); toast({ title: "Codes copiés" }); }} style={linkBtn}>Copier</button>
                    <label className="flex cursor-pointer items-center" style={{ gap: 6, fontSize: 10, fontWeight: 600 }}><input type="checkbox" checked={codesSaved} onChange={(e) => setCodesSaved(e.target.checked)} data-testid="checkbox-codes-saved" />Je les ai notés</label>
                  </div>
                </div>
              )}
              <input style={{ ...field, height: 48, textAlign: "center", fontSize: 18, letterSpacing: ".4em" }} value={code} autoFocus
                onChange={(e) => { setCode(e.target.value.replace(/[^0-9a-zA-Z-]/g, "").toUpperCase().slice(0, 9)); setError(""); }}
                inputMode="numeric" autoComplete="one-time-code" placeholder="Code" aria-label="Code de vérification" data-testid="input-2fa-code" />
              <span className="text-center" style={{ fontSize: 9.5, color: D.muted }}>Pas accès à votre email ? Entrez un de vos codes de secours.</span>
              {err}
              <button type="submit" disabled={verifyOff} style={{ ...cta, opacity: verifyOff ? .5 : 1, cursor: verifyOff ? "default" : "pointer" }} data-testid="button-verify-2fa">{busy ? "Vérification…" : "Vérifier"}</button>
              <div className="flex justify-between">
                <button type="button" onClick={() => { setStep("login"); setError(""); }} style={{ ...linkBtn, color: D.muted }}>← Retour</button>
                <button type="button" onClick={resend} style={linkBtn} data-testid="button-resend-2fa">{resent ? "Code renvoyé ✓" : "Renvoyer le code"}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
