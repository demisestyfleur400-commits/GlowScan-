import { useState } from "react";

interface Question {
  id: number;
  label: string;
}

interface ConsultationData {
  observations_visuelles: string;
  questions: Question[];
}

export default function ConsultationForm() {
  const [image, setImage] = useState<string>(""); // L'URL ou base64 de la photo de peau
  const [loading, setLoading] = useState<boolean>(false);
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [diagnosticFinal, setDiagnosticFinal] = useState<string>("");

  // Étape 1 : Envoyer la photo pour recevoir le questionnaire sur mesure
  const demarrerConsultation = async () => {
    if (!image) return alert("Veuillez d'abord prendre une photo.");
    setLoading(true);
    try {
      const response = await fetch("/api/generate-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: image }),
      });
      const data = await response.json();
      setConsultation(data);
    } catch (error) {
      console.error("Erreur consultation:", error);
    } finally {
      setLoading(false);
    }
  };

  // Gérer la saisie des réponses par l'utilisateur
  const handleInputChange = (questionId: number, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  // Étape 2 : Envoyer la photo + les réponses pour le diagnostic final
  const soumettreConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ici, on appelle ton ancienne route de diagnostic en lui passant tout
      const response = await fetch("/api/generate-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: image, reponses: answers }),
      });
      const data = await response.json();
      setDiagnosticFinal(data.diagnostic); // Adapter selon la structure de ta route
    } catch (error) {
      console.error("Erreur diagnostic:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center text-indigo-600">Consultation GlowScan AI</h2>

      {/* Zone de capture/affichage de la photo */}
      {!consultation && (
        <div className="text-center">
          {/* Simule une sélection d'image pour l'exemple */}
          <input 
            type="text" 
            placeholder="URL de la photo de peau" 
            className="w-full p-2 border rounded mb-3"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
          <button 
            onClick={demarrerConsultation}
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? "Analyse de la photo en cours..." : "Lancer mon analyse cutanée"}
          </button>
        </div>
      )}

      {/* Formulaire de consultation généré dynamiquement par l'IA */}
      {consultation && !diagnosticFinal && (
        <form onSubmit={soumettreConsultation} className="space-y-4">
          {/* La phrase d'observation personnalisée qui crée la confiance */}
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-indigo-900 text-sm italic">
            <strong>Docteur GlowScan :</strong> "{consultation.observations_visuelles}"
          </div>

          <h3 className="font-semibold text-gray-700">Questions complémentaires :</h3>
          
          {consultation.questions.map((q) => (
            <div key={q.id} className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">{q.label}</label>
              <input
                type="text"
                required
                className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Votre réponse..."
                onChange={(e) => handleInputChange(q.id, e.target.value)}
              />
            </div>
          ))}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Génération du diagnostic..." : "Obtenir mon ordonnance personnalisée"}
          </button>
        </form>
      )}

      {/* Affichage du Diagnostic Final */}
      {diagnosticFinal && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">Votre Diagnostic & Routine :</h3>
          <p className="text-gray-700 whitespace-pre-line">{diagnosticFinal}</p>
        </div>
      )}
    </div>
  );
}
