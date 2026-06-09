import { usePWAInstall } from "@/hooks/use-pwa-install";

// ── Icônes inline SVG (0 dépendance, 0 layout shift) ─────────────────
const ShareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

const ListIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────
// Modale iOS — instructions d'installation Safari
// ─────────────────────────────────────────────────────────────────────
function IOSModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: <ShareIcon />,
      color: "#3b82f6",
      label: "Appuyez sur le bouton Partager",
      sub: "En bas de Safari, dans la barre d'outils",
    },
    {
      icon: <ListIcon />,
      color: "#7c3aed",
      label: "Appuyez sur « Sur l'écran d'accueil »",
      sub: "Faites défiler les options vers le bas",
    },
    {
      icon: <PlusIcon />,
      color: "#16a34a",
      label: "Appuyez sur « Ajouter »",
      sub: "L'icône GlowScan apparaît comme une vraie app",
    },
  ];

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 24px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20,
          padding: 24, width: "100%", maxWidth: 400,
          margin: "0 16px",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/logo-glowscan.jpeg"
              alt="GlowScan"
              width={36} height={36}
              style={{ borderRadius: 8, objectFit: "cover" }}
            />
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>
                Ajouter GlowScan
              </p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>à votre écran d'accueil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f3f4f6", border: "none", borderRadius: "50%",
              width: 30, height: 30, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6b7280",
            }}
          >
            <XIcon />
          </button>
        </div>

        {/* Étapes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              {/* Numéro + icône */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: s.color + "15",
                border: `1px solid ${s.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: s.color,
              }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>
                  {i + 1}. {s.label}
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "13px 0", marginTop: 24,
            background: "#7c3aed", border: "none", borderRadius: 12,
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Bannière principale — fixe en haut, 52px
// ─────────────────────────────────────────────────────────────────────
export default function PWAInstallBanner() {
  const { showBanner, showIOSModal, install, dismiss, closeIOSModal } = usePWAInstall();

  return (
    <>
      {/* Bannière top */}
      {showBanner && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 9000,
            height: 52, background: "#1a1a1a",
            display: "flex", alignItems: "center",
            padding: "0 16px", gap: 10,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          }}
        >
          {/* Icône */}
          <img
            src="/logo-glowscan.jpeg"
            alt="GlowScan"
            width={24} height={24}
            style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
          />

          {/* Texte */}
          <span style={{
            flex: 1, fontSize: 13, fontWeight: 600, color: "#fff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            Installer GlowScan sur votre écran
          </span>

          {/* Bouton Installer */}
          <button
            onClick={install}
            style={{
              flexShrink: 0,
              background: "#7c3aed", border: "none", borderRadius: 8,
              color: "#fff", fontSize: 12, fontWeight: 700,
              padding: "6px 14px", cursor: "pointer",
            }}
          >
            Installer
          </button>

          {/* Bouton fermer */}
          <button
            onClick={dismiss}
            style={{
              flexShrink: 0, background: "none", border: "none",
              color: "rgba(255,255,255,0.45)", cursor: "pointer",
              padding: "4px", display: "flex", alignItems: "center",
              lineHeight: 1,
            }}
            aria-label="Fermer"
          >
            <XIcon />
          </button>
        </div>
      )}

      {/* Modale iOS */}
      {showIOSModal && <IOSModal onClose={closeIOSModal} />}
    </>
  );
}
