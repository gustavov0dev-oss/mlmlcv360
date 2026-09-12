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
 doc.setFontSize(11);doc.text('CONSTANCIA DE COMPRA',194,18,{align:'right'});doc.setFontSize(9);doc.text([order.order_number,new Date(order.created_at).toLocaleDateString('es-PE'),order.payment_status==='paid'?'PAGO CONFIRMADO':'PAGO PENDIENTE'],194,25,{align:'right'});
 const addr=order.billing_address||order.shipping_address||{};const shipping=order.shipping_address||{};
 autoTable(doc,{startY:top+28,theme:'plain',body:[['Cliente',addr.razon_social||addr.full_name||shipping.full_name||'No registrado'],['Documento',addr.ruc||addr.dni||'No registrado'],['Dirección',[addr.address||shipping.address,shipping.district,shipping.city,shipping.region].filter(Boolean).join(', ')]],styles:{fontSize:9,cellPadding:2},columnStyles:{0:{cellWidth:25,fontStyle:'bold'}},margin:{left:16,right:16}});
 autoTable(doc,{head:[['Descripción','Cant.','Precio unitario','Importe']],body:(order.items||[]).map((i:any)=>[[i.product_name,i.variant_name,i.sku?`SKU: ${i.sku}`:''].filter(Boolean).join('\n'),i.quantity,money(i.unit_price),money(i.total)]),theme:'striped',styles:{fontSize:9,cellPadding:4},headStyles:{fillColor:[239,241,244],textColor:[30,40,50]},columnStyles:{0:{cellWidth:95},1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}},margin:{left:16,right:16}});
 autoTable(doc,{theme:'plain',body:[['Subtotal',money(order.subtotal)],...(Number(order.discount_amount)>0?[['Descuento',money(-order.discount_amount)]]:[]),['Envío',money(order.shipping_amount)],[Math.abs(Number(order.total)-(Number(order.subtotal)-Number(order.discount_amount||0)+Number(order.shipping_amount||0)))<0.02?'Impuesto incluido':'Impuesto',money(order.tax_amount)],['Total',money(order.total)]],styles:{fontSize:10,cellPadding:3},columnStyles:{1:{halign:'right',fontStyle:'bold'}},margin:{left:105,right:16}});
 autoTable(doc,{theme:'plain',body:[['Método de pago',order.payment_method||'No registrado'],['Entrega',order.shipping_method_name||'No registrada'],['','Gracias por tu compra']],styles:{fontSize:9},margin:{left:16,right:16}});
 doc.save(`${order.order_number}.pdf`);
}

export async function printPurchaseDocument(){
 const source=document.getElementById('purchase-document');if(!source)return;
 const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:0;height:0;border:0';document.body.appendChild(frame);
 const target=frame.contentDocument!;target.open();target.write('<!doctype html><html><head><title>Constancia de compra</title></head><body>'+source.outerHTML+'</body></html>');target.close();
 await Promise.all(Array.from(target.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
 frame.contentWindow!.focus();frame.contentWindow!.print();setTimeout(()=>frame.remove(),60000);
}
