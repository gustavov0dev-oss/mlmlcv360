export function findProfilePhoto(html:string):string|null {
 for(const tag of html.match(/<img\b[^>]*>/gi)||[]){
  const src=tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
  if(!src)continue;
  const decoded=src.replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,code)=>String.fromCharCode(Number(code)));
  try{const url=new URL(decoded);if(url.protocol==='https:'&&url.hostname==='pps.whatsapp.net'&&!url.port&&!url.username&&!url.password)return url.href;}catch{/* Not a profile image URL. */}
 }
 return null;
}
export async function limitedBytes(response:Response,max:number){
 if(!response.ok||!response.body)throw new Error('unavailable');
 const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new Error('too_large');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export function imageType(bytes:Uint8Array){
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';
 if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
