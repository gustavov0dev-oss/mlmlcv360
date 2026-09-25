
// Both exports use the actual receipt, including its scoped styles and logo.
function cloneDocument() {
 const source = document.getElementById('purchase-document');
 if (!source) throw new Error('Comprobante no disponible');
 const root = document.createElement('div');
 root.className = 'purchase-export-root';
 root.style.cssText = 'position:fixed;left:-10000px;top:0;width:718px;background:white;';
 const clone = source.cloneNode(true) as HTMLElement;
 clone.removeAttribute('id');
 clone.classList.add('purchase-export');
 root.appendChild(clone);document.body.appendChild(root);
 return { root, clone };
}
export async function downloadPurchasePdf(order:any, _company:Record<string,string>, _logo:string) {
 const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
 const {root, clone} = cloneDocument();
 try {
  await document.fonts.ready;
  await Promise.all(Array.from(clone.querySelectorAll('img')).map(async image => {
   // Embed assets explicitly: never silently export a receipt without its logo.
   if (!image.src.startsWith('data:')) {
    const response = await fetch(image.src, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('No se pudo cargar el logo');
    const blob = await response.blob();
    image.src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
   }
   if (!image.complete) await new Promise<void>((resolve, reject) => { const timer=setTimeout(()=>reject(new Error('El logo tardó demasiado en cargar')),15000); image.onload=()=>{clearTimeout(timer);resolve();}; image.onerror=()=>{clearTimeout(timer);reject(new Error('Logo no disponible'));}; });
   if (!image.naturalWidth) throw new Error('No se pudo cargar el logo');
  }));
  const canvas = await html2canvas(clone, {scale:2, useCORS:true, backgroundColor:'#ffffff', windowWidth:1200, logging:false});
  const doc = new jsPDF({unit:'mm',format:'a4'});
  const scale = canvas.width / clone.getBoundingClientRect().width;
  const top = clone.getBoundingClientRect().top;
  const blocks = Array.from(clone.querySelectorAll('header, tr, section, footer')).map(el => {
    const r=el.getBoundingClientRect();return {start:Math.floor((r.top-top)*scale),end:Math.ceil((r.bottom-top)*scale)};
  });
  const maxHeight = Math.floor(canvas.width * 277 / 190);
  let y=0;
  while(y < canvas.height) {
   let end=Math.min(y+maxHeight,canvas.height);
   const crossing=blocks.find(b=>b.start>y && b.start<end && b.end>end);
   if(crossing) end=crossing.start;
   if(y) doc.addPage();
   const page=document.createElement('canvas');page.width=canvas.width;page.height=end-y;
   page.getContext('2d')!.drawImage(canvas,0,y,canvas.width,end-y,0,0,canvas.width,end-y);
   doc.addImage(page.toDataURL('image/png'),'PNG',10,10,190,(end-y)*190/canvas.width);
   y=end;
  }
  doc.save(`${order.order_number}.pdf`);
 } finally { root.remove(); }
}
export function printPurchaseDocument(){ window.print(); }
export function installPurchasePrint(){
 const cleanup=()=>document.getElementById('purchase-print-root')?.remove();
 const prepare=()=>{
  cleanup();
  const source=document.getElementById('purchase-document');if(!source)return;
  const root=document.createElement('div');root.id='purchase-print-root';
  const clone=source.cloneNode(true) as HTMLElement;clone.removeAttribute('id');clone.classList.add('purchase-export');root.appendChild(clone);
  const style=document.createElement('style');style.textContent='@media screen{#purchase-print-root{display:none}}@media print{@page{size:A4;margin:10mm}html,body{height:auto!important;overflow:visible!important}body>:not(#purchase-print-root){display:none!important}#purchase-print-root{display:block!important}#purchase-print-root *{visibility:visible!important}#purchase-print-root tr,#purchase-print-root section,#purchase-print-root header,#purchase-print-root footer{break-inside:avoid}#purchase-print-root thead{display:table-header-group}}';
  root.appendChild(style);document.body.appendChild(root);
 };
 window.addEventListener('beforeprint',prepare);window.addEventListener('afterprint',cleanup);
 return()=>{window.removeEventListener('beforeprint',prepare);window.removeEventListener('afterprint',cleanup);cleanup();};
}
