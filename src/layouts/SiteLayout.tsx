import { ReactNode } from 'react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
