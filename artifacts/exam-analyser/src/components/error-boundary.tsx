import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  handleRetry = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || "An unexpected error occurred.";
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Loading chunk") ||
        msg.includes("Importing a module script failed");

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold">
                {this.props.fallbackTitle ?? "Something went wrong"}
              </h1>
              {isChunkError ? (
                <p className="text-sm text-muted-foreground">
                  A new version of EduMetrics is available. Reload the page to
                  get the latest update.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This page ran into a problem. Try refreshing — if it keeps
                  happening, go back to the dashboard.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Reload page
              </Button>
              <Button variant="outline" onClick={this.handleHome} className="gap-2">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </div>

            {import.meta.env.DEV && (
              <details className="text-left bg-muted rounded-lg p-4 text-xs font-mono overflow-auto max-h-48">
                <summary className="cursor-pointer font-sans text-sm font-medium mb-2 text-muted-foreground">
                  Error details (dev only)
                </summary>
                <p className="text-destructive font-semibold mb-1">{msg}</p>
                <pre className="whitespace-pre-wrap text-muted-foreground">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
