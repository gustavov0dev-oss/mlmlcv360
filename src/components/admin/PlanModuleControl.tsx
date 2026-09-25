import {useState} from 'react';
import {useConfig} from '@/store/configStore';
import {useDatabase} from '@/lib/backend';
import {Switch} from '@/components/ui/switch';
import {toast} from 'sonner';
export default function PlanModuleControl({kind}:{kind:'system'|'mlm'}){
 const {company,refresh}=useConfig();const database=useDatabase();const [saving,setSaving]=useState(false);
 const key=kind==='system'?'system_plans_enabled':'mlm_packs_enabled';
 const enabled=company[key]!=='false';
 return <div className="flex items-start justify-between gap-6 border-b border-border pb-5 mb-5"><div><label htmlFor={key} className="font-semibold">{kind==='system'?'Ofrecer planes del sistema':'Ofrecer packs MLM'}</label><p className="mt-2 text-sm text-muted-foreground max-w-xl">{kind==='system'?'Permite contratar nuevas membresías. Al desactivarlo, el registro y la tienda siguen disponibles; las membresías existentes conservan sus beneficios y renovaciones.':'Muestra los packs en la tienda. Al desactivarlo, se siguen vendiendo productos individuales y se conservan los pedidos anteriores.'}</p></div><Switch id={key} checked={enabled} disabled={saving} onCheckedChange={async value=>{setSaving(true);try{const r=await database.upsert('system_config',{key,value:String(value),category:'plans',is_sensitive:false,updated_at:new Date().toISOString()},'key');if(r.error)throw r.error;await refresh();toast.success('Disponibilidad actualizada');}catch{toast.error('No se pudo guardar el cambio');}finally{setSaving(false);}}}/></div>;
}
