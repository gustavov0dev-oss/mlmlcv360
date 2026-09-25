export function planAccent(color?:string){return color&&/^#[0-9a-f]{6}$/i.test(color)?color:'hsl(var(--primary))';}
