import { type OpportunitySection } from './opportunityContent';
export { parseOpportunitySection as parseContactSection } from './opportunityContent';
export const contactTabs = [{id:'hero',label:'Hero'},{id:'channels',label:'Datos de contacto'},{id:'form',label:'Formulario'},{id:'map',label:'Mapa'},{id:'faq',label:'Preguntas frecuentes'}] as const;
export type ContactTab = typeof contactTabs[number]['id'];
export const contactKey = (tab: ContactTab) => `contact_page_${tab}`;
export function contactDefaults(company: Record<string,string> = {}): Record<ContactTab,OpportunitySection> {
 const name=company.company_name || 'MLM 360';
 return {
 hero:{text:{badge:'Respondemos en menos de 24h',title:'¿En qué podemos ayudarte?',highlight:'ayudarte?',subtitle:company.company_tagline || 'Nuestro equipo está disponible para resolver tus dudas, escuchar tus sugerencias y ayudarte a crecer.'},items:[]},
 channels:{text:{email_label:'Email',email:company.company_email ?? company.contact_email ?? 'contacto@mlm360.pe',phone_label:'Teléfono',phone:company.company_phone ?? company.phone ?? '',address_label:'Dirección',address:company.company_address ?? company.address ?? ''},items:[]},
 form:{text:{title:'Envíanos un mensaje',subtitle:'Te responderemos lo antes posible.',name_label:'Nombre',name_placeholder:'Tu nombre',email_label:'Email',email_placeholder:'tu@email.com',subject_label:'Asunto',subject_placeholder:'¿Sobre qué nos escribes?',message_label:'Mensaje',message_placeholder:'Cuéntanos en qué podemos ayudarte...',submit_label:'Enviar mensaje',sending_label:'Enviando...',success_title:'Mensaje enviado',success_description:'Te responderemos en menos de 24 horas.',another_label:'Enviar otro mensaje'},items:[]},
 map:{text:{query:company.company_address ?? company.address ?? '',title:`Ubicación ${name}`,directions_label:'Cómo llegar →'},items:[]},
 faq:{text:{badge:'FAQ',title:'Preguntas frecuentes',highlight:'frecuentes',subtitle:'Las dudas más comunes de nuestros afiliados. Si tienes más preguntas, escríbenos.'},items:[
 {title:`¿Cómo creo una cuenta en ${name}?`,desc:'Ve a la página de registro, completa tus datos y recibirás acceso inmediato al dashboard. No necesitas tarjeta de crédito.'},
 {title:'¿Cuánto tardan en acreditarse las comisiones?',desc:'Las comisiones se acreditan en menos de 60 segundos después de cada venta. Puedes verlas en tiempo real en tu dashboard.'},
 {title:'¿Qué métodos de pago aceptan?',desc:'Aceptamos Yape, Plin, tarjetas de crédito y transferencias bancarias. Para retiros, puedes usar Yape, Plin o transferencia bancaria.'},
 {title:'¿Puedo usar la plataforma desde mi celular?',desc:'Sí, la plataforma es 100% responsive. Puedes gestionar tu red, ver comisiones y realizar todas las operaciones desde tu móvil.'},
 {title:'¿Cómo contacto a soporte?',desc:'Puedes escribirnos por email o mediante el formulario de esta página. Respondemos en menos de 24 horas.'},
 {title:'¿Hay algún costo de permanencia?',desc:'No. Puedes empezar con una cuenta gratuita y escalar cuando tu negocio lo necesite. Sin contratos de permanencia.'},
 ].map((item,i)=>({...item,id:`faq-${i}`,is_active:true}))},
 };
}
export const contactLabels: Record<string,string> = {badge:'Etiqueta superior',title:'Título',highlight:'Texto destacado del título',subtitle:'Descripción',email_label:'Etiqueta de email',email:'Email de contacto',phone_label:'Etiqueta de teléfono',phone:'Teléfono',address_label:'Etiqueta de dirección',address:'Dirección',name_label:'Etiqueta de nombre',name_placeholder:'Ejemplo para nombre',email_placeholder:'Ejemplo para email',subject_label:'Etiqueta de asunto',subject_placeholder:'Ejemplo para asunto',message_label:'Etiqueta de mensaje',message_placeholder:'Ejemplo para mensaje',submit_label:'Texto del botón enviar',sending_label:'Texto durante el envío',success_title:'Título de confirmación',success_description:'Descripción de confirmación',another_label:'Texto para enviar otro mensaje',query:'Ubicación o dirección para el mapa',directions_label:'Texto del enlace de indicaciones'};
export function validContactMessage(form: {name:string;email:string;subject:string;message:string}) {
 return form.name.trim().length>0 && form.name.trim().length<=120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && form.email.trim().length<=254 && form.subject.length<=200 && form.message.trim().length>0 && form.message.trim().length<=5000;
}
