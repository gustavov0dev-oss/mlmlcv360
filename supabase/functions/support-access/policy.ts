export function canSupportAccess(actor: {id:string;role:string;status:string}, target: {id:string;role:string;status:string}, permissions: Record<string,Record<string,boolean>>) {
 if(actor.id===target.id || actor.status!=='active')return false;
 if(actor.role==='super_admin')return true;
 if(target.status!=='active')return false;
 // A user session must never grant the operator a privileged account.
 if(target.role!=='user')return false;
 return ['admin','super_admin'].includes(actor.role) || permissions[actor.role]?.impersonate_users===true;
}

export function canAccessUnconfirmed(role:string, confirmed:boolean) { return confirmed || role==='super_admin'; }
