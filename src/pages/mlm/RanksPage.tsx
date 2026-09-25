import MlmPointsSummary from '@/components/MlmPointsSummary';
import { LoadingRegion } from '@/components/ui/loading-region';
import { useConfig, formatPrice } from '@/store/configStore';
import { useRanks } from '@/modules/mlm';
import { cn } from '@/lib/utils';
import { Star, Crown, Target, Medal, Gem, Disc, Award as AwardIcon } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  medal: Medal, gem: Gem, disc: Disc, crown: Crown, star: Star, award: AwardIcon,
  bronze: Medal, silver: Medal, gold: Medal, platinum: Disc, diamond: Gem,
};

function RankIcon({ icon, className }: { icon?: string; className?: string }) {
  if (!icon) return <Medal className={className} />;
  const trimmed = icon.trim();
  if (trimmed.toLowerCase().startsWith('<svg')) {
    return (
      <span
        className={cn('inline-flex items-center justify-center w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain', className)}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  if (trimmed.startsWith('http') || trimmed.startsWith('/')) return <img src={trimmed} alt="" className={cn('w-full h-full object-contain', className)} />;
  const Comp = iconMap[trimmed.toLowerCase()];
  if (Comp) return <Comp className={className} />;
  if (trimmed.length <= 4 && !trimmed.includes('.')) return <span className={cn('flex items-center justify-center w-full h-full', className)}>{trimmed}</span>;
  return <Medal className={className} />;
}



export default function RanksPage() {
  const { ranks, currency, currencySymbol, exchangeRate } = useConfig();
  const { loading, error, stats, currentRank, nextRank, progress } = useRanks();
  const money=(n:number)=>formatPrice(n,currency,currencySymbol,exchangeRate);
  if(loading) return <LoadingRegion className="min-h-[60vh]"/>;
  if(error) return <div role="alert" className="p-6 border border-border rounded-xl">{error}</div>;
  return <div className="space-y-6 pb-8">
    <header><h1 className="text-2xl font-bold">Mi camino de crecimiento</h1><p className="text-sm text-muted-foreground mt-2">Conoce tu reconocimiento actual y los requisitos configurados para cada rango.</p></header>
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-4"><div className="h-16 w-16 p-3 rounded-xl bg-muted"><RankIcon icon={currentRank?.icon}/></div><div><p className="text-sm text-muted-foreground">Tu rango actual</p><h2 className="text-2xl font-bold mt-1">{currentRank?.name || 'Sin rango asignado'}</h2></div></div>
        <p className="text-sm text-muted-foreground">{currentRank?.description || 'Tu rango es el reconocimiento registrado en tu cuenta.'}</p>
        <div className="border-t border-border pt-4"><p className="text-sm text-muted-foreground">Bono configurado</p><p className="text-2xl font-semibold mt-1">{money(currentRank?.bonus || 0)}</p><p className="text-xs text-muted-foreground mt-2">El bono no es un pago confirmado. Consulta los movimientos acreditados en Comisiones.</p></div>
        <a href="/dashboard/comisiones" className="inline-flex text-primary font-medium text-sm">Ver mis comisiones →</a>
      </section>
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3"><Target className="w-6 h-6 text-primary"/><div><p className="text-sm text-muted-foreground">Tu siguiente objetivo</p><h2 className="text-xl font-bold">{nextRank?.name || 'Has llegado al último rango configurado'}</h2></div></div>
        {nextRank && <><div className="flex flex-wrap justify-between gap-2 text-sm"><span>Afiliados directos registrados</span><strong>{stats.affiliates} / {nextRank.min_affiliates}</strong></div><div role="progressbar" aria-label="Afiliados directos" aria-valuenow={progress.affiliateProgress} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded-full bg-muted overflow-hidden"><div className="bg-primary h-full" style={{width:`${progress.affiliateProgress}%`}}/></div><p className="text-sm">{Math.max(0,nextRank.min_affiliates-stats.affiliates)>0 ? `Te faltan ${Math.max(0,nextRank.min_affiliates-stats.affiliates)} afiliados directos para este requisito.` : 'Cumples el requisito de afiliados directos.'}</p><div className="border-t border-border pt-4"><p className="text-sm mb-3">Tienes <strong>{stats.volume.toLocaleString('es-PE')} puntos</strong>. Te faltan {Math.max(0,Number(nextRank.min_volume)-stats.volume).toLocaleString('es-PE')} para este requisito.</p><div role="progressbar" aria-label="Puntos para rango" aria-valuenow={progress.volumeProgress} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded-full bg-muted overflow-hidden mb-3"><div className="bg-primary h-full" style={{width:`${progress.volumeProgress}%`}}/></div><p className="text-sm">Puntos requeridos: <strong>{Number(nextRank.min_volume).toLocaleString('es-PE')}</strong></p><p className="text-sm text-muted-foreground mt-2">Compras pagadas y operaciones externas registradas por la administración suman puntos personales para tu rango.</p></div><a href="/dashboard/red" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold text-sm">Ir a mi red →</a></>}
      </section>
    </div>
    <MlmPointsSummary/>
    <section><h2 className="text-lg font-bold mb-2">Ruta de rangos</h2><p className="text-sm text-muted-foreground mb-5">Los rangos automáticos se evalúan al acreditar puntos o registrar afiliados directos. Los rangos manuales los asigna la administración. Los reconocimientos obtenidos se conservan.</p><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{ranks.map((rank,i)=><article key={rank.id} className={cn('rounded-xl border bg-card p-5 space-y-4',rank.id===currentRank?.id?'border-primary':'border-border')}><div className="flex items-center gap-3"><span className="h-12 w-12 rounded-xl bg-muted p-2"><RankIcon icon={rank.icon}/></span><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Etapa {i+1}</p><h3 className="font-bold">{rank.name}</h3></div>{rank.id===currentRank?.id&&<span className="text-xs text-primary">Actual</span>}{rank.id===nextRank?.id&&<span className="text-xs text-primary">Siguiente</span>}</div><p className="text-xs text-muted-foreground">{rank.auto_qualify && (rank.min_volume>0 || rank.min_affiliates>0) ? 'Ascenso automático' : 'Asignación por la administración'}</p><dl className="border-t border-border pt-4 text-sm space-y-3"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Afiliados directos</dt><dd className="font-semibold">{rank.min_affiliates}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Puntos requeridos</dt><dd className="font-semibold">{Number(rank.min_volume).toLocaleString('es-PE')}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Bono configurado</dt><dd className="font-semibold">{money(rank.bonus)}</dd></div></dl></article>)}</div></section>
  </div>;
}
