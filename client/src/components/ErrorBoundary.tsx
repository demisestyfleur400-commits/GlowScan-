import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GlowScan] Erreur critique:", error.message, info.componentStack);
    this.setState({ errorInfo: info.componentStack ?? "" });
  }

  handleReload = () => {
    // Clear the error state first, then navigate to home
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-4">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Oups, un problème est survenu</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            L'application a rencontré une erreur inattendue. Appuie sur le bouton ci-dessous pour revenir à l'accueil.
          </p>
          {this.state.error && (
            <details open className="mb-4 text-left w-full max-w-sm">
              <summary className="text-xs text-gray-400 cursor-pointer">Détails de l'erreur</summary>
              <pre className="mt-2 text-[10px] text-red-600 bg-red-50 rounded-lg p-3 overflow-auto max-h-60 whitespace-pre-wrap break-words" data-testid="text-error-details">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
                {"\n\n"}
                {this.state.errorInfo}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-pink-500 text-white rounded-xl font-semibold text-sm active:scale-95 transition-all"
          >
            Retour à l'accueil
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
