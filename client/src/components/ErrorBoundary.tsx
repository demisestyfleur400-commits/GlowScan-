import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import * as Sentry from "@sentry/react";
import { isChunkLoadError, reloadForNewVersion } from "@/lib/chunkReload";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Nouvelle version du site déployée pendant que la page était ouverte : on recharge, sans écran d'erreur.
    if (isChunkLoadError(error) && reloadForNewVersion()) return;
    console.error("[GlowScan] Erreur critique:", error.message, info.componentStack);

    // 🔴 SENTRY : Envoyer l'erreur à Sentry pour monitoring en temps réel
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
      level: "error",
    });

    this.setState({ errorInfo: info.componentStack ?? "" });
  }

  handleReload = () => {
    // Retenter la même page, pas l'accueil
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, showDetails: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Couleurs de l'espace visité : espace médical (Derm) ou appli patient.
      const path = typeof window !== "undefined" ? window.location.pathname : "/";
      const derm = path.startsWith("/derm");
      const c = derm
        ? { bg: "#f3f6f3", card: "#ffffff", text: "#17392c", muted: "#66766f", btn: "#2a6b4f", soft: "#eef4e8", line: "#e4e8e3", font: "'DM Sans', system-ui, sans-serif" }
        : { bg: "#f8f8f6", card: "#ffffff", text: "#17392c", muted: "#5f6f69", btn: "#164034", soft: "#e7eedc", line: "#e3e8e2", font: "'DM Sans', system-ui, sans-serif" };
      const home = derm ? "/derm/dashboard" : "/";
      return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-auto p-5" style={{ background: c.bg, fontFamily: c.font, color: c.text }}>
          <div className="flex w-full max-w-[420px] flex-col items-center text-center" style={{ gap: 14, padding: "32px 24px", borderRadius: 18, background: c.card, border: `1px solid ${c.line}` }}>
            <span className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, background: c.soft, color: c.btn }}>
              <AlertCircle className="h-6 w-6" />
            </span>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: -.3, fontFamily: "Manrope, 'DM Sans', system-ui, sans-serif", color: c.text }}>Cette page n'a pas pu s'afficher.</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: c.muted }}>
              Un problème d'affichage est survenu. Vos données sont conservées : actualisez la page, cela suffit le plus souvent.
            </p>
            <button onClick={this.handleReload} data-testid="button-error-reload"
              className="flex w-full items-center justify-center gap-2 border-0 text-white"
              style={{ padding: "14px 18px", borderRadius: 12, background: c.btn, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              <RefreshCw className="h-4 w-4" /> Actualiser la page
            </button>
            <a href={home} style={{ fontSize: 14, fontWeight: 600, color: c.btn, textDecoration: "none" }}>Retour à l'accueil</a>

            {this.state.error && (
              <div className="w-full" style={{ marginTop: 8, borderTop: `1px solid ${c.line}`, paddingTop: 12 }}>
                <button
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  className="cursor-pointer border-0 bg-transparent"
                  style={{ fontSize: 12, color: c.muted }}
                >
                  {this.state.showDetails ? "Masquer les détails techniques" : "Détails techniques (pour le support)"}
                </button>
                {this.state.showDetails && (
                  <pre
                    className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words text-left"
                    style={{ fontSize: 10, padding: 12, borderRadius: 10, background: c.soft, color: c.muted }}
                    data-testid="text-error-details"
                  >
                    {this.state.error.message}
                    {"\n\n"}
                    {this.state.error.stack}
                    {"\n\n"}
                    {this.state.errorInfo}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
