import type { ReactNode } from 'react';
import { Link } from '@/lib/router';
import { useConfig } from '@/store/configStore';
import { useThemeStore } from '@/store/themeStore';
import { LogoWithText } from '@/components/Logo';
import { Moon, Sun } from 'lucide-react';
export function AuthLayout({title,children}:{title:string;children:ReactNode}){
 const {company,logoValue}=useConfig();const {theme,setTheme}=useThemeStore();
 return <main className="min-h-[100dvh] flex flex-col bg-background px-4 py-5 sm:py-6"><div className="w-full max-w-[420px] m-auto"><header className="flex items-center justify-between mb-6"><Link to="/" aria-label="Volver al inicio"><LogoWithText value={logoValue} fallbackText={company.company_name||'CLUV 360'} pixelSize={128} pixelHeight={42}/></Link><button aria-label="Cambiar tema" onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-primary">{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></header><section className="min-h-[500px]"><h1 className="text-2xl font-semibold tracking-tight mb-5">{title}</h1>{children}</section></div></main>;
}
export const authInput='block mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40';
export const authButton='w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60';
