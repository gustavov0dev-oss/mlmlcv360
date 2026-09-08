import nodemailer from 'npm:nodemailer@10.0.1';

// SMTP transport has no dependency on the database or Supabase client.
export function smtpSettings(config:Record<string,string>){
 const host=(config.smtp_host||'').trim();const user=(config.smtp_user||'').trim();
 const pass=config.smtp_pass||config.smtp_password||'';
 const from=(config.smtp_from_email||user).trim();const name=config.smtp_name||config.smtp_from_name||'';
 const port=Number(config.smtp_port||465);
 const missing=[!host&&'servidor',!user&&'usuario',!pass&&'contraseña',!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)&&'correo de envío'].filter(Boolean);
 if(!Number.isInteger(port)||port<1||port>65535)missing.push('puerto válido');
 return {host,user,pass,from,name,port,missing};
}
export function smtpTransport(settings:ReturnType<typeof smtpSettings>){
 return nodemailer.createTransport({host:settings.host,port:settings.port,secure:settings.port===465,requireTLS:settings.port!==465,auth:{user:settings.user,pass:settings.pass},connectionTimeout:5000,greetingTimeout:5000,socketTimeout:10000,dnsTimeout:5000,disableFileAccess:true,disableUrlAccess:true});
}
export function smtpFailure(error:any){
 // SMTP has no idempotency API. Only retry a definite rejection/pre-delivery failure.
 const rejected=error?.code==='EAUTH'||error?.code==='EENVELOPE'||error?.code==='EDNS'||error?.command==='CONN'||(error?.responseCode>=400&&error?.responseCode<600);
 return rejected?'failed':'unknown';
}
