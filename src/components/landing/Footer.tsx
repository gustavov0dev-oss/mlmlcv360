import { Link } from '@/lib/router';
import { Mail, ArrowRight } from 'lucide-react';
import { useConfig } from '@/store/configStore';
import { LogoWithText } from '@/components/Logo';

export default function Footer() {
  const { company, logoValue } = useConfig();
  const companyName = company.company_name || 'MLM 360';
  const companyEmail = company.company_email || 'contacto@mlm360.pe';

  const footerLinks = [
    {
      title: 'Producto',
      links: [
        { href: '/planes', label: 'Planes' },
        { href: '/tienda', label: 'Tienda' },
        { href: '/nosotros', label: 'Nosotros' },
        { href: '/empresa', label: 'Empresa' },
      ],
    },
    {
      title: 'Recursos',
      links: [
        { href: '/blog', label: 'Novedades' },
        { href: '/contacto', label: 'Contacto' },
        { href: '#', label: 'Centro de ayuda' },
        { href: '#', label: 'Documentacion' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { href: '#', label: 'Terminos de servicio' },
        { href: '#', label: 'Politica de privacidad' },
        { href: '#', label: 'Cookies' },
        { href: '#', label: 'Aviso legal' },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-border/50 bg-background">
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
            {/* Brand & newsletter section */}
            <div className="lg:col-span-5">
              <LogoWithText
                value={logoValue}
                fallbackText={companyName}
                size="w-7 h-7"
                textClass="text-lg font-semibold text-foreground"
              />
              <p className="text-sm text-muted-foreground leading-relaxed mt-4 max-w-sm">
                Plataforma empresarial para gestion de redes y comercio. Impulsa tu negocio al siguiente nivel.
              </p>

              {/* Newsletter signup */}
              <div className="mt-6">
                <p className="text-sm font-medium text-foreground mb-2">Newsletter</p>
                <form className="flex gap-2">
                  <input
                    type="email"
                    placeholder={companyEmail}
                    className="flex-1 px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                  >
                    Suscribir
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Links grid */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                {footerLinks.map((section) => (
                  <div key={section.title}>
                    <h4 className="text-sm font-semibold text-foreground mb-3">{section.title}</h4>
                    <ul className="space-y-2">
                      {section.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            to={link.href}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/50 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {companyName}. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={`mailto:${companyEmail}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-4 h-4" />
                {companyEmail}
              </a>
              <span className="text-border text-xs">|</span>
              <p className="text-xs text-muted-foreground">Lima, Peru</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
