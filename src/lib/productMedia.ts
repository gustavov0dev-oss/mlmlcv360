export function videoSource(raw: string) {
  try {
    const url = new URL(raw.trim());
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, '');
    const id = host === 'youtu.be' ? url.pathname.split('/')[1]
      : ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)
        ? url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] : null;
    if (id && /^[\w-]{11}$/.test(id)) return { kind: 'youtube', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embed: `https://www.youtube-nocookie.com/embed/${id}` };
    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      const match = url.pathname.match(/\/(\d+)(?:\/|$)/);
      if (match) return { kind: 'vimeo', thumbnail: '', embed: `https://player.vimeo.com/video/${match[1]}` };
    }
    if (/\.(mp4|webm|mov|m4v|ogv|avi)$/i.test(url.pathname)) return { kind: 'file', thumbnail: '', embed: url.href };
  } catch { /* Invalid URLs are handled by the editor. */ }
  return null;
}
