import { useState, useEffect } from 'react';
import { Link } from '@/lib/router';
import { Mail, Phone, MapPin, FileText } from 'lucide-react';
import { useConfig } from '@/store/configStore';
import { supabase } from '@/lib/backend/client';
import { useDatabase } from '@/lib/backend';
import { LogoWithText } from '@/components/Logo';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  icon_svg?: string | null;
  is_active: boolean;
  sort_order: number;
}

const ICON_PATHS: Record<string, string> = {
  facebook: 'M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z',
  instagram: 'M12 2c2.7 0 3 0 4.1.1 1 0 1.7.2 2.3.5.6.2 1.5.6 2 1.1.5.5.9 1.4 1.1 2 .3.6.5 1.3.5 2.3.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.7-.5 2.3-.2.6-.6 1.5-1.1 2-.5.5-1.4.9-2 1.1-.6.3-1.3.5-2.3.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.7-.2-2.3-.5-.6-.2-1.5-.6-2-1.1-.5-.5-.9-1.4-1.1-2-.3-.6-.5-1.3-.5-2.3C2 15 2 14.7 2 12s0-3 .1-4.1c0-1 .2-1.7.5-2.3.2-.6.6-1.5 1.1-2 .5-.5 1.4-.9 2-1.1.6-.3 1.3-.5 2.3-.5C9 2 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.3a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.2-8.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z',
  linkedin: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H9z',
  twitter: 'M18.9 1.9h3.7l-8 9.1 9.4 12.4h-7.4l-5.8-7.6-6.6 7.6H.5l8.5-9.7L0 1.9h7.6l5.2 6.9zM17.6 21h2L6.5 4H4.4z',
  youtube: 'M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z',
  tiktok: 'M16.6 5.8a4.8 4.8 0 0 1-1-2.8h-3.4v13.6c0 1.4-1.1 2.5-2.5 2.5a2.5 2.5 0 0 1-2.5-2.5c0-1.4 1.1-2.5 2.5-2.5.3 0 .5 0 .8.1v-3.4a6 6 0 0 0-.8-.1 5.9 5.9 0 1 0 5.9 5.9V9.3a8 8 0 0 0 4.8 1.6V7.5a4.8 4.8 0 0 1-3.8-1.7z',
  whatsapp: 'M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.1-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.5.2-.4v-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z',
  telegram: 'M21.9 4.3 18.6 20a1 1 0 0 1-1.5.7l-4-3-2 2c-.3.3-.6.4-1 .4l.3-4.2 7.8-7c.3-.3-.1-.5-.5-.2L7.3 14l-3.8-1.2c-.8-.2-.8-.8.2-1.2L20.6 3c.7-.3 1.4.2 1.3 1.3z',
  github: 'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.4-2.2-.3-4.5-1.1-4.5-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.5 5 .3.3.6.9.6 1.8v2.6c0 .3.2.6.7.5A10 10 0 0 0 12 2z',
};

function SocialIcon({ icon, iconSvg }: { icon: string; iconSvg?: string | null }) {
  const isFullSvg = iconSvg && iconSvg.trim().startsWith('<svg');
  if (isFullSvg) {
    const sanitized = iconSvg!
      .replace(/\s(width|height)="[^"]*"/g, '')
      .replace(/fill="[^"]*"/g, 'fill="currentColor"');
    return (
      <span
        className="w-4 h-4 flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }
  const path = iconSvg && iconSvg.trim() !== ''
    ? iconSvg
    : ICON_PATHS[icon.toLowerCase()] || ICON_PATHS.facebook;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function Footer() {
  const { company, logoValue, logoSizes } = useConfig();
  const database = useDatabase();
  const companyName = company.company_name || 'MLM 360';
  const companyEmail = company.company_email || 'contacto@mlm360.pe';
  const companyPhone = company.company_phone || '+51 1 234-5678';
  const companyAddress = company.company_address || 'Av. Javier Prado Este 4200, San Isidro, Lima, Peru';
  const complaintsEnabled = company.complaints_book_enabled === 'true';
  const bookImage = company.complaints_book_image || '';

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [legalPages, setLegalPages] = useState<{ id: string; slug: string; title: string }[]>([]);

  useEffect(() => {
    const loadSocial = () => {
      supabase
        .from('social_links')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .then(({ data }) => { if (data) setSocialLinks(data); });
    };
    const loadLegal = () => {
      supabase
        .from('legal_pages')
        .select('id, slug, title')
        .eq('is_published', true)
        .eq('show_in_footer', true)
        .order('sort_order', { ascending: true })
        .then(({ data }) => { if (data) setLegalPages(data); });
    };
    loadSocial();
    loadLegal();
    const unsubSocial = database.subscribe('social_links', loadSocial);
    const unsubLegal = database.subscribe('legal_pages', loadLegal);
    return () => { unsubSocial(); unsubLegal(); };
  }, [database]);

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-16">
            {/* Brand section */}
            <div className="lg:w-80 flex-shrink-0">
              <LogoWithText
                value={logoValue}
                fallbackText={companyName}
                pixelSize={logoSizes.navbar || 32}
                pixelHeight={logoSizes.navbarHeight || logoSizes.navbar || 32}
                textClass="text-lg font-bold text-foreground"
              />
              {company.company_tagline && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {company.company_tagline}
                </p>
              )}
              <div className="flex gap-1.5 mt-5">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.platform}
                    className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <SocialIcon icon={link.icon} iconSvg={link.icon_svg} />
                  </a>
                ))}
              </div>
            </div>

            {/* Links grid */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-8 lg:gap-12">
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Plataforma</h4>
                <ul className="space-y-2.5">
                  {[
                    { href: '/planes', label: 'Planes' },
                    { href: '/tienda', label: 'Tienda' },
                    { href: '/nosotros', label: 'Nosotros' },
                    { href: '/empresa', label: 'Empresa' },
                    { href: '/blog', label: 'Novedades' },
                    { href: '/contacto', label: 'Contacto' },
                  ].map(l => (
                    <li key={l.href}>
                      <Link
                        to={l.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  {legalPages.map(p => (
                    <li key={p.id}>
                      <Link to={`/legal/${p.slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                  {legalPages.length === 0 && ['Terminos de servicio', 'Politica de privacidad', 'Politica de cookies', 'Aviso legal'].map(l => (
                    <li key={l}><span className="text-sm text-muted-foreground/40">{l}</span></li>
                  ))}
                </ul>
                {complaintsEnabled && (
                  <Link
                    to="/libro-reclamaciones"
                    className="inline-flex items-center gap-2.5 mt-5 group"
                  >
                    {bookImage
                      ? <img src={bookImage} alt="Libro de Reclamaciones" className="w-9 h-9 object-contain shrink-0" />
                      : <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />}
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                      Libro de<br/>Reclamaciones
                    </span>
                  </Link>
                )}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Contacto</h4>
                <ul className="space-y-3">
                  <li>
                    <a
                      href={`mailto:${companyEmail}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-start gap-2.5"
                    >
                      <Mail className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
                      <span className="break-all">{companyEmail}</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={`tel:${companyPhone.replace(/\s/g, '')}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-start gap-2.5"
                    >
                      <Phone className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
                      <span>{companyPhone}</span>
                    </a>
                  </li>
                  <li className="text-sm text-muted-foreground flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
                    <span>{companyAddress}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/60 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {companyName}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground">Hecho en Lima, Peru</p>
        </div>
      </div>
    </footer>
  );
}
