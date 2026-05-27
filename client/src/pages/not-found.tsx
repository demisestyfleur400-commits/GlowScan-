import { Link } from "wouter";
import { ShieldAlert, Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center font-sans" style={{ background: "#0D0A0E" }}>
      {/* Ambient orb */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(233,30,140,0.12) 0%, transparent 70%)" }} />
      </div>

      <div className="flex flex-col items-center text-center p-8 rounded-3xl max-w-md mx-4 relative z-10" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Indicateur Technique d'Anomalie */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)" }}>
          <ShieldAlert className="w-5 h-5" style={{ color: "#f43f5e" }} />
        </div>

        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">404</h1>
        <p className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-1.5 justify-center" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Terminal className="w-3 h-3" style={{ color: "#E91E8C" }} /> Anomalie de Routage
        </p>

        <p className="text-xs font-semibold max-w-[280px] leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
          La ressource demandée est introuvable, hors ligne ou a été déplacée durant la mise à jour des modules.
        </p>

        <Link href="/">
          <a className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-white text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all" style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)", boxShadow: "0 0 20px rgba(233,30,140,0.3)" }}>
            Réinitialiser l'interface
          </a>
        </Link>
      </div>
    </div>
  );
}
