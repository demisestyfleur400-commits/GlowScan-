import { Link } from "wouter";
import { ShieldAlert, Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 font-sans selection:bg-slate-950 selection:text-white">
      <div className="flex flex-col items-center text-center p-8 bg-white rounded-3xl shadow-xs border border-slate-200 max-w-md mx-4 transition-all">
        
        {/* Indicateur Technique d'Anomalie */}
        <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center mb-6 text-white border border-slate-900 shadow-md">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
        </div>
        
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">404</h1>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5 justify-center">
          <Terminal className="w-3 h-3 text-emerald-500" /> Anomalie de Routage
        </p>
        
        <p className="text-xs font-semibold text-slate-500 max-w-[280px] leading-relaxed mb-8">
          La ressource demandée est introuvable, hors ligne ou a été déplacée durant la mise à jour des modules.
        </p>

        {/* Bouton de retour clinique */}
        <Link href="/">
          <a className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest shadow-md hover:bg-slate-900 active:scale-[0.98] transition-all">
            Réinitialiser l'interface
          </a>
        </Link>
      </div>
    </div>
  );
}
