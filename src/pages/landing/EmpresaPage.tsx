import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Shield, Globe, Users, TrendingUp, Award, Zap } from 'lucide-react';

export default function EmpresaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-primary text-sm font-semibold uppercase tracking-wide">Sobre la empresa</span>
                <h1 className="text-5xl font-bold text-foreground mt-3 mb-6">MLM 360 — Construimos el futuro del networking</h1>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  Somos una empresa peruana de tecnología especializada en soluciones para el marketing multinivel. Desde 2020, hemos ayudado a miles de emprendedores a construir negocios sólidos y rentables.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Nuestra plataforma combina tecnología de punta con un modelo de compensación transparente y justo, diseñado para maximizar los ingresos de nuestros afiliados en todos los niveles.
                </p>
              </div>
              <div className="relative">
                <img src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Empresa" className="rounded-2xl w-full object-cover h-80" />
              </div>
            </div>

            <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { icon: Users, title: '12,540+ Afiliados', desc: 'Red activa en todo el Perú', color: 'bg-blue-500/10 text-blue-500' },
                { icon: TrendingUp, title: 'S/ 2.8M+ Pagados', desc: 'En comisiones a nuestros afiliados', color: 'bg-green-500/10 text-green-500' },
                { icon: Globe, title: '8 Países', desc: 'Presencia en Latinoamérica', color: 'bg-purple-500/10 text-purple-500' },
                { icon: Award, title: '6 Rangos', desc: 'De Bronce a Corona', color: 'bg-yellow-500/10 text-yellow-500' },
                { icon: Shield, title: 'ISO 27001', desc: 'Certificación en seguridad', color: 'bg-red-500/10 text-red-500' },
                { icon: Zap, title: '99.9% Uptime', desc: 'Disponibilidad garantizada', color: 'bg-cyan-500/10 text-cyan-500' },
              ].map(item => (
                <div key={item.title} className="bg-card border border-border rounded-2xl p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      <Footer />
    </div>
  );
}
