import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function downloadPurchasePdf(order:any,company:Record<string,string>,logo:string){
 const doc=new jsPDF();
 const money=(n:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:order.currency||'PEN'}).format(Number(n)||0);
 let top=18;
 if(logo){try{const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=reject;image.src=logo;});const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d')!.drawImage(img,0,0);doc.addImage(canvas.toDataURL('image/png'),'PNG',16,14,40,Math.min(18,40*img.height/img.width));top=38;}catch{/* Company name remains available when the remote logo cannot load. */}}
 doc.setFontSize(15);doc.setFont('helvetica','bold');doc.text(company.company_name||'CLUV 360',16,top);
 doc.setFontSize(10);doc.setFont('helvetica','normal');
 const companyLines=[`RUC: ${company.company_ruc||'No registrado'}`,company.company_address,[company.company_phone,company.company_email].filter(Boolean).join(' · ')].filter(Boolean);
 doc.text(doc.splitTextToSize(companyLines.join('\n'),110),16,top+7);
 doc.setFontSize(11);doc.text('COMPROBANTE DE COMPRA',194,18,{align:'right'});doc.setFontSize(9);doc.text([order.order_number,new Date(order.created_at).toLocaleDateString('es-PE'),order.payment_status==='paid'?'PAGO CONFIRMADO':'PAGO PENDIENTE'],194,25,{align:'right'});
 const addr=order.billing_address||order.shipping_address||{};const shipping=order.shipping_address||{};
 autoTable(doc,{startY:top+28,theme:'plain',body:[['Cliente',addr.razon_social||addr.full_name||shipping.full_name||'No registrado'],['Documento',addr.ruc||addr.dni||'No registrado'],['Dirección',[addr.address||shipping.address,shipping.district,shipping.city,shipping.region].filter(Boolean).join(', ')]],styles:{fontSize:9,cellPadding:2},columnStyles:{0:{cellWidth:25,fontStyle:'bold'}},margin:{left:16,right:16}});
 autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+8,head:[['Descripción','Cant.','Precio unitario','Importe']],body:(order.items||[]).map((i:any)=>[[i.product_name,i.variant_name,i.sku?`SKU: ${i.sku}`:''].filter(Boolean).join('\n'),i.quantity,money(i.unit_price),money(i.total)]),theme:'striped',styles:{fontSize:9,cellPadding:4},headStyles:{fillColor:[239,241,244],textColor:[30,40,50]},columnStyles:{0:{cellWidth:95},1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}},margin:{left:16,right:16}});
 autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+8,theme:'plain',body:[['Subtotal',money(order.subtotal)],...(Number(order.discount_amount)>0?[['Descuento',money(-order.discount_amount)]]:[]),['Envío',money(order.shipping_amount)],[Math.abs(Number(order.total)-(Number(order.subtotal)-Number(order.discount_amount||0)+Number(order.shipping_amount||0)))<0.02?'Impuesto incluido':'Impuesto',money(order.tax_amount)],['Total',money(order.total)]],styles:{fontSize:10,cellPadding:3},columnStyles:{1:{halign:'right',fontStyle:'bold'}},margin:{left:105,right:16}});
 autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+12,theme:'plain',body:[['Método de pago',order.payment_method||'No registrado'],['Entrega',order.shipping_method_name||'No registrada'],['',`Gracias por confiar en ${company.company_name||'nosotros'}`],['',[company.company_email,company.company_phone].filter(Boolean).join(' · ')]],styles:{fontSize:9},margin:{left:16,right:16}});
 doc.save(`${order.order_number}.pdf`);
}

export function printPurchaseDocument(){
 // Keep the native browser print dialog in the initiating user gesture.
 // The document's print stylesheet also applies to Ctrl/Cmd+P.
 window.print();
}

export function installPurchasePrint(){
 const prepare=()=>{
  document.getElementById('purchase-print-root')?.remove();
  const source=document.getElementById('purchase-document');if(!source)return;
  const root=document.createElement('div');root.id='purchase-print-root';root.appendChild(source.cloneNode(true));
  const style=document.createElement('style');style.textContent='@media screen{#purchase-print-root{display:none}}@media print{body>:not(#purchase-print-root){display:none!important}#purchase-print-root{display:block!important}#purchase-print-root #purchase-document{position:static!important;width:auto!important}}';
  root.appendChild(style);document.body.appendChild(root);
 };
 const cleanup=()=>document.getElementById('purchase-print-root')?.remove();
 window.addEventListener('beforeprint',prepare);window.addEventListener('afterprint',cleanup);
 return()=>{window.removeEventListener('beforeprint',prepare);window.removeEventListener('afterprint',cleanup);cleanup();};
}
