import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sanitizeHtml from 'sanitize-html';

const source=readFileSync(new URL('../supabase/functions/contact-reply/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const compiled=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None});
function harness({configured=true,role='admin',providerError=false}={}){
 const reply={id:'11111111-1111-4111-8111-111111111111',author_id:'admin',contact_message_id:'message',state:'draft',subject:'Re: Consulta',body_html:'<p style="text-align: center" onclick="evil()"><strong>Hola</strong><script>evil()</script><a href="javascript:evil()">enlace</a></p>'};
 const message={id:'message',email:'recipient@example.invalid',status:'read'};const calls=[];let handler;let fail=providerError;
 const db={auth:{getUser:async(token)=>({data:{user:token==='valid'?{id:'admin'}:null}})},from(table){let update;const predicates=[];const query={select(){return query;},eq(k,v){predicates.push(row=>row[k]===v);return query;},neq(k,v){predicates.push(row=>row[k]!==v);return query;},update(value){update=value;return query;},single(){return query;},maybeSingle(){return query;},then(resolve){const row=table==='profiles'?{id:'admin',role}:table==='contact_messages'?message:reply;const matches=predicates.every(p=>p(row));if(matches&&update)Object.assign(row,update);return Promise.resolve({data:matches?{...row}:null,error:null}).then(resolve);}};return query;}};
 vm.runInNewContext(compiled,{Deno:{env:{get(name){return {RESEND_API_KEY:configured?'fake-key':'',EMAIL_FROM:'support@example.invalid',SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake'}[name];}},serve(fn){handler=fn;}},createClient:()=>db,sanitizeHtml,Response,Request,Date,AbortSignal,fetch:async(url,options)=>{calls.push({url,...options});if(fail){fail=false;throw new Error('timeout');}return new Response(JSON.stringify({id:'provider-id'}),{status:200});}});
 return {reply,message,calls,request:(token='valid')=>handler(new Request('https://example.invalid',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({reply_id:reply.id})}))};
}
test('requires authenticated admin and leaves drafts unchanged when mail is unavailable',async()=>{
 for(const opts of [{role:'member'},{configured:false}]){const h=harness(opts);const res=await h.request();assert.equal(res.status,opts.role?403:503);assert.equal(h.reply.state,'draft');assert.equal(h.calls.length,0);}
 const h=harness();assert.equal((await h.request('invalid')).status,401);
});
test('sanitizes formatting, uses stored recipient and records a successful reply only once',async()=>{
 const h=harness();assert.equal((await h.request()).status,200);const body=JSON.parse(h.calls[0].body);assert.deepEqual(body.to,['recipient@example.invalid']);assert.match(body.html,/<strong>Hola<\/strong>/);assert.doesNotMatch(body.html,/script|onclick|javascript|evil/);assert.equal(h.message.status,'replied');assert.equal(h.reply.state,'sent');await h.request();assert.equal(h.calls.length,1);
});
test('uncertain retries reuse the same payload and idempotency key; old attempts are blocked',async()=>{
 const h=harness({providerError:true});assert.equal((await h.request()).status,502);assert.equal(h.reply.state,'unknown');assert.equal(h.message.status,'read');assert.equal((await h.request()).status,200);assert.equal(h.calls[0].body,h.calls[1].body);assert.equal(h.calls[0].headers['Idempotency-Key'],h.calls[1].headers['Idempotency-Key']);
 const old=harness({providerError:true});await old.request();old.reply.attempted_at=new Date(Date.now()-24*60*60*1000).toISOString();assert.equal((await old.request()).status,409);assert.equal(old.calls.length,1);
});
