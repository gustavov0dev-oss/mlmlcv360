import { supportMode } from '@/lib/backend/client';
import { endSupportAccess } from '@/lib/backend/supportAccess';
import { ReactNode, Suspense } from 'react';
import { LoadingRegion } from '@/components/ui/loading-region';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      <Navbar />
      {supportMode&&<div role="status" className="fixed top-16 inset-x-0 z-50 flex justify-center items-center gap-4 bg-background border-b border-amber-500/40 p-2 text-sm"><span>Acceso de soporte</span><button onClick={()=>void endSupportAccess()} className="text-primary font-semibold underline">Volver a mi cuenta</button></div>}
      <main className="flex-1 flex flex-col min-h-[100dvh]">
        <Suspense fallback={<LoadingRegion className="min-h-[100dvh]" />}>{children}</Suspense>
      </main>
      <Footer />
    </div>
  );
}
