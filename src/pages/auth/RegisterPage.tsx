import { Link, Navigate } from '@/lib/router';
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { LogoWithText } from '@/components/Logo';
import { authDestination } from '@/lib/authDestination';
export default function RegisterPage(){
 const {user}=useAuthStore();const {company,logoValue,logoSizes}=useConfig();const destination=authDestination();
 if(user)return <Navigate to={destination}/>;
 return <main className="min-h-screen bg-background px-5 py-8 sm:py-12"><div className="max-w-lg mx-auto"><Link to="/" className="inline-block mb-8"><LogoWithText value={logoValue} fallbackText={company.company_name||'CLUV 360'} pixelSize={logoSizes.login||36}/></Link><h1 className="text-3xl font-bold mb-2">Crea tu cuenta</h1><p className="text-muted-foreground mb-7">Empieza a usar la plataforma. Puedes activar una membresía cuando quieras.</p><RegistrationForm destination={destination} allowPlan={destination==='/dashboard'}/></div></main>;
}
