export type ContentType = 'article' | 'video' | 'news';
export type Category = string;
export interface ContentItem {
  slug: string; type: ContentType; category: string; title: string; excerpt: string;
  author: string; authorRole: string; authorAvatar: string; date: string;
  readTime?: string; duration?: string; views: number; image: string; featured?: boolean;
  content: string; videoUrl: string;
}
export interface NewsRow { view_count?: number; id: string; slug: string; status: 'draft' | 'published'; sort_order: number; data: ContentItem; }
export const newsPageDefaults = { badge: 'Recursos Cluv360', title: 'Novedades, guías y', highlight: 'tutoriales', subtitle: 'Aprende a escalar tu red, domina el sistema de comisiones y mantente al día con las novedades de la plataforma.' };
export function newsSlug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export function safeMediaUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } }
export function videoEmbed(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    if (['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(url.hostname)) {
      const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.split('/').pop();
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    }
    if (['vimeo.com','player.vimeo.com'].includes(url.hostname)) { const id=url.pathname.split('/').pop(); return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : ''; }
  } catch { /* Invalid media stays hidden. */ }
  return '';
}
// Rebuild only the editor's supported formatting; never retain arbitrary attributes.
export function safeNewsHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['P','BR','H2','H3','STRONG','B','EM','I','U','S','UL','OL','LI','BLOCKQUOTE','PRE','CODE','A','HR']);
  const clean = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
    const fragment = document.createDocumentFragment();
    if (!(node instanceof Element) || ['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH'].includes(node.tagName)) return fragment;
    const target = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : fragment;
    if (target instanceof HTMLAnchorElement) { const href = node.getAttribute('href') || ''; if (safeMediaUrl(href) || /^mailto:[^\s]+$/.test(href)) { target.href=href; target.target='_blank'; target.rel='noopener noreferrer'; } }
    if (target instanceof HTMLElement && ['left','center','right'].includes((node as HTMLElement).style.textAlign)) target.style.textAlign=(node as HTMLElement).style.textAlign;
    node.childNodes.forEach(child=>target.appendChild(clean(child))); return target;
  };
  const output=document.createElement('div'); doc.body.childNodes.forEach(node=>output.appendChild(clean(node))); return output.innerHTML;
}

export function directVideoUrl(value: string) { try { const url=new URL(value); return url.protocol==='https:' && /\.(mp4|webm)$/i.test(url.pathname) ? url.href : ''; } catch { return ''; } }
export function formatVideoDuration(seconds:number) { if(!Number.isFinite(seconds)||seconds<=0)return ''; const total=Math.round(seconds); return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`; }
export function readingTime(html:string) { const words=html.replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').trim().split(/\s+/).filter(Boolean).length; return words ? `${Math.max(1,Math.ceil(words/200))} min` : ''; }
