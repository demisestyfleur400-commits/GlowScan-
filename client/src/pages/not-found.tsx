import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";

// ── Délai avant retry (ms) ──────────────────────────────────────────
const RETRY_DELAYS = [3000, 5000, 8000]; // 3 tentatives automatiques

export default function NotFound() {
  const [location] = useLocation();
  const [attempt, setAttempt] = useState(0);       // numéro de tentative en cours
  const [retrying, setRetrying] = useState(false);  // spinner actif
  const [countdown, setCountdown] = useState(0);    // compte à rebours affiché
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-retry silencieux ─────────────────────────────────────────
  useEffect(() => {
    if (attempt >= RETRY_DELAYS.length) return; // max tentatives atteint

    const delay = RETRY_DELAYS[attempt];
    let remaining = Math.round(delay / 1000);
    setCountdown(remaining);

    // Compte à rebours visible
    countRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(countRef.current!);
    }, 1000);

    // Tentative de reload après le délai
    timerRef.current = setTimeout(() => {
      setRetrying(true);
      // On vérifie si la ressource répond maintenant
      fetch(location, { method: "HEAD" })
        .then(r => {
          if (r.ok || r.status !== 404) {
            // La page existe maintenant → reload transparent
            window.location.reload();
          } else {
            // Toujours 404 → prochaine tentative
            setRetrying(false);
            setAttempt(a => a + 1);
          }
        })
        .catch(() => {
          setRetrying(false);
          setAttempt(a => a + 1);
        });
    }, delay);

    return () => {
      clearTimeout(timerRef.current!);
      clearInterval(countRef.current!);
    };
  }, [attempt]);

  const handleManualRetry = () => {
    clearTimeout(timerRef.current!);
    clearInterval(countRef.current!);
    setRetrying(true);
    fetch(location, { method: "HEAD" })
      .then(r => {
        if (r.ok || r.status !== 404) {
          window.location.reload();
        } else {
          setRetrying(false);
          setAttempt(a => a + 1);
        }
      })
      .catch(() => {
        setRetrying(false);
        setAttempt(a => a + 1);
      });
  };

  const maxReached = attempt >= RETRY_DELAYS.length && !retrying;

  return (
    <div
      style={{
        minHeight: "100vh", width: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0d0a0e",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        padding: "24px",
      }}
    >
      {/* Glow orb */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: 300, height: 300,
          background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }} />
      </div>

      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 28, padding: "36px 32px", maxWidth: 380, width: "100%",
        textAlign: "center", position: "relative", zIndex: 10,
      }}>
        {/* Icône animée */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: retrying ? "rgba(124,58,237,0.12)" : "rgba(245,158,11,0.08)",
          border: `1px solid ${retrying ? "rgba(124,58,237,0.3)" : "rgba(245,158,11,0.25)"}`,
          transition: "all 0.3s ease",
        }}>
          {retrying ? (
            <span style={{
              display: "inline-block", fontSize: 24,
              animation: "spin 1s linear infinite",
            }}>⟳</span>
          ) : (
            <span style={{ fontSize: 24 }}>⚠️</span>
          )}
        </div>

        {/* Titre — jamais "404" */}
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f3f0ff", marginBottom: 8, lineHeight: 1.3 }}>
          {retrying ? "Chargement en cours…" : "Une erreur est survenue"}
        </h1>

        <p style={{ fontSize: 13, color: "rgba(200,185,255,0.65)", lineHeight: 1.6, marginBottom: 24 }}>
          {retrying
            ? "On essaie de charger la page pour vous, merci de patienter."
            : maxReached
            ? "La page ne répond pas. Vérifiez votre connexion puis réessayez."
            : `Nouvelle tentative automatique dans ${countdown}s…`
          }
        </p>

        {/* Barre de progression tentatives */}
        {!maxReached && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              {RETRY_DELAYS.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 9999,
                  margin: "0 2px",
                  background: i < attempt
                    ? "rgba(124,58,237,0.6)"
                    : i === attempt
                    ? retrying ? "#7c3aed" : "rgba(167,139,250,0.3)"
                    : "rgba(255,255,255,0.08)",
                  transition: "background 0.4s ease",
                }} />
              ))}
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
              Tentative {Math.min(attempt + 1, RETRY_DELAYS.length)}/{RETRY_DELAYS.length}
            </p>
          </div>
        )}

        {/* Bouton réessayer manuel */}
        <button
          onClick={handleManualRetry}
          disabled={retrying}
          style={{
            width: "100%", padding: "13px 0",
            borderRadius: 9999, border: "none",
            background: retrying ? "rgba(124,58,237,0.4)" : "#7c3aed",
            color: "#fff", fontSize: 14, fontWeight: 800,
            cursor: retrying ? "not-allowed" : "pointer",
            transition: "all 0.2s ease", marginBottom: 12,
          }}
        >
          {retrying ? "Chargement…" : "Réessayer maintenant"}
        </button>

        {/* Lien retour discret — secondaire, pas mis en avant */}
        <button
          onClick={() => window.history.back()}
          style={{
            background: "none", border: "none",
            color: "rgba(255,255,255,0.25)", fontSize: 12,
            cursor: "pointer", textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          Retourner à la page précédente
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
