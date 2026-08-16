import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";

// Annuaire public des dermatologues certifiés — /dermatologues. Sans auth, indexable.
interface Derm {
  slug: string; fullName: string; city?: string; photoUrl?: string | null;
  specialties: string[]; certified: boolean; available: boolean; price: number;
}

const SPECIALTY_LABELS: Record<string, string> = {
  acne: "Acné", taches: "Taches", hyperpigmentation: "Hyperpigmentation", cheloides: "Chéloïdes",
  eczema: "Eczéma", cheveux: "Cheveux", peaux_melanisees: "Peaux mélanisées",
  anti_age: "Anti-âge", pediatrie: "Pédiatrie", esthetique: "Esthétique",
};
const specLabel = (s: string) => SPECIALTY_LABELS[s] || s.replace(/_/g, " ");

export default function DermPublicList() {
  const [derms, setDerms] = useState<Derm[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState<string>("");

  useSEO({
    title: "Dermatologues certifiés — Peaux africaines | GlowScan",
    description: "Trouvez un dermatologue certifié GlowScan spécialiste des peaux mélanisées (Fitzpatrick IV–VI). Consultation en ligne dès 2 000 FCFA.",
    canonical: "https://glow-scan.com/dermatologues",
  });

  useEffect(() => {
    fetch("/api/public/dermatologues").then((r) => r.json())
      .then((d) => setDerms(d.dermatologues || [])).catch(() => setDerms([])).finally(() => setLoading(false));
  }, []);

  const allSpecs = useMemo(() => {
    const s = new Set<string>(); derms.forEach((d) => d.specialties.forEach((x) => s.add(x))); return Array.from(s);
  }, [derms]);

  const filtered = derms.filter((d) => {
    if (spec && !d.specialties.includes(spec)) return false;
    if (q.trim()) { const t = `${d.fullName} ${d.city || ""}`.toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", fontFamily: '-apple-system, system-ui, sans-serif' }}>
      {/* Bandeau */}
      <div style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", padding: "28px 18px 22px", color: "#fff" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Dermatologues certifiés</h1>
          <p style={{ fontSize: 13, opacity: 0.9, margin: "4px 0 0" }}>Spécialistes des peaux africaines (Fitzpatrick IV–VI) · Consultation en ligne</p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 18px 60px" }}>
        {/* Recherche + filtres */}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom ou ville…"
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", fontSize: 13, marginBottom: 10 }} />
        {allSpecs.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 12 }}>
            <button onClick={() => setSpec("")} style={chip(spec === "")}>Tous</button>
            {allSpecs.map((s) => <button key={s} onClick={() => setSpec(s)} style={chip(spec === s)}>{specLabel(s)}</button>)}
          </div>
        )}

        {loading && <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>Chargement…</p>}
        {!loading && filtered.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 34 }}>👩🏾‍⚕️</div>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "8px 0 0" }}>Aucun dermatologue certifié pour l'instant. Reviens bientôt !</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((d) => (
            <Link key={d.slug} href={`/dr/${d.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
                {d.photoUrl ? (
                  <img src={d.photoUrl} alt={d.fullName} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>👩🏾‍⚕️</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                    Dr {d.fullName.replace(/^dr\.?\s*/i, "")}
                    {d.certified && <span title="Certifié GlowScan" style={{ color: "#7c3aed", fontSize: 13 }}>✦</span>}
                  </p>
                  <p style={{ fontSize: 11.5, color: "#6b7280", margin: "2px 0 0" }}>
                    {d.city ? `${d.city} · ` : ""}{d.available ? <span style={{ color: "#059669" }}>🟢 Disponible</span> : <span style={{ color: "#dc2626" }}>🔴 Indisponible</span>}
                  </p>
                  {d.specialties.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                      {d.specialties.slice(0, 3).map((s) => (
                        <span key={s} style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "rgba(124,58,237,0.08)", borderRadius: 9999, padding: "2px 8px" }}>{specLabel(s)}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", margin: 0 }}>{d.price.toLocaleString("fr-FR")}</p>
                  <p style={{ fontSize: 9, color: "#9ca3af", margin: 0 }}>FCFA</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 9999, cursor: "pointer", whiteSpace: "nowrap",
    background: active ? "#7c3aed" : "#fff", color: active ? "#fff" : "#4b5563", border: `1px solid ${active ? "#7c3aed" : "rgba(0,0,0,0.1)"}`,
  };
}
