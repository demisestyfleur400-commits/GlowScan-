import { useRoute } from "wouter";
import { DermShell } from "@/components/derm/DermShell";
import { CompteRenduFlow } from "@/components/derm/CompteRenduFlow";

// Compte rendu d'un patient (Dossiers médicaux · D2). Le contenu est partagé
// avec l'étape 5 de la Nouvelle consultation (D3).
export default function DermCompteRendu() {
  const [, params] = useRoute("/derm/dossiers/:id/compte-rendu");
  return (
    <DermShell active="dossiers" showBack>
      <CompteRenduFlow pid={Number(params?.id)} />
    </DermShell>
  );
}
