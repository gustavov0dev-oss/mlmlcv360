import { useState } from 'react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Mail, Phone, Clock, MapPin, Send, CircleCheck as CheckCircle } from 'lucide-react';
import { Link } from '@/lib/router';
import { toast } from 'sonner';
import { useConfig } from '@/store/configStore';
import { ChevronRight } from 'lucide-react';

export default function ContactoPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const { company } = useConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Mensaje enviado.');
    setSent(true);
    setLoading(false);
  };

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
              <span className="text-foreground font-medium">Contacto</span>
            </nav>
          </div>
        </div>

        {/* Main Grid */}
        <section className="py-10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold text-foreground mb-2">Contacto</h1>
                <p className="text-muted-foreground mb-8">Respuesta en menos de 24 horas.</p>

                {sent ? (
                  <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-7 h-7 text-green-500" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground mb-2">Mensaje enviado</h2>
                    <p className="text-sm text-muted-foreground mb-4">Te responderemos pronto.</p>
                    <button onClick={() => { setSent(false); setForm({ name: '', email: '', message: '' }); }} className="text-primary text-sm font-medium">
                      Enviar otro
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                          placeholder="Tu nombre"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Mensaje</label>
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
                        placeholder="¿En qué podemos ayudarte?"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Enviar mensaje
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Info Sidebar */}
              <div className="space-y-4">
                {[
                  { icon: Mail, label: 'Email', value: company.company_email || 'contacto@mlm360.pe', href: 'mailto:' },
                  { icon: Phone, label: 'Teléfono', value: company.company_phone || '+51 1 234-5678', href: 'tel:' },
                  { icon: Clock, label: 'Horario', value: 'Lun-Vie 9am-6pm' },
                  { icon: MapPin, label: 'Dirección', value: company.company_address || 'San Isidro, Lima' },
                ].map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="text-sm font-medium text-foreground">{item.value}</div>
                      </div>
                    </div>
                  );

                  return item.href ? (
                    <a key={item.label} href={item.href + item.value}>{content}</a>
                  ) : (
                    <div key={item.label}>{content}</div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=-77.0432%2C-12.1097%2C-77.0232%2C-12.0897&layer=mapnik&marker=-12.0997%2C-77.0332"
                className="w-full h-64 border-0"
                title="Ubicación MLM 360"
                loading="lazy"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
