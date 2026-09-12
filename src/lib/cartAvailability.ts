import type { Product, ProductVariant } from './storeTypes';

export function availableCartVariant(product: Product, variantId: string | undefined, quantity: number) {
 if(!Number.isInteger(quantity)||quantity<1)throw new Error('Selecciona una cantidad válida.');
 if(product.status!=='active')throw new Error('Este producto ya no está disponible.');
 const variants=(product.variants||[]).filter(v=>v.status==='active');
 const variant:ProductVariant|undefined=variantId?variants.find(v=>v.id===variantId):variants.find(v=>!product.track_stock||v.stock>0);
 if((variantId||(product.variants||[]).length)&&!variant)throw new Error('Esta presentación está agotada. Elige otra disponible.');
 const stock=Number(variant?.stock??product.general_stock??0);
 if(product.track_stock&&quantity>stock)throw new Error(stock>0?`Solo quedan ${stock} unidades disponibles.`:'Producto agotado.');
 return variant;
}
