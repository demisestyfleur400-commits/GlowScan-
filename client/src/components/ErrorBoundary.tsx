import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  showDetails: boolean; // Nouvel état pour cacher le code technique
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
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, showDetails: false });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-center z-[999]">
          {/* Icône d'alerte Premium et douce */}
          <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center mb-5 shadow-sm">
            <AlertCircle className="w-7 h-7 text-pink-600" />
          </div>

          {/* Message de réassurance client */}
          <h2 className="text-base font-black text-gray-950 uppercase tracking-wide mb-2">
            Mise à jour de l'interface...
          </h2>
          <p className="text-xs font-medium text-gray-500 mb-6 max-w-xs leading-relaxed">
            Une petite perturbation est survenue sur le serveur de diagnostic GlowScan. Pas de panique, ta routine et tes photos sont en parfaite sécurité.
          </p>

          {/* Bouton d'action pro style GlowScan */}
          <button
            onClick={this.handleReload}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-[0.98] transition-all shadow-xl shadow-pink-600/10"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            Actualiser GlowScan
          </button>

          {/* Code technique masqué par défaut et rendu très discret */}
          {this.state.error && (
            <div className="mt-12 w-full max-w-xs opacity-40 hover:opacity-100 transition-opacity">
              <button
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest underline cursor-pointer"
              >
                {this.state.showDetails ? "Masquer le rapport de maintenance" : "Rapport de maintenance"}
              </button>

              {this.state.showDetails && (
                <pre className="mt-3 text-[9px] font-mono text-left text-gray-500 bg-gray-100/80 rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words border border-gray-200" data-testid="text-error-details">
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
