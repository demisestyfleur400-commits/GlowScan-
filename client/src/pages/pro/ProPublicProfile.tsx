import { useState, useEffect } from "react";
import { ProLayout, ProCard } from "@/components/ProLayout";
import { useToast } from "@/hooks/use-toast";
import { DERM } from "@/lib/design-tokens";
import { Loader2, Copy, ExternalLink, Camera, CheckCircle2 } from "lucide-react";

const SPECIALTIES: { key: string; label: string }[] = [
  { key: "acne", label: "Acné" },
  { key: "taches", label: "Taches" },
  { key: "hyperpigmentation", label: "Hyperpigmentation" },
  { key: "cheloides", label: "Chéloïdes" },
  { key: "eczema", label: "Eczéma" },
  { key: "peaux_melanisees", label: "Peaux mélanisées" },
  { key: "cheveux", label: "Cheveux & cuir chevelu" },
  { key: "anti_age", label: "Anti-âge" },
  { key: "pediatrie", label: "Pédiatrie" },
  { key: "esthetique", label: "Esthétique" },
];

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
  const [price, setPrice] = useState(3500);
  const [available, setAvailable] = useState(false);
  const [publicEnabled, setPublicEnabled] = useState(true);
  const [certified, setCertified] = useState(false);
  const [certifiedAt, setCertifiedAt] = useState<string | null>(null);

  const load = () => {
    fetch("/api/pro/profile", { credentials: "include" }).then((r) => r.json()).then((d) => {
      const p = d.profile; if (!p) return;
      setSlug(p.slug); setFullName(p.fullName || ""); setPhotoUrl(p.photoUrl || null);
      setBio(p.bio || ""); setSpecialties(p.specialties || []); setWhatsapp(p.whatsapp || "");
      setPrice(p.price || 3500); setAvailable(!!p.b2cAvailable); setPublicEnabled(p.publicProfileEnabled !== false);
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
      if (res.ok) { if (d.profile?.slug) setSlug(d.profile.slug); toast({ title: "Profil enregistré ✅" }); load(); }
      else toast({ title: d.message || "Échec de l'enregistrement", variant: "destructive" });
    } catch { toast({ title: "Erreur réseau", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const publicUrl = slug ? `https://glow-scan.com/dr/${slug}` : null;
  const copyLink = () => { if (publicUrl) { navigator.clipboard.writeText(publicUrl); toast({ title: "Lien copié 📋" }); } };

  if (loading) return <ProLayout title="Mon profil public" back="/derm/dashboard"><div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 className="animate-spin" style={{ color: DERM.violetMid }} /></div></ProLayout>;

  const lbl = { fontSize: 12, fontWeight: 700, color: DERM.textMuted, marginBottom: 6, display: "block" } as const;
  const inputStyle = { width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.04)", border: `1px solid ${DERM.border}`, borderRadius: 10, padding: "10px 12px", color: DERM.text, fontSize: 13 };

  return (
    <ProLayout title="Mon profil public" back="/derm/dashboard">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 24 }}>

        {/* Certification */}
        <ProCard className="p-4">
          {certified ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: DERM.violet, fontSize: 16 }}>✦</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: DERM.text, margin: 0 }}>Dermatologue Certifié GlowScan</p>
                <p style={{ fontSize: 11, color: DERM.textMuted, margin: 0 }}>{certifiedAt ? `Depuis le ${new Date(certifiedAt).toLocaleDateString("fr-FR")}` : "Actif"}</p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: DERM.textMuted, margin: 0 }}>⏳ Badge de certification en attente. Complète ton profil (photo + bio + spécialités) — l'équipe GlowScan vérifie ton n° d'ordre puis active le badge.</p>
          )}
        </ProCard>

        {/* Photo + nom */}
        <ProCard className="p-5">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
              {photoUrl ? (
                <img src={photoUrl} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👩🏾‍⚕️</div>
              )}
              <div style={{ position: "absolute", bottom: 0, right: 0, background: DERM.violet, borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera style={{ width: 13, height: 13, color: "#fff" }} />
              </div>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: DERM.text, margin: 0 }}>Dr {fullName.replace(/^dr\.?\s*/i, "")}</p>
              <p style={{ fontSize: 11, color: DERM.textMuted, margin: "2px 0 0" }}>Touche la photo pour la modifier</p>
            </div>
          </div>
        </ProCard>

        {/* Bio */}
        <ProCard className="p-5">
          <label style={lbl}>Bio courte ({bio.length}/200)</label>
          <textarea value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} rows={3}
            placeholder="Ex : Dermatologue spécialisée sur les peaux africaines, 8 ans d'expérience à Douala."
            style={{ ...inputStyle, resize: "vertical" }} />
        </ProCard>

        {/* Spécialités */}
        <ProCard className="p-5">
          <label style={lbl}>Spécialités (cochées = visibles sur ton profil)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SPECIALTIES.map((s) => {
              const on = specialties.includes(s.key);
              return (
                <button key={s.key} onClick={() => toggleSpec(s.key)}
                  style={{ fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 9999, cursor: "pointer",
                    background: on ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${on ? DERM.violet : DERM.border}`, color: on ? DERM.violetLight : DERM.textMuted }}>
                  {on ? "✓ " : ""}{s.label}
                </button>
              );
            })}
          </div>
        </ProCard>

        {/* Consultation en ligne */}
        <ProCard className="p-5">
          <label style={lbl}>Consultation en ligne</label>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: DERM.textBody }}>Disponible pour consulter des patients</span>
            <button onClick={() => setAvailable((v) => !v)}
              style={{ width: 46, height: 26, borderRadius: 9999, border: "none", cursor: "pointer", background: available ? DERM.violet : "rgba(255,255,255,0.15)", position: "relative", transition: "background .2s" }}>
              <span style={{ position: "absolute", top: 3, left: available ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
            </button>
          </div>
          <label style={lbl}>Prix de la consultation (FCFA)</label>
          <input type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value) || 3500)} style={inputStyle} />
          <label style={{ ...lbl, marginTop: 12 }}>Numéro WhatsApp (pour "Prendre contact")</label>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="2376XXXXXXXX" style={inputStyle} />
        </ProCard>

        {/* Lien public */}
        <ProCard className="p-5">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: DERM.textBody }}>Profil public visible</span>
            <button onClick={() => setPublicEnabled((v) => !v)}
              style={{ width: 46, height: 26, borderRadius: 9999, border: "none", cursor: "pointer", background: publicEnabled ? DERM.violet : "rgba(255,255,255,0.15)", position: "relative" }}>
              <span style={{ position: "absolute", top: 3, left: publicEnabled ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
            </button>
          </div>
          {publicUrl ? (
            <>
              <label style={lbl}>Ton lien à partager (WhatsApp, LinkedIn…)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ ...inputStyle, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: DERM.violetLight }}>{publicUrl}</div>
                <button onClick={copyLink} style={{ background: DERM.violet, border: "none", borderRadius: 10, padding: "0 12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700 }}><Copy style={{ width: 13, height: 13 }} /> Copier</button>
              </div>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, fontWeight: 700, color: DERM.violetMid, textDecoration: "none" }}>
                <ExternalLink style={{ width: 13, height: 13 }} /> Voir mon profil public
              </a>
            </>
          ) : (
            <p style={{ fontSize: 12, color: DERM.textMuted, margin: 0 }}>Ton lien sera généré après le premier enregistrement.</p>
          )}
        </ProCard>

        <button onClick={save} disabled={saving}
          style={{ position: "sticky", bottom: 12, background: DERM.violet, color: "#fff", border: "none", borderRadius: 9999, padding: "14px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: saving ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
          Enregistrer mon profil
        </button>
      </div>
    </ProLayout>
  );
}
