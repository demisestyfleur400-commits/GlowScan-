import ProConnexion from "./ProConnexion";

// Création de compte GlowScan Derm : même page que la connexion (maquette
// « Derm Connexion »), ouverte sur l'onglet « Créer un compte ».
export default function ProInscription() {
  return <ProConnexion initialMode="signup" />;
}
