import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";

// Page profil public dermatologue — /dr/:slug. Sans auth, indexable Google.
interface Derm {
  id: number; slug: string; fullName: string; cabinet?: string; city?: string;
  bio?: string | null; specialties: string[]; photoUrl?: string | null; whatsapp?: string | null;
  certified: boolean; available: boolean; price: number; memberSince?: string;
  totalConsultations: number; rating: number; ratingsCount: number;
}
interface Review { rating: number; comment?: string | null; date?: string; firstName: string; }

const SPECIALTY_LABELS: Record<string, string> = {
  acne: "Acné", taches: "Taches", hyperpigmentation: "Hyperpigmentation", cheloides: "Chéloïdes",
  eczema: "Eczéma", cheveux: "Cheveux & cuir chevelu", peaux_melanisees: "Peaux mélanisées",
  anti_age: "Anti-âge", pediatrie: "Dermatologie pédiatrique", esthetique: "Dermatologie esthétique",
};
const specLabel = (s: string) => SPECIALTY_LABELS[s] || s.replace(/_/g, " ");

function Stars({ n }: { n: number }) {
  const full = Math.round(n);
  return <span style={{ color: "#f59e0b", letterSpacing: 1 }}>{"★".repeat(full)}{"☆".repeat(Math.max(0, 5 - full))}</span>;
}

export default function DermPublicProfile() {
  const [, params] = useRoute("/dr/:slug");
  const slug = params?.slug || "";
  const [d, setD] = useState<Derm | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useSEO({
    title: d ? `Dr ${d.fullName} — Dermatologue ${d.city || ""} | GlowScan` : "Dermatologue | GlowScan",
    description: d ? `${d.bio || `Consultez Dr ${d.fullName}, dermatologue${d.certified ? " certifié GlowScan" : ""} à ${d.city || ""}.`} Consultation en ligne dès ${d.price} FCFA.` : "Profil dermatologue GlowScan.",
    canonical: `https://glow-scan.com/dr/${slug}`,
  });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/public/dermatologues/${slug}`).then((r) => r.ok ? r.json() : null)
      .then((j) => setD(j?.dermatologue || null)).catch(() => setD(null)).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/dermatologues/${slug}/ratings?page=${page}`).then((r) => r.json())
      .then((j) => { setReviews((prev) => page === 0 ? (j.ratings || []) : [...prev, ...(j.ratings || [])]); setHasMore(!!j.hasMore); })
      .catch(() => {});
  }, [slug, page]);

  if (loading) return <div style={{ minHeight: "100vh", background: "#f6f7fb", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Chargement…</div>;
  if (!d) return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 40 }}>🔍</div>
      <p style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Profil introuvable</p>
      <Link href="/" style={{ color: "#7c3aed", fontWeight: 700, fontSize: 13 }}>Retour à GlowScan</Link>
    </div>
  );

  const waNumber = (d.whatsapp || "").replace(/[^0-9]/g, "");
  const memberSince = d.memberSince ? new Date(d.memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", fontFamily: '-apple-system, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 0 80px" }}>
        {/* Bandeau */}
        <div style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", height: 110 }} />
        <div style={{ padding: "0 18px", marginTop: -54 }}>
          {/* Header carte */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {d.photoUrl ? (
                <img src={d.photoUrl} alt={d.fullName} style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 76, height: 76, borderRadius: "50%", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, flexShrink: 0 }}>👩🏾‍⚕️</div>
              )}
              <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", margin: 0 }}>Dr {d.fullName.replace(/^dr\.?\s*/i, "")}</h1>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>Dermatologie{d.city ? ` · ${d.city}` : ""} 🇨🇲</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.available ? "#059669" : "#dc2626" }}>
                    {d.available ? "🟢 Disponible" : "🔴 Indisponible"}
                  </span>
                </div>
              </div>
            </div>

            {d.certified && (
              <div style={{ marginTop: 14, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "10px 12px" }}>
                <p style={{ fontSize: 12.5, fontWeight: 800, color: "#7c3aed", margin: 0 }}>✦ Dermatologue Certifié GlowScan</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Spécialiste Peaux Africaines (Fitzpatrick IV–VI)</p>
              </div>
            )}

            {d.bio && <p style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.6, margin: "14px 0 0" }}>{d.bio}</p>}
          </div>

          {/* Stats publiques */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
            {[
              { v: String(d.totalConsultations), l: "Patients consultés" },
              { v: d.ratingsCount > 0 ? `${d.rating}/5` : "—", l: `${d.ratingsCount} avis` },
              { v: memberSince || "—", l: "Membre depuis" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 900, color: "#1a1a2e", margin: 0 }}>{s.v}</p>
                <p style={{ fontSize: 9.5, color: "#9ca3af", margin: "2px 0 0" }}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* Spécialités */}
          {d.specialties.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Spécialités</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {d.specialties.map((s) => (
                  <span key={s} style={{ fontSize: 11.5, fontWeight: 700, color: "#7c3aed", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 9999, padding: "5px 11px" }}>{specLabel(s)}</span>
                ))}
              </div>
            </div>
          )}

          {/* Avis */}
          {reviews.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 10px" }}>Avis patients</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reviews.map((r, i) => (
                  <div key={i} style={{ borderBottom: i < reviews.length - 1 ? "1px solid #f0f0f5" : "none", paddingBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#1a1a2e" }}>{r.firstName}</span>
                      <Stars n={r.rating} />
                    </div>
                    {r.comment && <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5, margin: "4px 0 0" }}>{r.comment}</p>}
                    {r.date && <p style={{ fontSize: 10, color: "#9ca3af", margin: "3px 0 0" }}>{new Date(r.date).toLocaleDateString("fr-FR")}</p>}
                  </div>
                ))}
              </div>
              {hasMore && (
                <button onClick={() => setPage((p) => p + 1)} style={{ marginTop: 10, background: "transparent", border: "none", color: "#7c3aed", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Voir plus d'avis →</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA fixe en bas */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid rgba(0,0,0,0.08)", padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", display: "flex", gap: 10, maxWidth: 560, margin: "0 auto" }}>
        <Link href="/analyze" style={{ flex: 1, textAlign: "center", background: "#7c3aed", color: "#fff", borderRadius: 9999, padding: "13px", fontSize: 13.5, fontWeight: 800, textDecoration: "none" }}>
          Consulter en ligne — {d.price.toLocaleString("fr-FR")} FCFA
        </Link>
        {waNumber && (
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, background: "#25D366", color: "#fff", borderRadius: 9999, padding: "13px 16px", fontSize: 13.5, fontWeight: 800, textDecoration: "none" }}>
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
