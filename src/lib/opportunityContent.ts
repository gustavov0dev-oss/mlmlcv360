export type OpportunityItem = { id: string; is_active: boolean; icon?: string; title?: string; desc?: string; label?: string; traditional?: boolean; cluv?: boolean };
export type OpportunitySection = { text: Record<string, string>; items: OpportunityItem[] };
export const opportunityTabs = [
  { id: 'hero', label: 'Hero' }, { id: 'video', label: 'Video' }, { id: 'story', label: 'Quiénes somos' },
  { id: 'profiles', label: '¿Para quién es?' }, { id: 'comparison', label: 'Comparación' }, { id: 'commitments', label: 'Compromiso' },
] as const;
export type OpportunityTab = typeof opportunityTabs[number]['id'];
export const opportunityKey = (tab: OpportunityTab) => `opportunity_${tab}`;
const values = [
  { icon: 'ShieldCheck', title: 'Transparencia', desc: 'Sin letra pequeña ni comisiones escondidas.' },
  { icon: 'Lightbulb', title: 'Innovación', desc: 'Tecnología que resuelve lo que otros MLM ignoran.' },
  { icon: 'Users', title: 'Comunidad', desc: 'Creces acompañado, no solo.' },
  { icon: 'TrendingUp', title: 'Crecimiento real', desc: 'Resultados medibles, no promesas vacías.' },
];

const profiles = [
  { icon: 'Rocket', title: 'Emprendedores en potencia', desc: 'Quieres construir algo propio sin arriesgar un capital grande.' },
  { icon: 'GraduationCap', title: 'Estudiantes', desc: 'Buscas un ingreso flexible que se adapte a tu horario de clases.' },
  { icon: 'Home', title: 'Trabajo desde casa', desc: 'Quieres generar ingresos sin salir de tu casa, en tus tiempos libres.' },
  { icon: 'Briefcase', title: 'Profesionales', desc: 'Buscas un ingreso adicional fuera de tu trabajo actual.' },
];

const comparisonRows = [
  { label: 'Tu ingreso depende solo de tus horas trabajadas', traditional: true, cluv: false },
  { label: 'Puedes ganar por el esfuerzo de todo tu equipo', traditional: false, cluv: true },
  { label: 'Tú decides tus propios horarios', traditional: false, cluv: true },
  { label: 'El negocio es tuyo, no de un jefe', traditional: false, cluv: true },
  { label: 'Necesitas años para subir de puesto', traditional: true, cluv: false },
  { label: 'Puedes empezar hoy mismo, sin experiencia previa', traditional: false, cluv: true },
];

const commitments = [
  { icon: 'GraduationCap', title: 'Capacitación continua', desc: 'Guías, tutoriales y mentoría para que nunca estés perdido.' },
  { icon: 'Headphones', title: 'Soporte real', desc: 'Personas respondiendo tus dudas, no un bot que da vueltas.' },
  { icon: 'ShieldCheck', title: 'Transparencia total', desc: 'Ves exactamente cómo y cuándo se calcula cada comisión.' },
  { icon: 'Users', title: 'Comunidad activa', desc: 'Una red de afiliados que comparte lo que le funciona.' },
];


