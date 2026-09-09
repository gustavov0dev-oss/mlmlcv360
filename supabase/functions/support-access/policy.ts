export function canSupportAccess(actor: {id:string;role:string;status:string}, target: {id:string;role:string;status:string}, permissions: Record<string,Record<string,boolean>>) {
 if(actor.id===target.id || actor.status!=='active' || target.status!=='active')return false;
 // A user session must never grant the operator a privileged account.
 if(target.role!=='user')return false;
 return ['admin','super_admin'].includes(actor.role) || permissions[actor.role]?.impersonate_users===true;
}
