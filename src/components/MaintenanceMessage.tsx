import { useMemo } from 'react';

// Render only the formatting supported by the editor, including legacy plain text.
export function maintenanceHtml(value: string) {
  const doc = new DOMParser().parseFromString(value, 'text/html');
  const output = document.createElement('div');
  const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A']);
  function copy(node: Node, target: Node) {
    if (node.nodeType === Node.TEXT_NODE) { target.appendChild(document.createTextNode(node.textContent || '')); return; }
    if (!(node instanceof Element) || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'FORM'].includes(node.tagName)) return;
    const clean = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : document.createDocumentFragment();
    if (clean instanceof HTMLElement) {
      const alignment = (node as HTMLElement).style.textAlign;
      if (['left', 'center', 'right', 'justify'].includes(alignment)) clean.style.textAlign = alignment;
      if (node.tagName === 'A') {
        try { const url = new URL(node.getAttribute('href') || ''); if (['https:', 'http:', 'mailto:'].includes(url.protocol)) { clean.setAttribute('href', url.href); clean.setAttribute('rel', 'noopener noreferrer'); } } catch { /* Ignore invalid links. */ }
      }
    }
    node.childNodes.forEach(child => copy(child, clean)); target.appendChild(clean);
  }
  doc.body.childNodes.forEach(node => copy(node, output));
  return output.innerHTML;
}
export function MaintenanceMessage({ value }: { value: string }) {
  const html = useMemo(() => maintenanceHtml(value || 'Estamos realizando mejoras. Volveremos pronto.'), [value]);
  return <div className="w-full text-muted-foreground leading-relaxed break-words whitespace-pre-wrap [&_p]:my-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3" dangerouslySetInnerHTML={{ __html: html }} />;
}
