import { ReactNode, Suspense } from 'react';
import { LoadingRegion } from '@/components/ui/loading-region';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col min-h-[100dvh]">
        <Suspense fallback={<LoadingRegion className="min-h-[100dvh]" />}>{children}</Suspense>
      </main>
      <Footer />
    </div>
  );
}
