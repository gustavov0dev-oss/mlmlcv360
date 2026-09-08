import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/backend/client';
export const contactInboxChanged=()=>window.dispatchEvent(new Event('contact-inbox-updated'));
export function useContactNotifications(enabled:boolean){
 const [count,setCount]=useState(0);
 const [messages,setMessages]=useState<{id:string;name:string;subject:string;created_at:string}[]>([]);
 const refresh=useCallback(async()=>{if(!enabled)return;
  const {data,error,count:total}=await supabase.from('contact_messages').select('id,name,subject,created_at',{count:'exact'}).eq('status','new').order('created_at',{ascending:false}).limit(3);
  if(!error){setCount(total||0);setMessages(data||[]);}
 },[enabled]);
 useEffect(()=>{if(!enabled){setCount(0);setMessages([]);return;}void refresh();const timer=setInterval(refresh,30000);window.addEventListener('contact-inbox-updated',refresh);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('contact-inbox-updated',refresh);window.removeEventListener('focus',refresh);};},[enabled,refresh]);
 return {count,messages,refresh};
}
