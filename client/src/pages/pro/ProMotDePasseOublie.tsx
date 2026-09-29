import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AuthCard, AuthError, AuthField, DermAuthShell, authInput } from "@/components/pro/DermAuthShell";

// ════════════════════════════════════════════════════════════════════════
// Mot de passe oublié GlowScan Derm (refonte Organic) — maquette « Derm
// Connexion », carte « Mot de passe oublié ». Le serveur envoie un code à
// 6 chiffres par email (ou SMS pour un compte téléphone), valable 15 min,
// puis le médecin choisit son nouveau mot de passe sur la même page.
// ════════════════════════════════════════════════════════════════════════

const SIDE = {
  title: "Bon retour sur GlowScan Derm.",
  text: "Accédez à votre cabinet, à vos avis et à votre portefeuille.",
  points: ["Vérification en 2 étapes par email", "Secrétaires : même page, accès limité", "Connexion possible sans mot de passe"],
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Une erreur est survenue. Réessayez.");
  return data;
}

export default function ProMotDePasseOublie() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [masked, setMasked] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Entrez un email valide.");
    setBusy(true);
    setError("");
    try {
      const data = await postJson("/api/auth/forgot-password", { contact: email.trim() });
      setMasked(data.maskedContact || email.trim());
      if (data.code) setCode(String(data.code)); // développement local uniquement
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError("Mot de passe trop court : 8 caractères minimum.");
    if (pw !== pw2) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    setError("");
    try {
      await postJson("/api/auth/reset-password", { code: code.trim(), newPassword: pw });
      toast({ title: "Mot de passe modifié", description: "Connectez-vous avec votre nouveau mot de passe." });
      setLocation("/derm/connexion");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DermAuthShell side={SIDE}>
      {step === 1 ? (
        <form onSubmit={sendCode} noValidate>
          <AuthCard>
            <span className="font-heading text-[22px] leading-tight">Mot de passe oublié</span>
            <span className="text-[14px] text-organic-neutral-800">
              Entrez votre email : vous recevrez un code pour choisir un nouveau mot de passe.
            </span>
            <AuthField label="Email professionnel">
              <Input className={authInput} type="email" value={email} autoComplete="email"
                onChange={(e) => { setEmail(e.target.value); setError(""); }} data-testid="input-contact" />
            </AuthField>
            {error && <AuthError>{error}</AuthError>}
            <Button type="submit" isLoading={busy} disabled={busy} className="h-auto py-3" data-testid="button-send-code">
              Envoyer le code
            </Button>
            <Button type="button" variant="ghost" onClick={() => setLocation("/derm/connexion")}>← Retour à la connexion</Button>
          </AuthCard>
        </form>
      ) : (
        <form onSubmit={reset} noValidate>
          <AuthCard>
            <span className="font-heading text-[22px] leading-tight">Nouveau mot de passe</span>
            <span className="text-[14px] text-organic-neutral-800">
              Code envoyé à <b>{masked}</b>. Pensez à regarder dans les courriers indésirables.
            </span>
            <AuthField label="Code à 6 chiffres">
              <Input className={`${authInput} tracking-[.3em]`} inputMode="numeric" autoComplete="one-time-code" value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} data-testid="input-code" />
            </AuthField>
            <AuthField label="Nouveau mot de passe">
              <div className="relative">
                <Input className={`${authInput} pr-[84px]`} type={showPw ? "text" : "password"} value={pw} autoComplete="new-password"
                  placeholder="8 caractères minimum" onChange={(e) => { setPw(e.target.value); setError(""); }} data-testid="input-new-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent px-2 py-1.5 font-body text-[12px] font-bold text-organic-accent-700">
                  {showPw ? "Masquer" : "Afficher"}
                </button>
              </div>
            </AuthField>
            <AuthField label="Confirmer le mot de passe">
              <Input className={authInput} type={showPw ? "text" : "password"} value={pw2} autoComplete="new-password"
                onChange={(e) => { setPw2(e.target.value); setError(""); }} data-testid="input-confirm-password" />
            </AuthField>
            {error && <AuthError>{error}</AuthError>}
            <Button type="submit" isLoading={busy} disabled={busy || code.length < 6} className="h-auto py-3" data-testid="button-reset">
              Enregistrer le mot de passe
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setStep(1); setError(""); }}>← Retour</Button>
          </AuthCard>
        </form>
      )}
    </DermAuthShell>
  );
}
