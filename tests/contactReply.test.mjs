import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sanitizeHtml from 'sanitize-html';

const source=readFileSync(new URL('../supabase/functions/contact-reply/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const smtp=readFileSync(new URL('../supabase/functions/_shared/smtp.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const compiled=ts.transpile(smtp+'\n'+source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None});
function harness({configured=true,role='admin',providerError=false}={}){
 const reply={id:'11111111-1111-4111-8111-111111111111',author_id:'admin',contact_message_id:'message',state:'draft',subject:'Re: Consulta',body_html:'<p style="text-align: center" onclick="evil()"><strong>Hola</strong><script>evil()</script><a href="javascript:evil()">enlace</a></p>'};
 const message={id:'message',email:'recipient@example.invalid',status:'read'};const calls=[];let handler;let fail=providerError;const config={smtp_host:'smtp.example.invalid',smtp_port:'465',smtp_user:'support@example.invalid',smtp_pass:configured?'fake':''};
 const db={auth:{getUser:async(token)=>({data:{user:token==='valid'?{id:'admin'}:null}})},from(table){let update;const predicates=[];const query={select(){return query;},like(){return query;},eq(k,v){predicates.push(row=>row[k]===v);return query;},neq(k,v){predicates.push(row=>row[k]!==v);return query;},update(value){update=value;return query;},single(){return query;},maybeSingle(){return query;},then(resolve){const row=table==='system_config'?Object.entries(config).map(([key,value])=>({key,value})):table==='profiles'?{id:'admin',role}:table==='contact_messages'?message:reply;const matches=predicates.every(p=>p(row));if(matches&&update)Object.assign(row,update);return Promise.resolve({data:matches?(Array.isArray(row)?row:{...row}):null,error:null}).then(resolve);}};return query;}};
 vm.runInNewContext(compiled,{Deno:{env:{get(name){return {RESEND_API_KEY:configured?'fake-key':'',EMAIL_FROM:'support@example.invalid',SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake'}[name];}},serve(fn){handler=fn;}},createClient:()=>db,sanitizeHtml,Response,Request,Date,AbortSignal,nodemailer:{createTransport:()=>({verify:async()=>true,close(){},sendMail:async(payload)=>{calls.push(payload);if(fail){fail=false;throw new Error('timeout');}return {messageId:'provider-id',accepted:['recipient@example.invalid']};}})}});
 return {reply,message,calls,request:(token='valid',method='POST')=>handler(new Request('https://example.invalid',{method,headers:{Authorization:`Bearer ${token}`},body:method==='POST'?JSON.stringify({reply_id:reply.id}):undefined}))};
}
test('requires authenticated admin and leaves drafts unchanged when mail is unavailable',async()=>{
 for(const opts of [{role:'member'},{configured:false}]){const h=harness(opts);const res=await h.request();assert.equal(res.status,opts.role?403:503);assert.equal(h.reply.state,'draft');assert.equal(h.calls.length,0);}
 const h=harness();assert.equal((await h.request('invalid')).status,401);
});
test('sanitizes formatting, uses stored recipient and records a successful reply only once',async()=>{
 const h=harness();assert.equal((await h.request()).status,200);const body=h.calls[0];assert.equal(body.to[0],'recipient@example.invalid');assert.match(body.html,/<strong>Hola<\/strong>/);assert.doesNotMatch(body.html,/script|onclick|javascript|evil/);assert.equal(h.message.status,'replied');assert.equal(h.reply.state,'sent');await h.request();assert.equal(h.calls.length,1);
});
test('uncertain SMTP delivery cannot be resent automatically',async()=>{
 const h=harness({providerError:true});assert.equal((await h.request()).status,502);assert.equal(h.reply.state,'unknown');assert.equal(h.message.status,'read');assert.equal((await h.request()).status,409);assert.equal(h.calls.length,1);
});

test('SMTP check validates saved configuration without sending messages',async()=>{
 const missing=harness({configured:false});const missingResponse=await missing.request('valid','GET');const detail=await missingResponse.json();assert.equal(detail.configured,false);assert.match(detail.detail,/contraseña/);assert.equal(missing.calls.length,0);
 const ready=harness();const response=await ready.request('valid','GET');assert.equal((await response.json()).configured,true);assert.equal(ready.calls.length,0);
});
