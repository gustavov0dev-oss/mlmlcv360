import { Link } from '@/lib/router';
import { Home, Search, ArrowLeft, Compass, Boxes } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-10 bg-primary pointer-events-none" />

      <div className="w-full max-w-xl text-center">
        {/* Brand */}
        <Link to="/" className="inline-flex items-center gap-2 mb-10 group">
          <Boxes className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
          <span className="text-lg font-bold tracking-tight text-foreground">MLM 360</span>
        </Link>

        {/* 404 with floating compass */}
        <div className="relative mx-auto mb-8 w-fit">
          <div className="text-[8rem] sm:text-[10rem] font-bold leading-none tracking-tighter bg-gradient-to-b from-foreground to-foreground/30 bg-clip-text text-transparent select-none">
            404
          </div>
          <div className="absolute -top-2 -right-4 sm:right-2 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-[spin_8s_linear_infinite]">
            <Compass className="w-7 h-7 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Página no encontrada
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-10">
          La página que buscas no existe, fue movida o el enlace es incorrecto.
          Verifica la dirección o regresa al inicio.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" /> Volver al inicio
          </Link>
          <Link
            to="/planes"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border bg-card text-foreground rounded-xl font-medium hover:bg-muted transition-colors"
          >
            <Search className="w-4 h-4" /> Ver planes
          </Link>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a la página anterior
        </Link>
      </div>
    </div>
  );
}
