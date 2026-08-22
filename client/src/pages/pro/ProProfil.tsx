import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Loader2, BadgeCheck } from "lucide-react";
import { useProAccount, useUpdateProAccount } from "@/hooks/use-pro";
import { ProLayout, ProCard } from "@/components/ProLayout";
import { LoadingScreen } from "./ProDashboard";
import { useToast } from "@/hooks/use-toast";
import { computeProfileScore } from "@/lib/profile-score";

const C = { blue: "#0891B2", violet: "#7C3AED", ink: "#0F0A1E", body: "#475569", muted: "#8A93A5", border: "#E4E9F0", soft: "#F5F8FB", green: "#10B981" };
const COUNTRIES = ["Cameroun", "Bénin", "RDC", "Autre"];

function guessCountry(city: string): string {
  const c = (city || "").toLowerCase();
  if (/douala|yaound|bafou|bamenda|garoua|kribi|buea/.test(c)) return "Cameroun";
  if (/cotonou|porto|abomey|parakou/.test(c)) return "Bénin";
  if (/kinshasa|lubumbashi|goma|bukavu|kananga/.test(c)) return "RDC";
  return "";
}

export default function ProProfil() {
  const [, setLocation] = useLocation();
  const { data: accData } = useProAccount();
  const updateAcc = useUpdateProAccount();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [saving, setSaving] = useState(false);

  const acc = accData?.account as any;
  const email = (accData?.user as any)?.email as string | undefined;

  useEffect(() => {
    if (!acc) return;
    // fullName par défaut = partie locale de l'email → on n'affiche pas ce placeholder.
    const local = (email || "").split("@")[0].toLowerCase();
    const realName = acc.fullName && acc.fullName.trim().toLowerCase() !== local ? acc.fullName : "";
    setFullName(realName);
    setPhone(acc.phone || "");
    setCountry(acc.country || guessCountry(acc.city || ""));
    setLicenseNumber(acc.licenseNumber || "");
    setCabinetName(acc.cabinetName || "");
  }, [acc?.id]);

  if (!accData?.account) return <LoadingScreen />;

  const score = computeProfileScore({ email, fullName, city: acc.city, phone, country, licenseNumber, cabinetName });

  const save = async () => {
    if (!fullName.trim()) { toast({ title: "Nom requis", description: "Votre nom complet apparaît sur votre profil public.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await updateAcc.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        country: country || null,
        licenseNumber: licenseNumber.trim() || null,
        cabinetName: cabinetName.trim() || null,
      } as any);
      toast({ title: "Profil enregistré ✅", description: score >= 100 ? "Profil complet — vous êtes visible par les patients." : "Vous pouvez compléter le reste plus tard." });
      setLocation("/derm/dashboard");
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const label: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 6 };
  const input: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, background: C.soft, border: `1px solid ${C.border}`, color: C.ink, fontSize: 15, outline: "none" };
  const note: React.CSSProperties = { fontSize: 11.5, color: C.muted, margin: "6px 2px 0" };

  return (
    <ProLayout title="Votre profil" back="/derm/dashboard">
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <ProCard className="p-5">
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: "0 0 4px" }}>Votre profil — étape 2/2</h1>
          <p style={{ fontSize: 13, color: C.body, margin: "0 0 6px" }}>Les dermatos avec profil complet reçoivent <strong style={{ color: C.ink }}>3× plus</strong> de patients GlowScan.</p>
          {/* mini barre */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "#E2E8F0", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${score}%`, borderRadius: 9999, background: "linear-gradient(90deg,#0891B2,#7C3AED)", transition: "width .3s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.blue, fontVariantNumeric: "tabular-nums" }}>{score}%</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={label}>Nom complet</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr Marie Mbarga" style={input} data-testid="input-fullname" autoFocus />
              <p style={note}>Obligatoire pour votre profil public.</p>
            </div>

            <div>
              <label style={label}>Téléphone WhatsApp</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="237 6XX XX XX XX" style={input} data-testid="input-phone" />
              <p style={note}>Vos patients reçoivent leurs rapports sur ce numéro.</p>
            </div>

            <div>
              <label style={label}>Pays</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...input, appearance: "auto" }} data-testid="select-country">
                <option value="">Sélectionner…</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ ...label, display: "flex", alignItems: "center", gap: 8 }}>
                Numéro d'ordre ONMC
                <span style={{ fontSize: 10, fontWeight: 800, color: C.blue, background: "rgba(8,145,178,0.1)", padding: "2px 7px", borderRadius: 6 }}>Recommandé</span>
              </label>
              <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="ONMC-2024-XXXX" style={input} data-testid="input-license" />
              {licenseNumber.trim() ? (
                <p style={{ ...note, color: C.green, display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <BadgeCheck style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                  Votre statut sera vérifié sous 24h. Vous pouvez utiliser GlowScan pendant ce temps.
                </p>
              ) : (
                <p style={note}>Les dermatos vérifiés reçoivent un badge de confiance visible par les patients.</p>
              )}
            </div>

            <div>
              <label style={label}>Nom du cabinet</label>
              <input value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} placeholder="Cabinet Bonanjo" style={input} data-testid="input-cabinet" />
            </div>

            <button onClick={save} disabled={saving}
              style={{ width: "100%", height: 50, borderRadius: 12, border: "none", background: C.violet, color: "#fff", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 6px 18px rgba(124,58,237,.28)", marginTop: 4 }}
              data-testid="button-save-profile">
              {saving ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : <>Enregistrer mon profil <ArrowRight style={{ width: 17, height: 17 }} /></>}
            </button>
            <button onClick={() => setLocation("/derm/dashboard")} style={{ background: "none", border: "none", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 6 }} data-testid="button-later">
              Compléter plus tard
            </button>
          </div>
        </ProCard>
      </div>
    </ProLayout>
  );
}
