import { Link } from '@/lib/router';
import { Chrome as Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Página no encontrada</h1>
        <p className="text-muted-foreground mb-6">La página que buscas no existe o ha sido movida.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            <Home className="w-4 h-4" /> Volver al inicio
          </Link>
          <Link to="/planes" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded-xl font-medium hover:bg-muted transition-colors">
            <Search className="w-4 h-4" /> Ver planes
          </Link>
        </div>
      </div>
    </div>
  );
}
