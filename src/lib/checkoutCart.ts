// Device-local checkout snapshots never establish payment status: the server does.
export type CheckoutSnapshot = { userId:string; orderId:string; fingerprint:string; items:Array<{id:string;quantity:number}> };
const KEY='cluv360_checkout_snapshots';
export function checkoutSnapshots():CheckoutSnapshot[]{
 try {return JSON.parse(localStorage.getItem(KEY)||'[]');} catch{return [];}
}
export function rememberCheckout(snapshot:CheckoutSnapshot){
 localStorage.setItem(KEY,JSON.stringify([...checkoutSnapshots().filter(s=>s.orderId!==snapshot.orderId),snapshot].slice(-20)));
}
export function forgetCheckout(orderId:string){localStorage.setItem(KEY,JSON.stringify(checkoutSnapshots().filter(s=>s.orderId!==orderId)));}
export function subtractPurchased<T extends {id:string;quantity:number}>(items:T[], purchased:CheckoutSnapshot['items']):T[]{
 return items.flatMap(item=>{const quantity=item.quantity-(purchased.find(p=>p.id===item.id)?.quantity||0);return quantity>0?[{...item,quantity}]:[];});
}
