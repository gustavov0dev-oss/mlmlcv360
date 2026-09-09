export interface WhatsAppContact {id:string;name:string;description:string;number:string;message:string;enabled:boolean;photo?:string}
export interface WhatsAppConfig {enabled:boolean;position:'left'|'right';title:string;description:string;contacts:WhatsAppContact[]}
export function validContactPhoto(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}}
export const whatsappKey='whatsapp_widget';
export const cleanWhatsAppNumber=(value:string)=>value.replace(/[\s()+-]/g,'');
export const validWhatsAppNumber=(value:string)=>/^[1-9]\d{7,14}$/.test(cleanWhatsAppNumber(value));
export function parseWhatsAppConfig(map:Record<string,string>):WhatsAppConfig {
 if(map[whatsappKey]){
  const value=JSON.parse(map[whatsappKey]);
  if(typeof value.enabled!=='boolean'||!['left','right'].includes(value.position)||typeof value.title!=='string'||typeof value.description!=='string'||!Array.isArray(value.contacts)||value.contacts.length>12)throw new Error('Configuración inválida');
  const ids=new Set();
  for(const row of value.contacts){if(!row||typeof row.id!=='string'||ids.has(row.id)||typeof row.enabled!=='boolean'||!['name','description','number','message'].every(key=>typeof row[key]==='string'))throw new Error('Contacto inválido');ids.add(row.id);}
  return value;
 }
 return {enabled:map.whatsapp_enabled==='true',position:map.whatsapp_position?.includes('left')?'left':'right',title:'Conversemos por WhatsApp',description:'Elige con quién deseas hablar. Estamos para ayudarte.',contacts:map.whatsapp_number?[{id:'main',name:'Atención al cliente',description:'Consultas e información',number:map.whatsapp_number,message:map.whatsapp_message||'Hola, quisiera más información.',enabled:true}]:[]};
}
export function validateWhatsAppConfig(config:WhatsAppConfig){
 if(!config.title.trim()||config.title.length>70||config.description.length>200)return 'Escribe un título de hasta 70 caracteres y una descripción de hasta 200.';
 if(config.enabled&&!config.contacts.some(row=>row.enabled))return 'Agrega y activa al menos un contacto antes de mostrar el botón.';
 for(const row of config.contacts){if(row.photo&&!validContactPhoto(row.photo))return 'La foto debe ser una URL HTTPS válida o quedar vacía.';if(!row.name.trim()||row.name.length>70||row.description.length>120||row.message.length>1000||!validWhatsAppNumber(row.number))return 'Cada contacto necesita nombre y número con código de país (8 a 15 dígitos). Revisa también los límites de texto.';}
 return null;
}
export function whatsappLink(contact:WhatsAppContact){return `https://wa.me/${cleanWhatsAppNumber(contact.number)}?text=${encodeURIComponent(contact.message)}`;}
