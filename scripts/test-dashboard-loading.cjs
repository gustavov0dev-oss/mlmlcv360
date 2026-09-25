const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const assert=require('node:assert/strict');
const source=fs.readFileSync('src/components/dashboard/AccountOverview.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
for(const role of ['super_admin','admin','user','support']){
 const m={exports:{}};
 const imports=id=>{
  if(id==='@/store/authStore')return {useAuthStore:()=>({user:{id:role,role,full_name:'Gustavo'}})};
  if(id.startsWith('@/'))return new Proxy({},{get:()=>()=>null});
  return require(id);
 };
 new Function('require','module','exports',js)(imports,m,m.exports);
 for(const report of [false,true]){
  const html=renderToStaticMarkup(React.createElement(m.exports.default,{report}));
  assert.match(html,/Cargando tu dashboard/);
  assert.doesNotMatch(html,/Hola,|Resumen del negocio|Panel de operaciones/,'Never guess role-specific content before permissions load');
  assert.doesNotMatch(html,/animate-/,'Initial dashboard must not animate');
 }
}
console.log('Initial loading: no guessed role heading for four roles, dashboard and reports.');
