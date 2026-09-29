import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../supabase/functions/exchange-rate/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
async function run(overrides={}) {
 let handler, calls=0, saved=[];
 const config={fixer_api_key:'test-only-not-real',exchange_rate_usd:'3.7',...overrides.config};
 const db={auth:{getUser:async()=>({data:{user:overrides.anonymous?null:{id:'fixture'}}})},
  rpc:async()=>({data:overrides.claimed??true,error:null}),
  from:table=>({select:()=>({eq:()=>({single:async()=>({data:{role:overrides.role??'admin'}})}),in:async()=>({data:Object.entries(config).map(([key,value])=>({key,value}))})}),
  upsert:async values=>{saved=values;return {error:overrides.saveError?{}:null}}})};
 vm.runInNewContext(code,{Deno:{env:{get:()=>''},serve:fn=>handler=fn},createClient:()=>db,Response,AbortSignal,URL,
 fetch:async()=>{calls++;if(overrides.networkError)throw new Error('offline');return {ok:true,json:async()=>overrides.reply??{success:true,rates:{USD:1.2,PEN:4.44},date:'2026-09-27'}}}});
 const response=await handler(new Request('https://example.invalid',{headers:{Authorization:'Bearer fixture'}}));
 return {body:await response.json(),status:response.status,calls,saved};
}
assert.equal((await run({anonymous:true})).status,401);
assert.equal((await run({role:'user'})).status,403);
assert.equal((await run({config:{fixer_api_key:''}})).calls,0);
const denied=await run({claimed:false});assert.equal(denied.calls,0);assert.equal(denied.body.success,false);
const stamp=new Date().toISOString();
const cached=await run({claimed:false,config:{exchange_rate_last_attempt:stamp,exchange_rate_last_success:stamp}});
assert.equal(cached.calls,0);assert.equal(cached.body.cached,true);
const success=await run();assert.equal(success.body.rate,3.7);assert.equal(success.saved.length,2);
const quota=await run({reply:{success:false,error:{code:104}}});assert.equal(quota.body.success,false);assert.equal(quota.saved.length,0);assert.match(quota.body.error,/cuota/);
assert.equal((await run({networkError:true})).saved.length,0);
assert.equal((await run({saveError:true})).body.success,false);
console.log('9 exchange-rate scenarios passed; no external calls or real credentials used.');
