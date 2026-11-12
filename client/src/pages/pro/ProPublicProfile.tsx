import { useState, useEffect } from "react";
import { DermShell } from "@/components/derm/DermShell";
import { Page, ScreenHeader, Card, Btn, Input, Textarea, Chip, Tag, Label, Toggle } from "@/components/derm/ui";
import { D, FONT_UI } from "@/components/derm/tokens";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Camera, BadgeCheck, Clock } from "lucide-react";

import { SUB_SPECIALTIES } from "@shared/dermSpecialties";
const SPECIALTIES = SUB_SPECIALTIES;

async function compressPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const max = 320; let { width, height } = img;
  if (width > max || height > max) { const s = max / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); }
  const cv = document.createElement("canvas"); cv.width = width; cv.height = height;
  cv.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return cv.toDataURL("image/jpeg", 0.8);
}

export default function ProPublicProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [price, setPrice] = useState(4800);
  const [available, setAvailable] = useState(false);
  const [publicEnabled, setPublicEnabled] = useState(true);
  const [certified, setCertified] = useState(false);
  const [certifiedAt, setCertifiedAt] = useState<string | null>(null);

  const load = () => {
    fetch("/api/pro/profile", { credentials: "include" }).then((r) => r.json()).then((d) => {
      const p = d.profile; if (!p) return;
      setSlug(p.slug); setFullName(p.fullName || ""); setPhotoUrl(p.photoUrl || null);
      setBio(p.bio || ""); setSpecialties(p.specialties || []); setWhatsapp(p.whatsapp || "");
      setPrice(p.price || 4800); setAvailable(!!p.b2cAvailable); setPublicEnabled(p.publicProfileEnabled !== false);
      setCertified(!!p.certified); setCertifiedAt(p.certifiedAt || null);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleSpec = (k: string) => setSpecialties((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);

  const onPhoto = async (file?: File | null) => {
    if (!file) return;
    try { setPhotoUrl(await compressPhoto(file)); } catch { toast({ title: "Photo illisible", variant: "destructive" }); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/pro/profile/update", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, specialties, photoUrl, whatsapp, consultPriceFcfa: price, b2cAvailable: available, publicProfileEnabled: publicEnabled }),
      });
      const d = await res.json();
      if (res.ok) { if (d.profile?.slug) setSlug(d.profile.slug); toast({ title: "Profil enregistré" }); load(); }
      else toast({ title: d.message || "Échec de l'enregistrement", variant: "destructive" });
    } catch { toast({ title: "Erreur réseau", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const publicUrl = slug ? `https://glow-scan.com/dr/${slug}` : null;
  const copyLink = () => { if (publicUrl) { navigator.clipboard.writeText(publicUrl); toast({ title: "Lien copié" }); } };
  const drFull = `Dr ${fullName.replace(/^dr\.?\s*/i, "")}`;
  const initials = fullName.replace(/^dr\.?\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const missing = [!photoUrl && "photo", !bio.trim() && "présentation", specialties.length === 0 && "spécialités"].filter(Boolean) as string[];

  if (loading) {
    return <DermShell active="parametres" showBack><Page><span style={{ fontSize: 12, color: D.muted }}>Chargement de votre profil public…</span></Page></DermShell>;
  }

  return (
    <DermShell active="parametres" showBack>
      <Page>
        <ScreenHeader kicker="VISIBLE PAR LES PATIENTS" title="Mon profil public"
          sub="La fiche que les patients voient dans l'appli GlowScan et sur votre lien à partager."
          actions={<Btn kind="primary" onClick={save} disabled={saving} data-testid="button-save-public">{saving ? "Enregistrement…" : "Enregistrer mon profil"}</Btn>} />

        <div className="grid items-start" style={{ gap: 18, gridTemplateColumns: "minmax(0,1.45fr) minmax(300px,1fr)" }}>
          <div className="flex flex-col" style={{ gap: 14 }}>
            {/* Certification */}
            <Card style={{ padding: "16px 20px", background: certified ? D.tintActive : "#fff" }}>
              {certified ? (
                <span className="flex items-center" style={{ gap: 10 }}>
                  <BadgeCheck size={20} color={D.action} />
                  <span className="flex flex-col">
                    <b style={{ fontSize: 13, fontWeight: 600 }}>Dermatologue certifié GlowScan</b>
                    <span style={{ fontSize: 11, color: D.muted }}>{certifiedAt ? `Depuis le ${new Date(certifiedAt).toLocaleDateString("fr-FR")}` : "Actif"}</span>
                  </span>
                </span>
              ) : (
                <span className="flex items-start" style={{ gap: 10 }}>
                  <Clock size={18} color={D.warn} className="mt-0.5 flex-none" />
                  <span style={{ fontSize: 12, color: D.text, lineHeight: 1.55 }}>
                    <b style={{ fontWeight: 600 }}>Badge de certification en attente.</b> Complétez votre profil (photo, présentation, spécialités) : l'équipe GlowScan vérifie votre n° d'ordre puis active le badge.
                    {missing.length > 0 && <span style={{ display: "block", marginTop: 4, color: D.warn }}>Il manque : {missing.join(", ")}.</span>}
                  </span>
                </span>
              )}
            </Card>

            {/* Photo + présentation */}
            <Card>
              <b style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Photo et présentation</b>
              <div className="flex items-center" style={{ gap: 14, marginBottom: 14 }}>
                <label className="relative flex-none cursor-pointer">
                  {photoUrl
                    ? <img src={photoUrl} alt="" style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover" }} />
                    : <span className="grid place-items-center" style={{ width: 72, height: 72, borderRadius: 14, background: D.tintChip, color: D.actionDark, fontSize: 22, fontWeight: 700 }}>{initials || "Dr"}</span>}
                  <span className="absolute grid place-items-center" style={{ right: -4, bottom: -4, width: 26, height: 26, borderRadius: 999, background: D.action, color: "#fff", border: "2px solid #fff" }}><Camera size={13} /></span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                <span className="flex flex-col">
                  <b style={{ fontSize: 15, fontWeight: 600 }}>{drFull}</b>
                  <span style={{ fontSize: 11, color: D.muted }}>Cliquez sur la photo pour la modifier. Une photo nette inspire confiance.</span>
                </span>
              </div>
              <Label text={`Présentation courte (${bio.length}/200)`}>
                <Textarea value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} rows={3}
                  placeholder="Ex. : Dermatologue, peaux noires et métissées, 8 ans d'expérience à Douala." />
              </Label>
            </Card>

            {/* Spécialités */}
            <Card>
              <b style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Spécialités</b>
              <span style={{ display: "block", fontSize: 11, color: D.muted, marginBottom: 12 }}>Celles que vous cochez apparaissent sur votre fiche et aident les patients à vous trouver.</span>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {SPECIALTIES.map((s) => <Chip key={s.key} on={specialties.includes(s.key)} onClick={() => toggleSpec(s.key)}>{specialties.includes(s.key) ? "✓ " : ""}{s.label}</Chip>)}
              </div>
            </Card>

            {/* Consultation en ligne */}
            <Card>
              <b style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Consultation en ligne</b>
              <div className="flex items-center justify-between" style={{ gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 12.5 }}>Je prends des consultations en ligne</span>
                <Toggle on={available} onChange={setAvailable} label="Consultation en ligne" />
              </div>
              <div className="grid" style={{ gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                <Label text="Prix de la consultation (FCFA)"><Input type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value) || 4800)} /></Label>
                <Label text="WhatsApp pour « Prendre contact »"><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="2376XXXXXXXX" /></Label>
              </div>
            </Card>

            {/* Lien public */}
            <Card>
              <div className="flex items-center justify-between" style={{ gap: 12, marginBottom: 12 }}>
                <b style={{ fontSize: 14, fontWeight: 600 }}>Profil visible par les patients</b>
                <Toggle on={publicEnabled} onChange={setPublicEnabled} label="Profil public visible" />
              </div>
              {publicUrl ? (
                <>
                  <Label text="Votre lien à partager (WhatsApp, LinkedIn…)">
                    <span className="flex" style={{ gap: 8 }}>
                      <Input readOnly value={publicUrl} style={{ color: D.actionDark }} />
                      <Btn kind="secondary" onClick={copyLink}><Copy size={13} /> Copier</Btn>
                    </span>
                  </Label>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center" style={{ gap: 5, marginTop: 10, fontSize: 11.5, fontWeight: 600, color: D.action, textDecoration: "none" }}>
                    <ExternalLink size={13} /> Voir mon profil comme un patient
                  </a>
                </>
              ) : (
                <span style={{ fontSize: 11.5, color: D.muted }}>Votre lien sera créé au premier enregistrement.</span>
              )}
            </Card>
          </div>

          {/* Aperçu patient */}
          <div className="flex flex-col" style={{ gap: 10, position: "sticky", top: 90 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: .6, color: D.muted }}>APERÇU · CE QUE VOIT LE PATIENT</span>
            <div style={{ borderRadius: 18, padding: 18, background: "#164034", color: "#fff", fontFamily: FONT_UI }}>
              <span className="flex items-center" style={{ gap: 12 }}>
                {photoUrl
                  ? <img src={photoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover" }} />
                  : <span className="grid place-items-center" style={{ width: 56, height: 56, borderRadius: 14, background: "#cfe08a", color: "#164034", fontSize: 17, fontWeight: 700 }}>{initials || "Dr"}</span>}
                <span className="flex flex-col">
                  <b style={{ fontSize: 17, fontWeight: 700 }}>{drFull}</b>
                  <span style={{ fontSize: 11.5, opacity: .85 }}>Dermatologue{certified ? " · certifié GlowScan" : ""}</span>
                </span>
              </span>
              <span className="flex items-baseline justify-between" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.15)" }}>
                <span style={{ fontSize: 11.5, opacity: .85 }}>{available ? "Consultation en ligne" : "Consultation en ligne désactivée"}</span>
                {available && <b style={{ fontSize: 17 }}>{price.toLocaleString("fr-FR")} F</b>}
              </span>
            </div>
            {specialties.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 5 }}>
                {SPECIALTIES.filter((s) => specialties.includes(s.key)).map((s) => <span key={s.key} style={{ padding: "3px 10px", borderRadius: 999, background: "#e7eedc", color: "#164034", fontSize: 10.5, fontWeight: 600 }}>{s.label}</span>)}
              </div>
            )}
            <span style={{ fontSize: 11.5, color: D.muted, lineHeight: 1.55 }}>{bio.trim() || "Votre présentation apparaîtra ici."}</span>
            {!publicEnabled && <Tag tone="warn">Profil masqué : les patients ne le voient pas</Tag>}
          </div>
        </div>
      </Page>
    </DermShell>
  );
}
