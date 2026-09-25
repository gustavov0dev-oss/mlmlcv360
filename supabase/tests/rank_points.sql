-- Run against a test copy; all fixtures and changes are rolled back.
begin;
do $$
declare admin_id uuid; member_id uuid; request_id uuid:=gen_random_uuid(); before_points numeric; order_id_ uuid;
begin
 select id into admin_id from profiles where role='super_admin' limit 1;
 select id into member_id from profiles where role not in ('admin','super_admin') limit 1;
 select id into order_id_ from orders limit 1;
 if admin_id is null or member_id is null or order_id_ is null then raise exception 'Existing admin, member and order required';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 before_points:=rank_points_total(member_id);
 update profiles set rank='qa-before' where id=member_id;
 insert into ranks(name,slug,min_affiliates,min_volume,sort_order,is_active,auto_qualify) values('QA automatic','qa-auto',0,before_points+2100,999,true,true);
 perform add_rank_points(member_id,2000,'Prueba venta terreno','qa-'||request_id,request_id);
 perform add_rank_points(member_id,2000,'Prueba venta terreno','qa-'||request_id,request_id);
 if rank_points_total(member_id)<>before_points+2000 then raise exception 'Duplicate points';end if;
 if (select rank from profiles where id=member_id)='qa-auto' then raise exception 'Early promotion';end if;
 insert into mlm_point_entries(user_id,order_id,kind,points,source_key,description) values(member_id,order_id_,'volume',100,'qa-points','Prueba producto');
 if rank_points_total(member_id)<>before_points+2100 or (select rank from profiles where id=member_id)<>'qa-auto' then raise exception 'Combined points promotion failed';end if;
 update mlm_point_entries set reversed_at=now() where user_id=member_id and source_key='qa-points';
 if rank_points_total(member_id)<>before_points+2000 then raise exception 'Refund points mismatch';end if;
 if (select rank from profiles where id=member_id)<>'qa-auto' then raise exception 'Unexpected downgrade';end if;
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 begin perform add_rank_points(member_id,100,'Unauthorized test','qa-forbidden',gen_random_uuid());raise exception 'Permission bypass';exception when insufficient_privilege then null;end;
 begin perform rank_points_progress(admin_id);raise exception 'Read bypass';exception when insufficient_privilege then null;end;
end $$;
rollback;
