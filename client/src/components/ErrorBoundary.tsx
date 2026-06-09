import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

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
    console.error("[GlowScan] Erreur critique:", error.message, info.componentStack);
    this.setState({ errorInfo: info.componentStack ?? "" });
  }

  handleReload = () => {
    // Retenter la même page, pas l'accueil
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, showDetails: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center z-[999]"
          style={{ background: "#0d0a0e", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          {/* Glow orb */}
          <div
            className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px]"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)" }}
          />

          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(233,30,140,0.1)", border: "1px solid rgba(233,30,140,0.25)" }}
          >
            <AlertCircle className="w-7 h-7" style={{ color: "#f9a8d4" }} />
          </div>

          <h2 className="text-base font-extrabold mb-2" style={{ color: "#f3f0ff" }}>
            Mise à jour de l'interface…
          </h2>
          <p className="text-xs font-medium mb-6 max-w-xs leading-relaxed" style={{ color: "rgba(200,185,255,0.65)" }}>
            Une petite perturbation est survenue sur le serveur de diagnostic GlowScan. Pas de panique, ta routine et tes photos sont en parfaite sécurité.
          </p>

          <button
            onClick={this.handleReload}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-xs font-extrabold text-white active:scale-[0.98] transition-all"
            style={{ background: "#7c3aed" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser GlowScan
          </button>

          {this.state.error && (
            <div className="mt-12 w-full max-w-xs" style={{ opacity: 0.4 }}>
              <button
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                className="text-[10px] font-bold uppercase tracking-widest underline cursor-pointer"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {this.state.showDetails ? "Masquer le rapport" : "Rapport de maintenance"}
              </button>

              {this.state.showDetails && (
                <pre
                  className="mt-3 text-[9px] text-left overflow-auto max-h-40 whitespace-pre-wrap break-words rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(200,185,255,0.65)" }}
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
      );
    }
    return this.props.children;
  }
}
