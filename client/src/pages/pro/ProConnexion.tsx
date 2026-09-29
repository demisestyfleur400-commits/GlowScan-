import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProAccount } from "@/hooks/use-pro";
import { AuthCard, AuthError, AuthField, DermAuthShell, authInput } from "@/components/pro/DermAuthShell";
import { PRO_PROFILES, proHomeOf, type ProProfile } from "@shared/proProfile";

// ════════════════════════════════════════════════════════════════════════
// Connexion / création de compte GlowScan Derm (refonte Organic) — maquette
// « Derm Connexion ». Une seule page, deux modes (/derm/connexion et
// /derm/inscription). 2FA email obligatoire (codes de secours acceptés),
// lien magique, puis redirection selon le rôle (secrétaire) et le profil
// choisi à l'inscription (Dermatologue / Relais / ONG).
// ════════════════════════════════════════════════════════════════════════

// Doit rester synchronisé avec DERM_TERMS_VERSION dans DermConditions.tsx
const DERM_TERMS_VERSION = "v1-2026-07";

type Mode = "signin" | "signup";

const SIDE: Record<Mode, { title: string; text: string; points: string[] }> = {
  signup: {
    title: "Rejoignez le réseau de la dermatologie africaine.",
    text: "Dermatologue, relais de terrain ou programme de santé : un seul compte, les outils adaptés à votre rôle.",
    points: ["Profil en ligne en 5 minutes", "14 jours gratuits, sans carte bancaire", "Vos données de santé protégées"],
  },
  signin: {
    title: "Bon retour sur GlowScan Derm.",
    text: "Accédez à votre cabinet, à vos avis et à votre portefeuille.",
    points: ["Vérification en 2 étapes par email", "Secrétaires : même page, accès limité", "Connexion possible sans mot de passe"],
  },
};

const maskHint = (email: string) => (email.includes("@") ? email.replace(/^(.).*(@.*)$/, "$1•••$2") : "votre email");

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST", credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Une erreur est survenue. Réessayez.");
  return data;
}

