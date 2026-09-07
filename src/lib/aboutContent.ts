export interface AboutItem { id: string; sort_order: number; is_active: boolean }
export interface Founder extends AboutItem { name: string; role: string; bio: string; image_url: string }
export interface TimelineItem extends AboutItem { year: string; title: string; description: string; icon: string }
export interface InfraItem extends AboutItem { title: string; description: string; icon: string }
export interface ValueItem extends AboutItem { label: string; text: string; icon: string }
export type AboutTab = 'hero' | 'values' | 'timeline' | 'infrastructure' | 'founders' | 'legal';
export type AboutField = { key: string; label: string; value: string; multiline?: boolean; hint?: string };

export function aboutFields(companyName = 'MLM 360'): Record<AboutTab, AboutField[]> {
  const headings = (prefix: string, badge: string, title: string, highlight: string, subtitle: string): AboutField[] => [
    { key: `about_${prefix}_badge`, label: 'Etiqueta superior', value: badge },
    { key: `about_${prefix}_title`, label: 'Título', value: title },
    { key: `about_${prefix}_highlight`, label: 'Texto destacado del título', value: highlight, hint: 'Escribe una parte exacta del título para mantener el efecto de color. Déjalo vacío para no destacar texto.' },
    { key: `about_${prefix}_subtitle`, label: 'Subtítulo', value: subtitle, multiline: true },
  ];
  return {
    hero: [
      ...headings('hero', 'Desde Lima para Latinoamerica', 'Empoderamos a emprendedores latinos', 'emprendedores', 'Construimos tecnologia que genera libertad financiera real. Nuestra plataforma automatiza lo dificil para que te enfoques en lo importante: tu red.'),
      { key: 'about_hero_description', label: 'Descripción de la empresa', multiline: true, value: `${companyName} es una empresa orientada al desarrollo tecnologico, financiero y comercial, creada para construir un ecosistema digital que impulse la prosperidad de sus socios y embajadores. A traves de soluciones integradas -red social, billetera digital, comercio electronico, inversiones y proyectos inmobiliarios- buscamos generar oportunidades reales de desarrollo economico, con un modelo de crecimiento sostenible, global y de exito compartido.` },
      { key: 'about_primary_label', label: 'Texto del botón principal', value: 'Unete hoy', hint: 'Déjalo vacío para ocultar el botón.' },
      { key: 'about_primary_url', label: 'Destino del botón principal', value: '/registro', hint: 'Una ruta como /registro o una dirección https://.' },
      { key: 'about_secondary_label', label: 'Texto del botón secundario', value: 'Contactanos', hint: 'Déjalo vacío para ocultar el botón.' },
      { key: 'about_secondary_url', label: 'Destino del botón secundario', value: '/contacto', hint: 'Una ruta como /contacto o una dirección https://.' },
    ],
    values: [],
    timeline: headings('timeline', 'Nuestra historia', 'De una idea a la plataforma lider en Latinoamerica', 'lider en Latinoamerica', `Los hitos que marcaron el crecimiento de ${companyName}.`),
    infrastructure: headings('infrastructure', 'Infraestructura', 'Tecnologia de nivel empresarial', 'de nivel empresarial', 'Construido sobre las mejores herramientas. Cada componente es production-ready.'),
    founders: headings('founders', 'Liderazgo', `El equipo detras de ${companyName}`, companyName, 'Fundadores comprometidos con la transparencia y el crecimiento de cada socio.'),
    legal: [
      ...headings('legal', 'Informacion legal', 'Empresa registrada con transparencia total', 'transparencia total', 'Estos son nuestros datos oficiales de contacto y constitucion.'),
      ...[
        ['razon_social', 'Razón social', 'CLUV360 S.A.'],
        ['ruc', 'RUC', '20603456789'],
        ['address_country', 'País de origen', 'Peru'],
        ['address', 'Dirección', 'Manuel Asencio Segura 211, Los Olivos, Lima, Peru'],
        ['contact_email', 'Email', 'info@cluv360.com'],
        ['phone', 'Teléfono', '+51 916 085 797'],
      ].flatMap(([key, label, value]) => [
        { key: `about_legal_label_${key}`, label: `Etiqueta: ${label}`, value: label },
        { key, label, value, hint: 'Dato compartido con la configuración general de la empresa.' },
      ]),
    ],
  };
}

export function resolveAboutConfig(config: Record<string, string>): Record<string, string> {
  const defaults = Object.fromEntries(Object.values(aboutFields(config.company_name || 'MLM 360')).flat().map(f => [f.key, f.value]));
  return { ...defaults, ...Object.fromEntries(Object.entries(config).filter(([, value]) => typeof value === 'string')) };
}

// Keep intentionally blank content blank; defaults apply only to missing keys.
export function safeAboutUrl(value: string): string {
  const url = value.trim();
  if (/[\\\s\u0000-\u001f\u007f]/.test(url)) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try { return ['https:', 'http:'].includes(new URL(url).protocol) ? url : ''; } catch { return ''; }
}

export function reorderAboutItems<T extends AboutItem>(items: T[], fromId: string, toId: string): T[] {
  const reordered = [...items];
  const from = reordered.findIndex(item => item.id === fromId);
  const to = reordered.findIndex(item => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered.map((item, sort_order) => ({ ...item, sort_order }));
}
