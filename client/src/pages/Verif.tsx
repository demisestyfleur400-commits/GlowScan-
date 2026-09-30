import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════
// Vérification publique d'une ordonnance (étape 9a). Le pharmacien scanne le
// QR code ou saisit la référence : médecin, date et statut. Aucune donnée de
// santé, aucun nom de patient.
// ════════════════════════════════════════════════════════════════════════

type Result = {
  ref: string; kind: "ordonnance" | "compte_rendu"; status: "valide" | "annulee" | "signe";
  signedAt: string | null; revokedAt: string | null;
  doctor: { name: string; specialty: string; onmc: string | null; cabinet: string | null; city: string | null };
};

const STATUS: Record<Result["status"], { label: string; tone: string }> = {
  valide: { label: "Ordonnance authentique et valide", tone: "bg-organic-accent-2-100 text-organic-accent-2-900" },
  annulee: { label: "Ordonnance annulée par le médecin", tone: "bg-organic-accent-100 text-organic-accent-900" },
  signe: { label: "Compte rendu authentique", tone: "bg-organic-accent-2-100 text-organic-accent-2-900" },
};
const when = (v: string | null) => (v ? new Date(v).toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" }) : "");

export default function Verif() {
  const [, params] = useRoute("/verif/:ref");
  const [, navigate] = useLocation();
  const ref = params?.ref ? decodeURIComponent(params.ref).toUpperCase() : "";
  const [input, setInput] = useState(ref);
  const [state, setState] = useState<{ loading: boolean; result: Result | null; notFound: boolean }>({ loading: false, result: null, notFound: false });

  useEffect(() => {
    setInput(ref);
    if (!ref) { setState({ loading: false, result: null, notFound: false }); return; }
    setState({ loading: true, result: null, notFound: false });
    fetch(`/api/verif/${encodeURIComponent(ref)}`)
      .then(async (r) => (r.ok ? setState({ loading: false, result: await r.json(), notFound: false }) : setState({ loading: false, result: null, notFound: true })))
      .catch(() => setState({ loading: false, result: null, notFound: true }));
  }, [ref]);

  const r = state.result;
  return (
    <main className="min-h-screen bg-organic-bg px-4 py-10 font-body text-organic-text">
      <div className="mx-auto flex max-w-[560px] flex-col gap-organic-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">GlowScan Derm</span>
          <h1 className="m-0 text-[clamp(28px,6vw,38px)]">Vérifier une ordonnance</h1>
          <p className="m-0 text-[14px] text-organic-neutral-800">Saisissez la référence imprimée sous le QR code (par exemple GS-ORD-00012).</p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = input.trim().toUpperCase(); if (v) navigate(`/verif/${encodeURIComponent(v)}`); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="GS-ORD-00000" aria-label="Référence"
            className="box-border h-12 min-w-0 flex-1 rounded-pill border border-organic-divider bg-organic-surface px-4 font-body text-[16px] uppercase outline-none focus:border-organic-accent" data-testid="verif-input" />
          <Button type="submit" className="h-12">Vérifier</Button>
        </form>

        {state.loading && <span className="text-[14px] text-organic-neutral-700">Vérification…</span>}
        {state.notFound && (
          <div role="alert" className="rounded-card bg-organic-accent-100 p-organic-4 text-[14px] font-semibold text-organic-accent-900">
            Référence inconnue. Vérifiez la saisie ; si elle est exacte, ce document n'a pas été émis par GlowScan.
          </div>
        )}
        {r && (
          <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-6" data-testid="verif-result">
            <span className={`self-start rounded-pill px-3.5 py-1.5 text-[13px] font-bold ${STATUS[r.status].tone}`}>{STATUS[r.status].label}</span>
            <span className="font-heading text-[22px]">{r.ref}</span>
            <div className="flex flex-col gap-1 text-[14px]">
              <span><b>Médecin :</b> {r.doctor.name}</span>
              <span><b>Spécialité :</b> {r.doctor.specialty}</span>
              {r.doctor.onmc && <span><b>N° ONMC :</b> {r.doctor.onmc}</span>}
              {(r.doctor.cabinet || r.doctor.city) && <span><b>Lieu :</b> {[r.doctor.cabinet, r.doctor.city].filter(Boolean).join(", ")}</span>}
              <span><b>Signée le :</b> {when(r.signedAt)}</span>
              {r.revokedAt && <span><b>Annulée le :</b> {when(r.revokedAt)}</span>}
            </div>
            <span className="text-[12px] text-organic-neutral-700">Pour protéger le patient, cette page n'affiche ni son nom ni le contenu de l'ordonnance. Comparez la référence et le médecin avec le document présenté.</span>
          </div>
        )}
      </div>
    </main>
  );
}
