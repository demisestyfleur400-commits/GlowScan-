import { Link } from "wouter";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center"
      style={{ background: "#0d0a0e", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
    >
      {/* Glow orb */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[300px] h-[300px]"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)" }}
        />
      </div>

      <div
        className="flex flex-col items-center text-center p-8 rounded-3xl max-w-md mx-4 relative z-10"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
          style={{ background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)" }}
        >
          <ShieldAlert className="w-5 h-5" style={{ color: "#f9a8d4" }} />
        </div>

        <h1 className="text-5xl font-extrabold tracking-tighter mb-2" style={{ color: "#f3f0ff" }}>404</h1>

        <p className="text-[10px] font-extrabold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
          Page introuvable
        </p>

        <p className="text-xs font-medium max-w-[280px] leading-relaxed mb-8" style={{ color: "rgba(200,185,255,0.65)" }}>
          La ressource demandée est introuvable, hors ligne ou a été déplacée.
        </p>

        <Link href="/">
          <a
            className="w-full sm:w-auto px-6 py-3.5 rounded-full text-white text-xs font-extrabold active:scale-[0.98] transition-all"
            style={{ background: "#7c3aed" }}
          >
            Retour à l'accueil
          </a>
        </Link>
      </div>
    </div>
  );
}