export default function ProConnexion({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: accData } = useProAccount();

  const [step, setStep] = useState<"login" | "2fa">("login");
  const [mode, setModeState] = useState<Mode>(initialMode);
  const [profile, setProfile] = useState<ProProfile>("derm");
  const [fullName, setFullName] = useState("");
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

  const setMode = (m: Mode) => {
    setModeState(m);
    setError("");
    window.history.replaceState(null, "", (m === "signup" ? "/derm/inscription" : "/derm/connexion") + window.location.search);
  };

  const goHome = async (data: any) => {
    await qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
    await qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    // Nouvelle connexion : autorise la reprise auto du dernier dossier sur le tableau de bord.
    try { sessionStorage.removeItem("derm_autoresumed"); } catch {}
    setLocation(proHomeOf(data?.account?.profile, data?.role));
  };

  const start2fa = (data: any) => {
    setEmailHint(data.emailHint || maskHint(email));
    setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
    setCodesSaved(false);
    setCode("");
    setResent(false);
    setStep("2fa");
    if (data.devFallback) toast({ title: "Mode développement", description: "Le code est dans les journaux du serveur." });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return setError("Entrez un email valide.");
    if (pw.length < (signup ? 8 : 1)) return setError(signup ? "Mot de passe trop court : 8 caractères minimum." : "Entrez votre mot de passe.");
    if (signup && !fullName.trim()) return setError("Entrez votre nom complet.");
    if (signup && !consent) return setError("Acceptez les conditions d'utilisation pour continuer.");
    setBusy(true);
    setError("");
    try {
      const data = signup
        ? await postJson("/api/pro/register", {
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password: pw,
            profile,
            consent: true,
            consentVersion: DERM_TERMS_VERSION,
            ref: new URLSearchParams(window.location.search).get("ref") || undefined, // parrainage confrère
          })
        : await postJson("/api/pro/login", { email: email.trim(), password: pw });
      if (data.requires2fa) start2fa(data);
      else await goHome(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await goHome(await postJson("/api/pro/login/2fa", { code }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const data = await postJson("/api/pro/login/2fa/resend");
      if (data.emailHint) setEmailHint(data.emailHint);
      setResent(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const magic = async () => {
    if (!email.includes("@")) return setError("Entrez votre email d'abord.");
    setError("");
    try {
      await postJson("/api/pro/login/magic/request", { email: email.trim() });
      setMagicSent(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const verifyOff = busy || code.replace(/\s/g, "").length < 6 || (backupCodes.length > 0 && !codesSaved);

  return (
    <DermAuthShell side={SIDE[mode]}>
      {step === "login" ? (
        <form onSubmit={submit} noValidate>
          <AuthCard>
            <div className="flex gap-1.5 rounded-pill bg-organic-bg p-1" role="tablist">
              {([["signin", "Se connecter"], ["signup", "Créer un compte"]] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                  className={`flex-1 cursor-pointer rounded-pill border-0 px-3.5 py-2.5 font-body text-[14px] font-bold ${mode === k ? "bg-organic-surface text-organic-accent-700" : "bg-transparent text-organic-text"}`}
                  data-testid={`tab-${k}`}>
                  {l}
                </button>
              ))}
            </div>

            {signup && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-organic-neutral-700">Je suis</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRO_PROFILES.map((p) => {
                      const on = profile === p.key;
                      return (
                        <button key={p.key} type="button" onClick={() => setProfile(p.key)} aria-pressed={on}
                          className={`cursor-pointer rounded-pill border px-3.5 py-2 font-body text-[13px] font-semibold ${on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`}
                          data-testid={`profile-${p.key}`}>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <AuthField label="Nom complet">
                  <Input className={authInput} value={fullName} onChange={(e) => { setFullName(e.target.value); setError(""); }}
                    placeholder="Dr Aïcha Nkemdirim" autoComplete="name" data-testid="input-name" />
                </AuthField>
              </>
            )}

            <AuthField label="Email professionnel">
              <Input className={authInput} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="vous@cabinet.cm" autoComplete="email" data-testid="input-email" />
            </AuthField>
            <AuthField label="Mot de passe">
              <div className="relative">
                <Input className={`${authInput} pr-[84px]`} type={showPw ? "text" : "password"} value={pw}
                  onChange={(e) => { setPw(e.target.value); setError(""); }} placeholder="8 caractères minimum"
                  autoComplete={signup ? "new-password" : "current-password"} data-testid="input-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent px-2 py-1.5 font-body text-[12px] font-bold text-organic-accent-700"
                  data-testid="button-toggle-password">
                  {showPw ? "Masquer" : "Afficher"}
                </button>
              </div>
            </AuthField>

            {!signup && (
              <Link href="/derm/mot-de-passe-oublie" className="-mt-2 self-end text-[13px] font-bold text-organic-accent-700" data-testid="link-forgot-password">
                Mot de passe oublié ?
              </Link>
            )}

            {signup && (
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-organic-neutral-800">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(""); }}
                  className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent)]" data-testid="checkbox-consent" />
                <span>
                  J'accepte les <Link href="/derm/conditions" className="font-bold text-organic-accent-700">conditions d'utilisation</Link> et la politique de confidentialité.
                </span>
              </label>
            )}

            {error && <AuthError>{error}</AuthError>}

            <Button type="submit" size="lg" isLoading={busy} disabled={busy} className="h-auto px-6 py-3.5 text-[16px]" data-testid="button-submit">
              {signup ? "Créer mon compte gratuitement" : "Se connecter →"}
            </Button>

            {!signup ? (
              <>
                <div className="flex items-center gap-3 text-[12px] text-organic-neutral-700">
                  <span className="h-px flex-1 bg-organic-divider" />ou<span className="h-px flex-1 bg-organic-divider" />
                </div>
                <Button type="button" variant="secondary" onClick={magic} className="h-auto whitespace-normal py-2.5" data-testid="button-magic-link">
                  {magicSent ? `Lien envoyé à ${maskHint(email)} (valable 15 min)` : "Recevoir un lien de connexion par email"}
                </Button>
              </>
            ) : (
              <span className="text-center text-[12px] text-organic-neutral-700">14 jours gratuits · sans carte bancaire · paiement Mobile Money ensuite</span>
            )}
          </AuthCard>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <AuthCard>
            <span className="font-heading text-[22px] leading-tight">Vérification en 2 étapes</span>
            <span className="text-[14px] text-organic-neutral-800">
              Nous avons envoyé un code à 6 chiffres à <b>{emailHint}</b>.
            </span>

            {backupCodes.length > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl bg-organic-accent-100 p-4 text-organic-accent-900">
                <span className="text-[13px] font-bold">Vos codes de secours : notez-les maintenant</span>
                <span className="text-[12px]">Si vous perdez l'accès à votre email, un de ces codes vous connecte. Ils ne seront plus jamais affichés.</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {backupCodes.map((c) => (
                    <span key={c} className="rounded-xl bg-organic-bg px-2 py-1.5 text-center text-[13px] font-bold tracking-wider text-organic-text">{c}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(backupCodes.join("\n")); toast({ title: "Codes copiés" }); }}
                    className="cursor-pointer border-0 bg-transparent p-0 font-body text-[12px] font-bold text-organic-accent-700">
                    Copier
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold">
                    <input type="checkbox" checked={codesSaved} onChange={(e) => setCodesSaved(e.target.checked)} className="accent-[var(--color-accent)]" data-testid="checkbox-codes-saved" />
                    Je les ai notés
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i}
                  className={`flex h-14 w-[46px] items-center justify-center rounded-2xl border-2 bg-organic-bg font-heading text-[24px] ${i === code.length ? "border-organic-accent" : "border-organic-divider"}`}>
                  {/^\d{0,6}$/.test(code) ? code[i] || "" : ""}
                </span>
              ))}
            </div>
            <Input className={`${authInput} text-center text-[18px] tracking-[.4em]`} value={code} autoFocus
              onChange={(e) => { setCode(e.target.value.replace(/[^0-9a-zA-Z-]/g, "").toUpperCase().slice(0, 9)); setError(""); }}
              inputMode="numeric" autoComplete="one-time-code" placeholder="Tapez le code" aria-label="Code de vérification" data-testid="input-2fa-code" />
            <span className="text-center text-[12px] text-organic-neutral-700">Pas accès à votre email ? Entrez un de vos codes de secours.</span>

            {error && <AuthError>{error}</AuthError>}

            <Button type="submit" size="lg" isLoading={busy} disabled={verifyOff} className="h-auto px-6 py-3.5 text-[16px]" data-testid="button-verify-2fa">
              Vérifier
            </Button>
            <div className="flex justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => { setStep("login"); setError(""); }}>← Retour</Button>
              <Button type="button" variant="ghost" onClick={resend} data-testid="button-resend-2fa">
                {resent ? "Code renvoyé ✓" : "Renvoyer le code"}
              </Button>
            </div>
          </AuthCard>
        </form>
      )}
    </DermAuthShell>
  );
}
