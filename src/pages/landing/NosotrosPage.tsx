import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Link } from '@/lib/router';
import { ChevronRight, ArrowRight, Target, Award, HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';

const timeline = [
  { year: '2020', title: 'Fundación', desc: 'Nacimiento de MLM 360 en Lima' },
  { year: '2021', title: 'Expansión', desc: '1,000 afiliados en 3 regiones' },
  { year: '2022', title: 'Plataforma', desc: 'App con árbol genealógico real' },
  { year: '2023', title: 'Consolidación', desc: '8,000+ afiliados, S/ 1M pagado' },
  { year: '2024', title: 'Latinoamérica', desc: 'Presencia en 8 países' },
];

const team = [
  { name: 'Gustavo Ortiz', role: 'CEO', img: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'María González', role: 'Dir. Comercial', img: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'Carlos Torres', role: 'CTO', img: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'Ana Ríos', role: 'Dir. Operaciones', img: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200' },
];

export default function NosotrosPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Inicio</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">Nosotros</span>
            </nav>
          </div>
        </div>

        {/* Hero Grid */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
              {/* Left: Info */}
              <div className="lg:col-span-3 space-y-6">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                  Desde 2020
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Somos MLM 360
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Plataforma MLM peruana que democratiza el marketing multinivel. Más de 12,000 afiliados construyendo su futuro financiero.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to="/planes" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition">
                    Ver planes <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/contacto" className="px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition">
                    Contacto
                  </Link>
                </div>
              </div>

              {/* Right: Stats grid */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                {[
                  { value: '12K+', label: 'Afiliados' },
                  { value: 'S/ 2.8M', label: 'Pagado' },
                  { value: '8', label: 'Países' },
                  { value: '99.9%', label: 'Uptime' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-muted/50 rounded-xl p-5 text-center">
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values — 3 column grid */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Target, title: 'Misión', desc: 'Empoderar emprendedores con herramientas MLM de clase mundial.' },
                { icon: Award, title: 'Visión', desc: 'Liderar el MLM en Latinoamérica con tecnología e innovación.' },
                { icon: HeartHandshake, title: 'Valores', desc: 'Transparencia, integridad y compromiso con cada afiliado.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-card border border-border rounded-xl p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Timeline — compact horizontal on desktop */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="text-xl font-bold text-foreground mb-8">Nuestra historia</h2>
            <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {timeline.map((item, idx) => (
                <div key={item.year} className="relative">
                  <div className={cn(
                    'text-sm font-bold mb-2',
                    idx === timeline.length - 1 ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {item.year}
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="font-medium text-foreground text-sm mb-1">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team — compact grid */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="text-xl font-bold text-foreground mb-8">Equipo directivo</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {team.map((member) => (
                <div key={member.name} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
                  <img src={member.img} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{member.name}</div>
                    <div className="text-xs text-primary truncate">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h2 className="text-xl font-bold text-foreground mb-4">¿Listo para empezar?</h2>
            <Link to="/registro" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition">
              Crear cuenta gratis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
