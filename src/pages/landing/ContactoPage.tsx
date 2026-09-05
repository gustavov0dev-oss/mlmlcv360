import { useState } from 'react';
import { Mail, MapPin, Send, CircleCheck as CheckCircle, ChevronDown, Zap, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';

export default function ContactoPage() {
  const { company } = useConfig();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const companyName = company.company_name || 'MLM 360';
  const companyEmail = company.company_email || 'contacto@mlm360.pe';
  const companyPhone = company.company_phone || '';
  const companyAddress = company.company_address || '';
  const tagline = company.company_tagline || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Completa los campos requeridos');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
    toast.success('Mensaje enviado correctamente');
  };

  const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '');

  const channels = [
    ...(companyEmail ? [{ icon: Mail, label: 'Email', value: companyEmail, href: `mailto:${companyEmail}` }] : []),
    ...(companyPhone ? [{ icon: Phone, label: 'Teléfono', value: companyPhone, href: `tel:${cleanPhone(companyPhone)}` }] : []),
    ...(companyAddress ? [{ icon: MapPin, label: 'Dirección', value: companyAddress, href: '#mapa' }] : []),
  ];

  const faqs = [
    { q: `¿Cómo creo una cuenta en ${companyName}?`, a: 'Ve a la página de registro, completa tus datos y recibirás acceso inmediato al dashboard. No necesitas tarjeta de crédito.' },
    { q: '¿Cuánto tardan en acreditarse las comisiones?', a: 'Las comisiones se acreditan en menos de 60 segundos después de cada venta. Puedes verlas en tiempo real en tu dashboard.' },
    { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos Yape, Plin, tarjetas de crédito y transferencias bancarias. Para retiros, puedes usar Yape, Plin o transferencia bancaria.' },
    { q: '¿Puedo usar la plataforma desde mi celular?', a: 'Sí, la plataforma es 100% responsive. Puedes gestionar tu red, ver comisiones y realizar todas las operaciones desde tu móvil.' },
    { q: '¿Cómo contacto a soporte?', a: 'Puedes escribirnos por email o mediante el formulario de esta página. Respondemos en menos de 24 horas.' },
    { q: '¿Hay algún costo de permanencia?', a: 'No. Puedes empezar con una cuenta gratuita y escalar cuando tu negocio lo necesite. Sin contratos de permanencia.' },
  ];

  const faqLeft = faqs.slice(0, Math.ceil(faqs.length / 2));
  const faqRight = faqs.slice(Math.ceil(faqs.length / 2));

  const mapsQuery = encodeURIComponent(companyAddress || 'Lima, Peru');
  const mapsEmbed = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-14 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-5">
            <Zap className="w-3.5 h-3.5" />
            Respondemos en menos de 24h
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-[1.1]">
            ¿En qué podemos <span className="text-gradient-animated">ayudarte?</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl leading-relaxed">
            {tagline || 'Nuestro equipo está disponible para resolver tus dudas, escuchar tus sugerencias y ayudarte a crecer.'}
          </p>
        </div>
      </section>

      {/* ── Canales de contacto ── */}
      {channels.length > 0 && (
        <section className="py-8 sm:py-10">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border/20">
              {channels.map((ch) => (
                <a
                  key={ch.label}
                  href={ch.href}
                  target={ch.href.startsWith('http') ? '_blank' : undefined}
                  rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group flex items-center gap-3.5 py-4 sm:py-0 sm:px-6 first:pl-0 last:pr-0 flex-1 min-w-0"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ch.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-0.5">{ch.label}</p>
                    <p className="text-sm font-medium text-foreground leading-snug break-words [overflow-wrap:anywhere] group-hover:text-primary">{ch.value}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Form + Map ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">
            {/* Form */}
            <div className="lg:col-span-3 flex flex-col">
              <h2 className="text-lg font-bold text-foreground mb-1">Envíanos un mensaje</h2>
              <p className="text-sm text-muted-foreground/60 mb-6">Te responderemos lo antes posible.</p>

              {sent ? (
                <div className="py-12 flex-1 flex flex-col justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">Mensaje enviado</h3>
                  <p className="text-sm text-muted-foreground mb-5">Te responderemos en menos de 24 horas.</p>
                  <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    className="text-sm text-primary font-medium self-start">Enviar otro mensaje</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre <span className="text-primary">*</span></label>
                      <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="Tu nombre" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email <span className="text-primary">*</span></label>
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="tu@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Asunto</label>
                    <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="¿Sobre qué nos escribes?" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mensaje <span className="text-primary">*</span></label>
                    <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      className="w-full flex-1 min-h-[120px] px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none" placeholder="Cuéntanos en qué podemos ayudarte..." />
                  </div>
                  <div className="flex pt-2">
                    <button type="submit" disabled={loading}
                      className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 sm:py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50">
                      {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar mensaje</>}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Map */}
            {companyAddress && (
              <div id="mapa" className="lg:col-span-2 lg:pl-12 lg:border-l lg:border-border/20 flex flex-col">
                <div className="flex-1 min-h-[240px] rounded-lg overflow-hidden">
                  <iframe
                    title={`Ubicación ${companyName}`}
                    src={mapsEmbed}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
                <div className="flex items-start justify-between gap-3 pt-4">
                  <p className="text-sm font-medium text-foreground leading-snug">{companyAddress}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold text-primary whitespace-nowrap pt-0.5"
                  >
                    Cómo llegar →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">FAQ</span>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
                  Preguntas <span className="text-gradient-animated">frecuentes</span>
                </h2>
                <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">
                  Las dudas más comunes de nuestros afiliados. Si tienes más preguntas, escríbenos.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border/20 lg:gap-x-12">
            <div className="lg:pr-12">
              {faqLeft.map((faq) => {
                const i = faqs.indexOf(faq);
                return (
                  <div key={i} className="border-b border-border/20">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4"
                    >
                      <span className={cn(
                        'text-sm sm:text-[15px] leading-snug',
                        openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70',
                      )}>
                        {faq.q}
                      </span>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                        openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40',
                      )}>
                        <ChevronDown className={cn('w-3.5 h-3.5', openFaq === i && 'rotate-180')} />
                      </div>
                    </button>
                    {openFaq === i && (
                      <div className="pb-5">
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="lg:pl-12">
              {faqRight.map((faq) => {
                const i = faqs.indexOf(faq);
                return (
                  <div key={i} className="border-b border-border/20">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4"
                    >
                      <span className={cn(
                        'text-sm sm:text-[15px] leading-snug',
                        openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70',
                      )}>
                        {faq.q}
                      </span>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                        openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40',
                      )}>
                        <ChevronDown className={cn('w-3.5 h-3.5', openFaq === i && 'rotate-180')} />
                      </div>
                    </button>
                    {openFaq === i && (
                      <div className="pb-5">
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}