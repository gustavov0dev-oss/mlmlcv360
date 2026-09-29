import { Navigate } from '@/lib/router';
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuthStore } from '@/store/authStore';
import { authDestination } from '@/lib/authDestination';
export default function RegisterPage(){
 const {user}=useAuthStore();const destination=authDestination();
 if(user && sessionStorage.getItem('cluv-registration-pending')!=='1')return <Navigate to={destination}/>;
 return <AuthLayout title="Crea tu cuenta"><RegistrationForm destination={destination} allowPlan={destination==='/dashboard'}/></AuthLayout>;
}
