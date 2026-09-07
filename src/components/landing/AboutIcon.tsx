import { ShieldCheck, Rocket, TrendingUp, Globe, Building2, Award, Target, HeartHandshake, Cloud, Shield, Database, Cpu, Lock, Zap, Star, Users, Sparkles, Briefcase, Home, GraduationCap, Headphones, Lightbulb, Compass, Flag, Gift, type LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = { ShieldCheck, Rocket, TrendingUp, Globe, Building2, Award, Target, HeartHandshake, Cloud, Shield, Database, Cpu, Lock, Zap, Star, Users, Sparkles, Briefcase, Home, GraduationCap, Headphones, Lightbulb, Compass, Flag, Gift };
export const ABOUT_ICON_OPTIONS = Object.keys(icons);
export function AboutIcon({ name, className, strokeWidth = 1.75 }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = Object.prototype.hasOwnProperty.call(icons, name) ? icons[name] : Sparkles;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