export function opportunityDefaults(companyName = 'MLM 360'): Record<OpportunityTab, OpportunitySection> {
 const items = (rows: Omit<OpportunityItem, 'id' | 'is_active'>[]) => rows.map((row, i) => ({ ...row, id: `default-${i}`, is_active: true }));
 return {
 hero: { text: { badge: 'Oportunidad de negocio', title: 'Esto no es un empleo. Es tu negocio.', highlight: 'Es tu negocio.', subtitle: `${companyName} te da la estructura, la tecnología y el respaldo para construir un ingreso propio, a tu ritmo y sin jefes.`, primary_label: 'Quiero empezar', primary_url: '/registro', secondary_label: 'Ver planes', secondary_url: '/planes' }, items: [] },
 video: { text: { badge: 'Conócenos', title: 'Mira de qué se trata la oportunidad', highlight: 'la oportunidad', subtitle: 'Unos minutos para entender cómo funciona el negocio y por qué miles ya están construyendo su red.', video_url: 'https://www.youtube.com/embed/29Pthrvd-fM', video_title: `Presentación ${companyName}` }, items: [] },
 story: { text: { badge: 'Quiénes somos', title: 'Una plataforma construida para que ganes tú', highlight: 'para que ganes tú', subtitle: `${companyName} nació para resolver un problema real: la mayoría de sistemas MLM son opacos, lentos para pagar y difíciles de entender. Construimos la tecnología que nosotros mismos quisiéramos usar como afiliados.`, description: 'Sin letra pequeña, sin comisiones escondidas y sin depender de un equipo de soporte que nunca responde.' }, items: items(values) },
 profiles: { text: { badge: '¿Para quién es?', title: 'Esta oportunidad es para ti si...', highlight: 'para ti si...', subtitle: 'No necesitas experiencia previa. Solo las ganas de construir algo propio.' }, items: items(profiles) },
 comparison: { text: { badge: 'La diferencia', left_title: 'Empleo tradicional', versus: 'vs', right_title: companyName, subtitle: 'La diferencia no es solo el dinero. Es quién controla tu tiempo.', aspect_label: 'Aspecto', traditional_label: 'Empleo', cluv_label: companyName }, items: items(comparisonRows) },
 commitments: { text: { badge: 'Nuestro compromiso', title: 'No te dejamos solo', highlight: 'solo', subtitle: 'Construir una red toma esfuerzo. Nosotros ponemos las herramientas y el respaldo.' }, items: items(commitments) },
 };
}
export function parseOpportunitySection(raw: string | undefined, fallback: OpportunitySection): OpportunitySection {
 if (raw === undefined) return fallback;
 const parsed = JSON.parse(raw);
 if (!parsed || typeof parsed.text !== 'object' || !Array.isArray(parsed.items)) throw new Error('Contenido inválido');
 for (const key of Object.keys(fallback.text)) if (typeof parsed.text[key] !== 'string') throw new Error('Texto inválido');
 const ids = new Set<string>();
 for (const item of parsed.items) {
  if (!item || typeof item.id !== 'string' || ids.has(item.id) || typeof item.is_active !== 'boolean') throw new Error('Registro inválido');
  ids.add(item.id);
  for (const key of Object.keys(fallback.items[0] || {})) if (typeof item[key] !== typeof fallback.items[0][key as keyof OpportunityItem]) throw new Error('Campo inválido');
 }
 return {text: parsed.text, items: parsed.items};
}
export function opportunityVideoUrl(raw: string): string {
 try {
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol)) return '';
  let id = '';
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) id = url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : url.searchParams.get('v') || (url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : '');
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  if (/^[\w-]{11}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname)) {
   const match = url.pathname.match(/^\/(?:video\/)?(\d+)$/);
   if (match) return `https://player.vimeo.com/video/${match[1]}`;
  }
 } catch { /* Invalid or empty URLs do not create an iframe. */ }
 return '';
}
export const opportunityFieldLabels: Record<string,string> = { badge:'Etiqueta superior', title:'Título', highlight:'Texto destacado del título', subtitle:'Descripción', description:'Segundo párrafo', primary_label:'Texto del botón principal', primary_url:'Enlace del botón principal', secondary_label:'Texto del botón secundario', secondary_url:'Enlace del botón secundario', video_url:'Enlace del video (YouTube o Vimeo)', video_title:'Título del video', left_title:'Título izquierdo', versus:'Separador de comparación', right_title:'Título derecho', aspect_label:'Encabezado de aspectos', traditional_label:'Encabezado de empleo', cluv_label:'Encabezado de la oportunidad' };
