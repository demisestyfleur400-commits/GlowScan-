import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, Check, ShieldCheck, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GS, GsScreen, GsMono, GsSteps, GsButton } from "@/lib/gs-ui";

// ════════════════════════════════════════════════════════════════════════
// Refonte B2C — Inscription fractionnée « une info par écran » (01A→01).
// UI fidèle à la maquette, bâtie sur gs-ui. Câblée au backend EXISTANT :
//   • /api/auth/register (envoie déjà le code e-mail → email_verified)
//   • /api/auth/login/2fa (vérifie le code)
// Additif backend : téléphone + consentements persistés (colonnes résilientes).
// Le prénom est dérivé de l'e-mail (la maquette ne demande pas de nom).
// ════════════════════════════════════════════════════════════════════════

const deriveFirstName = (email: string) => {
  const local = (email.split("@")[0] || "").split(/[._+\-0-9]/).filter(Boolean)[0] || "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1).toLowerCase() : "Patient";
};

export function AuthRegisterWizard({ onGoLogin }: { onGoLogin: () => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(1); // 1 phone · 2 email · 3 password · 4 consents · 5 code
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [cDataset, setCDataset] = useState(false);
  const [cWhatsapp, setCWhatsapp] = useState(false);
  const [code, setCode] = useState("");
  const [emailHint, setEmailHint] = useState("");

  const phoneDigits = phone.replace(/\D/g, "");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const pwdLen = pwd.length >= 8;
  const pwdUpNum = /[A-Z]/.test(pwd) && /\d/.test(pwd);
  const pwdSpecial = /[^A-Za-z0-9]/.test(pwd);
  const pwdStrength = (pwdLen ? 1 : 0) + (pwdUpNum ? 1 : 0) + (pwdSpecial ? 1 : 0) + (pwd.length >= 12 ? 1 : 0);

  // ── En-tête commun : mark/retour + progression + n/5 ──
  const Head = ({ n, withMark }: { n: number; withMark?: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
      {withMark ? (
        <img src="/glowscan-mark.png" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }} style={{ width: 30, height: 30 }} />
      ) : (
        <button onClick={() => setStep((s) => Math.max(1, s - 1))} aria-label="Retour" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: GS.ink, display: "flex" }}>
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
      )}
      <GsSteps total={5} current={n} />
      <span style={{ fontFamily: GS.mono, fontSize: 10, fontWeight: 600, color: GS.teal }}>{n}/5</span>
    </div>
  );

  const Title = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 27, fontWeight: 600, color: GS.ink, letterSpacing: "-.9px", lineHeight: 1.15 }}>{children}</div>
  );
  const Sub = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 13, lineHeight: 1.6, color: GS.muted, marginTop: 10 }}>{children}</div>
  );
  const inputBox: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `1px solid ${GS.ink}`, padding: 15, fontFamily: GS.sans, fontSize: 15, color: GS.ink, outline: "none", borderRadius: 0 };

  async function submitRegister() {
    if (!emailValid) { toast({ title: "E-mail invalide", variant: "destructive" }); setStep(2); return; }
    if (!pwdLen) { toast({ title: "Mot de passe trop court", description: "8 caractères minimum.", variant: "destructive" }); setStep(3); return; }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        firstName: deriveFirstName(email.trim()),
        email: email.trim().toLowerCase(),
        password: pwd,
        website: "",
        phone: phoneDigits ? `+237${phoneDigits}` : undefined,
        consentDataset: cDataset,
        consentWhatsapp: cWhatsapp,
      });
      const data = await res.json().catch(() => ({} as any));
      if (data?.requires2fa) {
        setEmailHint(data.emailHint || email.trim());
        setCode("");
        setStep(5);
        toast({ title: "Code envoyé 📧", description: data.devFallback ? "Mode dev : voir les logs serveur." : `Entrez le code reçu sur ${data.emailHint || "votre e-mail"}.` });
        setLoading(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("déjà") || msg.includes("exist")) {
        toast({ title: "Compte déjà existant", description: "Connectez-vous plutôt.", variant: "destructive" });
        onGoLogin();
      } else {
        toast({ title: "Inscription impossible", description: err?.message || "Réessayez.", variant: "destructive" });
      }
    } finally { setLoading(false); }
  }

  async function verifyCode() {
    if (code.trim().length < 6) { toast({ title: "Code à 6 chiffres", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login/2fa", { code: code.trim() });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Code incorrect", description: err?.message || "Réessayez ou renvoyez un code.", variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <GsScreen>
      {/* ── 01A · TÉLÉPHONE ── */}
      {step === 1 && (
        <>
          <Head n={1} withMark />
          <GsMono style={{ display: "block", marginBottom: 9 }}>Étape 1 · identification</GsMono>
          <Title>Votre numéro de téléphone</Title>
          <Sub>C'est lui qui identifie votre dossier médical et qui reçoit vos ordonnances.</Sub>
          <div style={{ marginTop: 28, display: "flex", gap: 9 }}>
            <div style={{ border: `1px solid ${GS.line}`, padding: "15px 13px", fontFamily: GS.mono, fontSize: 15, color: GS.ink, display: "flex", alignItems: "center", gap: 8, flex: "none" }}>+237</div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="6 78 91 23 45"
              style={{ flex: 1, border: `1px solid ${GS.ink}`, padding: 15, fontFamily: GS.mono, fontSize: 17, color: GS.ink, letterSpacing: ".08em", outline: "none", borderRadius: 0, boxSizing: "border-box" }} />
          </div>
          <div style={{ fontFamily: GS.mono, fontSize: 9, color: GS.faint, marginTop: 9, letterSpacing: ".05em" }}>FORMAT CAMEROUN · 9 CHIFFRES</div>
          <div style={{ marginTop: "auto", paddingBottom: 26 }}>
            <div style={{ fontSize: 11, lineHeight: 1.55, color: GS.muted, marginBottom: 14 }}>Une seule information par écran. Vous pourrez tout modifier plus tard depuis votre dossier.</div>
            <GsButton onClick={() => { if (phoneDigits.length < 8) { toast({ title: "Numéro à 9 chiffres", variant: "destructive" }); return; } setStep(2); }} icon={<ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />}>Continuer</GsButton>
            <div style={{ textAlign: "center", fontSize: 12, color: GS.muted, marginTop: 14 }}>Déjà inscrit ? <a onClick={onGoLogin} style={{ color: GS.teal, fontWeight: 600, cursor: "pointer" }}>Se connecter</a></div>
          </div>
        </>
      )}

      {/* ── 01B · E-MAIL ── */}
      {step === 2 && (
        <>
          <Head n={2} />
          <GsMono style={{ display: "block", marginBottom: 9 }}>Étape 2 · contact</GsMono>
          <Title>Votre adresse e-mail</Title>
          <Sub>Nous y envoyons votre code de vérification, puis vos comptes rendus et vos factures.</Sub>
          <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="vous@exemple.com" style={{ ...inputBox, marginTop: 28 }} />
          {emailValid && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
              <Check size={14} style={{ color: GS.teal }} strokeWidth={2.5} />
              <GsMono color={GS.teal} style={{ letterSpacing: ".05em" }}>Adresse valide</GsMono>
            </div>
          )}
          <div style={{ marginTop: 22, border: `1px solid ${GS.line}`, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Info size={17} style={{ color: GS.teal, marginTop: 1, flexShrink: 0 }} strokeWidth={1.8} />
            <div style={{ fontSize: 11, lineHeight: 1.55, color: GS.muted }}>Jamais utilisée pour de la publicité. Vous choisirez à l'étape 5 si vous acceptez les rappels.</div>
          </div>
          <div style={{ marginTop: "auto", paddingBottom: 26 }}>
            <GsButton onClick={() => { if (!emailValid) { toast({ title: "E-mail invalide", variant: "destructive" }); return; } setStep(3); }} icon={<ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />}>Continuer</GsButton>
          </div>
        </>
      )}

      {/* ── 01D · MOT DE PASSE ── */}
      {step === 3 && (
        <>
          <Head n={3} />
          <GsMono style={{ display: "block", marginBottom: 9 }}>Étape 3 · sécurité</GsMono>
          <Title>Choisissez un mot de passe</Title>
          <Sub>Il protège des photos médicales. Prenez-en un que vous n'utilisez pas ailleurs.</Sub>
          <div style={{ marginTop: 28, border: `1px solid ${GS.ink}`, padding: 15, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <input value={pwd} onChange={(e) => setPwd(e.target.value)} type={showPwd ? "text" : "password"} placeholder="••••••••••"
              style={{ flex: 1, border: "none", outline: "none", fontFamily: GS.mono, fontSize: 17, color: GS.ink, letterSpacing: showPwd ? "normal" : ".2em", background: "transparent" }} />
            <button onClick={() => setShowPwd((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: GS.muted, display: "flex" }}>{showPwd ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ flex: 1, display: "flex", gap: 4 }}>
              {[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 5, background: i < pwdStrength ? GS.accent : GS.panel }} />)}
            </div>
            <GsMono color={GS.teal} style={{ letterSpacing: ".05em" }}>{pwdStrength >= 3 ? "SOLIDE" : pwdStrength === 2 ? "CORRECT" : "FAIBLE"}</GsMono>
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 9 }}>
            {[{ ok: pwdLen, t: "Au moins 8 caractères" }, { ok: pwdUpNum, t: "Une majuscule et un chiffre" }].map((c) => (
              <div key={c.t} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                {c.ok ? <Check size={15} style={{ color: GS.teal }} strokeWidth={2.5} /> : <span style={{ width: 15, height: 15, border: `1px solid ${GS.disabled}`, flex: "none" }} />}
                <span style={{ fontSize: 12, color: c.ok ? GS.muted : GS.faint }}>{c.t}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              {pwdSpecial ? <Check size={15} style={{ color: GS.teal }} strokeWidth={2.5} /> : <span style={{ width: 15, height: 15, border: `1px solid ${GS.disabled}`, flex: "none" }} />}
              <span style={{ fontSize: 12, color: GS.faint }}>Un caractère spécial — recommandé</span>
            </div>
          </div>
          <div style={{ marginTop: "auto", paddingBottom: 26 }}>
            <div style={{ border: `1px solid ${GS.line}`, padding: 13, fontSize: 11, lineHeight: 1.55, color: GS.muted, marginBottom: 14 }}>Oublié plus tard ? La récupération passe par le code e-mail, jamais par une question secrète.</div>
            <GsButton onClick={() => { if (!pwdLen) { toast({ title: "8 caractères minimum", variant: "destructive" }); return; } setStep(4); }} icon={<ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />}>Continuer</GsButton>
          </div>
        </>
      )}

      {/* ── 01 · CONSENTEMENTS ── */}
      {step === 4 && (
        <>
          <Head n={5} />
          <GsMono style={{ display: "block", marginBottom: 9 }}>Étape 5 · autorisations</GsMono>
          <div style={{ fontSize: 26, fontWeight: 600, color: GS.ink, letterSpacing: "-.8px", lineHeight: 1.15 }}>Ce que vous nous autorisez</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: GS.muted, marginTop: 9 }}>Vos photos sont des données de santé. Trois autorisations distinctes — vous pouvez refuser les deux dernières.</div>
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 9 }}>
            {/* requise */}
            <div style={{ border: `1px solid ${GS.line}`, padding: 14, display: "flex", gap: 13, alignItems: "flex-start" }}>
              <span style={{ width: 20, height: 20, background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", marginTop: 1 }}><Check size={13} style={{ color: GS.accent }} strokeWidth={3} /></span>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Traitement de mes photos</div><div style={{ fontSize: 11, color: GS.muted, lineHeight: 1.5, marginTop: 3 }}>Nécessaire au service. Conservation 5 ans, suppression sur demande.</div></div>
            </div>
            {/* dataset */}
            <button onClick={() => setCDataset((v) => !v)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: `1px solid ${cDataset ? GS.ink : GS.line}`, padding: 14, display: "flex", gap: 13, alignItems: "flex-start" }}>
              <span style={{ width: 20, height: 20, flex: "none", marginTop: 1, ...(cDataset ? { background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" } : { border: `1px solid ${GS.disabled}` }) }}>{cDataset && <Check size={13} style={{ color: GS.accent }} strokeWidth={3} />}</span>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Contribuer à la base africaine</div><div style={{ fontSize: 11, color: GS.muted, lineHeight: 1.5, marginTop: 3 }}>Mes images anonymisées entraînent le modèle sur peaux noires. Facultatif.</div></div>
            </button>
            {/* whatsapp */}
            <button onClick={() => setCWhatsapp((v) => !v)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: `1px solid ${cWhatsapp ? GS.ink : GS.line}`, padding: 14, display: "flex", gap: 13, alignItems: "flex-start" }}>
              <span style={{ width: 20, height: 20, flex: "none", marginTop: 1, ...(cWhatsapp ? { background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" } : { border: `1px solid ${GS.disabled}` }) }}>{cWhatsapp && <Check size={13} style={{ color: GS.accent }} strokeWidth={3} />}</span>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Rappels WhatsApp</div><div style={{ fontSize: 11, color: GS.muted, lineHeight: 1.5, marginTop: 3 }}>Suivi de traitement et contrôles. Facultatif.</div></div>
            </button>
          </div>
          <div style={{ marginTop: "auto", paddingBottom: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <ShieldCheck size={13} style={{ color: GS.teal }} strokeWidth={1.8} />
              <GsMono style={{ letterSpacing: ".04em" }}>Chiffrement AES-256 · hébergeur certifié santé</GsMono>
            </div>
            <GsButton onClick={submitRegister} disabled={loading}>{loading ? "Création…" : "Créer mon dossier"}</GsButton>
            <div style={{ textAlign: "center", fontSize: 12, color: GS.muted, marginTop: 14 }}>Déjà inscrit ? <a onClick={onGoLogin} style={{ color: GS.teal, fontWeight: 600, cursor: "pointer" }}>Se connecter</a></div>
          </div>
        </>
      )}

      {/* ── 01C · CODE (après création : le backend envoie le code) ── */}
      {step === 5 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <Mail size={20} style={{ color: GS.ink }} strokeWidth={1.8} />
            <GsSteps total={5} current={5} />
            <span style={{ fontFamily: GS.mono, fontSize: 10, fontWeight: 600, color: GS.teal }}>OTP</span>
          </div>
          <GsMono style={{ display: "block", marginBottom: 9 }}>Vérification</GsMono>
          <Title>Le code reçu par e-mail</Title>
          <Sub>Six chiffres envoyés à <span style={{ fontFamily: GS.mono, color: GS.ink }}>{emailHint || email}</span>. Valable 10 minutes.</Sub>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="— — — — — —"
            style={{ marginTop: 28, width: "100%", boxSizing: "border-box", border: `1px solid ${GS.ink}`, padding: 16, fontFamily: GS.mono, fontSize: 24, fontWeight: 600, color: GS.ink, letterSpacing: ".4em", textAlign: "center", outline: "none", borderRadius: 0 }} />
          <div style={{ marginTop: 22, border: `1px solid ${GS.line}`, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Info size={17} style={{ color: GS.muted, marginTop: 1, flexShrink: 0 }} strokeWidth={1.8} />
            <div style={{ fontSize: 11, lineHeight: 1.55, color: GS.muted }}>Rien reçu ? Regardez dans les spams, ou <a onClick={() => setStep(2)} style={{ color: GS.teal, fontWeight: 600, cursor: "pointer" }}>corrigez votre adresse</a> sans recommencer.</div>
          </div>
          <div style={{ marginTop: "auto", paddingBottom: 26 }}>
            <GsButton onClick={verifyCode} disabled={loading} icon={<ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />}>{loading ? "Vérification…" : "Vérifier"}</GsButton>
          </div>
        </>
      )}
    </GsScreen>
  );
}
