import { useState } from "react";
import type { ToxicProduct } from "@/lib/toxic-products";

// ════════════════════════════════════════════════════════════════════════
// Bannière d'alerte « produit nocif détecté » — rouge, additionnelle.
// S'affiche en haut du résultat (B2C et DERM). Bouton « En savoir plus » → modale.
// ════════════════════════════════════════════════════════════════════════

export function ToxicAlert({ products, title }: { products: ToxicProduct[]; title?: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!products || products.length === 0) return null;

  return (
    <div
      style={{
        background: "#7f1d1d",
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 6px 20px rgba(127,29,29,0.35)",
      }}
      data-testid="toxic-alert"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", letterSpacing: ".2px" }}>
          {title || "Alerte produit détecté"}
        </span>
      </div>

      {products.map((p, i) => (
        <div key={p.name} style={{ marginTop: i === 0 ? 0 : 12, paddingTop: i === 0 ? 0 : 12, borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.15)" }}>
          <p style={{ fontSize: 13, color: "#fff", lineHeight: 1.6, margin: 0 }}>
            <strong>{p.name}</strong> contient <strong>{p.toxicIngredient}</strong>. {p.effet}.{" "}
            <span style={{ color: "#fecaca" }}>{p.delai}.</span> {p.conseil}
          </p>
          <button
            type="button"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            style={{
              marginTop: 8, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none",
              borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}
          >
            {openIdx === i ? "Masquer" : "En savoir plus"}
          </button>

          {openIdx === i && (
            <div style={{ marginTop: 10, background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: "12px 14px" }}>
              <Detail label="Produit" value={p.name} />
              <Detail label="Substance toxique" value={p.toxicIngredient} />
              <Detail label="Niveau de danger" value={p.dangerLevel === "critical" ? "Critique" : "Modéré"} />
              <Detail label="Effets sur la santé" value={p.effet} />
              <Detail label="Délai de danger" value={p.delai} />
              <Detail label="Conseil" value={p.conseil} />
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 8, lineHeight: 1.5 }}>
                Information de sécurité — ne remplace pas un avis médical. En cas de doute, consulte un dermatologue.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12 }}>
      <span style={{ fontWeight: 800, color: "rgba(255,255,255,0.7)", minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#fff" }}>{value}</span>
    </div>
  );
}
