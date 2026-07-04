import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Target, Award, TrendingUp } from 'lucide-react';

const team = [
  { name: 'Gustavo Ortiz', role: 'CEO & Fundador', img: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'María González', role: 'Directora Comercial', img: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'Carlos Torres', role: 'CTO', img: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'Ana Ríos', role: 'Directora de Operaciones', img: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200' },
];

const values = [
  { icon: Target, title: 'Misión', desc: 'Empoderar a emprendedores peruanos con las mejores herramientas de MLM para construir negocios sostenibles y rentables.' },
  { icon: Award, title: 'Visión', desc: 'Ser la plataforma MLM líder en Latinoamérica, reconocida por su innovación tecnológica y el éxito de sus afiliados.' },
  { icon: TrendingUp, title: 'Valores', desc: 'Transparencia, integridad, innovación y compromiso con el crecimiento personal y profesional de cada afiliado.' },
];

const timeline = [
  { year: '2020', label: 'Fundación', desc: 'MLM 360 nace con la visión de democratizar el marketing multinivel en el Perú.' },
  { year: '2021', label: 'Expansión', desc: 'Llegamos a 1,000 afiliados y expandimos operaciones a 3 regiones del país.' },
  { year: '2022', label: 'Lanzamiento', desc: 'Lanzamiento de la plataforma digital con árbol genealógico en tiempo real.' },
  { year: '2023', label: 'Crecimiento', desc: 'Superamos los 8,000 afiliados activos y S/ 1M en comisiones pagadas.' },
  { year: '2024', label: 'Proyección', desc: 'Expansión internacional y lanzamiento de la nueva versión 2.0 del sistema.' },
];

export default function NosotrosPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        {/* Hero */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-foreground mb-6">Somos MLM 360</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Una empresa peruana fundada en 2020 con la misión de transformar la vida financiera de miles de emprendedores a través del poder del marketing multinivel.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map(v => (
                <div key={v.title} className="bg-card border border-border rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <v.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{v.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-foreground text-center mb-14">Nuestra Historia</h2>
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-8">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-8 relative">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0 relative z-10">
                      <span className="text-white font-bold text-sm">{item.year}</span>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 flex-1">
                      <div className="font-bold text-foreground mb-1">{item.label}</div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-foreground text-center mb-14">Nuestro Equipo</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {team.map(member => (
                <div key={member.name} className="text-center">
                  <img src={member.img} alt={member.name} className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4" />
                  <h4 className="font-bold text-foreground">{member.name}</h4>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
