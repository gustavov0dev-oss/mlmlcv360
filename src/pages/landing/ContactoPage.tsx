import { useState } from 'react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Mail, Phone, MapPin, Send, CircleCheck as CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactoPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Mensaje enviado. Te contactaremos pronto.');
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold text-foreground mb-4">Contáctanos</h1>
              <p className="text-xl text-muted-foreground">Estamos aquí para ayudarte. Responderemos en menos de 24 horas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-6">Información de contacto</h2>
                  {[
                    { icon: Mail, title: 'Correo electrónico', value: 'contacto@mlm360.pe', sub: 'Respuesta en menos de 24 horas' },
                    { icon: Phone, title: 'Teléfono', value: '+51 1 234-5678', sub: 'Lunes a viernes, 9am - 6pm' },
                    { icon: MapPin, title: 'Dirección', value: 'Av. Javier Prado Este 4200', sub: 'San Isidro, Lima, Perú' },
                  ].map(item => (
                    <div key={item.title} className="flex items-start gap-4 mb-6">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{item.title}</div>
                        <div className="text-foreground">{item.value}</div>
                        <div className="text-sm text-muted-foreground">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-bold text-foreground mb-3">Horario de atención</h3>
                  <div className="space-y-2 text-sm">
                    {[
                      { day: 'Lunes - Viernes', hours: '9:00 am - 6:00 pm' },
                      { day: 'Sábado', hours: '9:00 am - 1:00 pm' },
                      { day: 'Domingo', hours: 'Cerrado' },
                    ].map(({ day, hours }) => (
                      <div key={day} className="flex justify-between">
                        <span className="text-muted-foreground">{day}</span>
                        <span className="text-foreground font-medium">{hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="bg-card border border-border rounded-2xl p-8">
                {sent ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">¡Mensaje enviado!</h3>
                    <p className="text-muted-foreground">Te contactaremos pronto en el correo indicado.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground mb-5">Envíanos un mensaje</h2>
                    {[
                      { field: 'name', label: 'Nombre completo', placeholder: 'Juan Pérez', type: 'text' },
                      { field: 'email', label: 'Correo electrónico', placeholder: 'juan@ejemplo.pe', type: 'email' },
                      { field: 'subject', label: 'Asunto', placeholder: 'Información sobre planes', type: 'text' },
                    ].map(({ field, label, placeholder, type }) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                        <input type={type} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={placeholder} required
                          className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-foreground text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Mensaje</label>
                      <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Escribe tu consulta aquí..." required
                        className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-foreground text-sm outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground" />
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                      <Send className="w-4 h-4" /> Enviar mensaje
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      <Footer />
    </div>
  );
}
