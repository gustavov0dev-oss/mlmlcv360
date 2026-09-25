import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { videoSource } from '@/lib/productMedia';

export function VideoThumbnail({ url, thumbnail }: { url: string; thumbnail?: string }) {
  const source = videoSource(url);
  const [poster, setPoster] = useState(thumbnail || source?.thumbnail || '');
  useEffect(() => {
    setPoster(thumbnail || videoSource(url)?.thumbnail || '');
    const controller = new AbortController();
    if (!thumbnail && videoSource(url)?.kind === 'vimeo') {
      fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : null).then(data => { if (data?.thumbnail_url) setPoster(data.thumbnail_url); }).catch(() => {});
    }
    return () => controller.abort();
  }, [url, thumbnail]);
  return <div className="relative w-full h-full flex items-center justify-center bg-muted">
    {poster ? <img src={poster} alt="Miniatura del video" className="w-full h-full object-cover" onError={() => setPoster('')} />
      : source?.kind === 'file' ? <video src={`${url}${url.includes('#') ? '' : '#t=0.1'}`} preload="metadata" muted playsInline className="w-full h-full object-cover" />
        : <span className="text-xs text-muted-foreground px-3 pt-14 text-center">Video · Miniatura no disponible</span>}
    <span className="absolute rounded-full bg-black/70 text-white p-3"><Play className="w-5 h-5" /></span>
  </div>;
}
