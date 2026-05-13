import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-secondary/30">
      <div className="flex flex-col items-center text-center p-8 bg-white rounded-3xl shadow-xl border border-border max-w-md mx-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl font-semibold mb-2">Page Not Found</p>
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>

        <Link href="/">
          <a className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
            Return to Home
          </a>
        </Link>
      </div>
    </div>
  );
}
