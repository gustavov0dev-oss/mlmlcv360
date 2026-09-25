-- Integration assertions; all fixtures and lifecycle changes are rolled back.
begin;
create temporary table pack_fixture(k text primary key,v uuid);
insert into pack_fixture select 'user',id from profiles where role='user' limit 1;
insert into pack_fixture select 'sponsor',id from profiles where id<>(select v from pack_fixture where k='user') limit 1;
grant select on pack_fixture to authenticated,anon;
do $$ declare u uuid;s uuid;a uuid;b uuid;p uuid;x uuid;y uuid;sel jsonb;r jsonb;o uuid;n numeric;begin
 select v into u from pack_fixture where k='user';select v into s from pack_fixture where k='sponsor';if u is null or s is null then raise exception 'No test identity';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);update profiles set sponsor_id=s where id=u;
 insert into products(name,slug,base_price,status,points,general_stock,track_stock,currency,earning_type,earning_value) values('Fixture A','fixture-'||gen_random_uuid(),100,'active',80,20,true,'PEN','fixed',7) returning id into a;
 insert into products(name,slug,base_price,status,points,general_stock,track_stock,currency) values('Fixture B','fixture-'||gen_random_uuid(),40,'active',20,10,true,'PEN') returning id into b;
 insert into mlm_packs(name,kind,price,active,min_units,max_units,max_price,max_points,promo_base,promo_total,promo_extra,commissionable_points,earning_type,earning_value) values('Fixture selectable','selectable',500,true,2,5,500,400,5,8,100,500,'price_percentage',10) returning id into p;
 insert into pack_fixture values('pack',p),('product',a);
 insert into mlm_pack_products(pack_id,product_id,role) values(p,a,'base') returning id into x;
 insert into mlm_pack_products(pack_id,product_id,role) values(p,b,'benefit') returning id into y;
 sel:=jsonb_build_object('pack_id',p,'promotion',true,'items',jsonb_build_array(jsonb_build_object('entry_id',x,'quantity',5),jsonb_build_object('entry_id',y,'quantity',3)));
 r:=quote_mlm_pack(sel);
 if (r->>'price')::numeric<>600 or (r->>'points')::numeric<>400 or (r->>'commission_price')::numeric<>500 then raise exception 'Promotion defaults incorrect: %',r;end if;
 update mlm_packs set custom_points=900,promo_points=true,promo_commission=true where id=p;r:=quote_mlm_pack(sel);
 if (r->>'points')::numeric<>960 or (r->>'commissionable_points')::numeric<>560 or (r->>'commission_price')::numeric<>600 then raise exception 'Promotion override incorrect';end if;
 r:=place_order(u,jsonb_build_array(jsonb_build_object('pack_selection',sel,'quantity',1)),'{}','{}','Test',0);if not (r->>'success')::boolean then raise exception 'Purchase failed: %',r;end if;o:=(r->>'order_id')::uuid;
 if exists(select 1 from commissions where reference_id=o::text) then raise exception 'Premature commission';end if;
 update mlm_packs set name='Changed',price=1,earning_value=99 where id=p;
 update orders set payment_status='paid' where id=o;update orders set payment_status='paid' where id=o;
 select sum(amount) into n from commissions where reference_id=o::text;if n<>60 then raise exception 'Snapshot/double commission incorrect: %',n;end if;
 if (select sum(points) from mlm_point_entries where order_id=o and kind='volume')<>960 then raise exception 'Volume incorrect';end if;
 update orders set status='refunded',payment_status='refunded' where id=o;update orders set status='refunded' where id=o;
 if (select general_stock from products where id=a)<>20 or (select general_stock from products where id=b)<>10 then raise exception 'Reversal incorrect';end if;
 if exists(select 1 from commissions where reference_id=o::text and status<>'rejected') then raise exception 'Commission not reversed';end if;
 -- Exceed each bound and tamper with quantities: invalid orders must leave no stock reservation.
 r:=place_order(u,jsonb_build_array(jsonb_build_object('pack_selection',jsonb_build_object('pack_id',p,'items',jsonb_build_array(jsonb_build_object('entry_id',x,'quantity',6))),'quantity',1)),'{}','{}','Test',0);if (r->>'success')::boolean then raise exception 'Maximum bypassed';end if;
 r:=place_order(u,jsonb_build_array(jsonb_build_object('product_id',a,'quantity',1),jsonb_build_object('product_id',b,'quantity',999)),'{}','{}','Test',0);if (r->>'success')::boolean or (select general_stock from products where id=a)<>20 then raise exception 'Partial stock rollback failed';end if;
 r:=place_order(u,jsonb_build_array(jsonb_build_object('product_id',a,'quantity',-1)),'{}','{}','Test',0);if (r->>'success')::boolean then raise exception 'Negative quantity accepted';end if;
 r:=place_order(u,jsonb_build_array(jsonb_build_object('pack_selection',sel,'quantity',1)),'{}','{}','Test',0,'UNTRUSTED');if (r->>'success')::boolean then raise exception 'Pack coupon accepted';end if;
end $$;
select set_config('request.jwt.claim.sub',(select v::text from pack_fixture where k='user'),true);
set local role authenticated;
do $$ declare r jsonb;begin
 begin insert into mlm_packs(name,kind,price) values('Unauthorized','fixed',1);raise exception 'RLS failed';exception when insufficient_privilege then null;end;
 if exists(select 1 from mlm_point_entries where user_id<>auth.uid()) then raise exception 'Foreign points exposed';end if;
 r:=place_order(auth.uid(),jsonb_build_array(jsonb_build_object('product_id',(select v from pack_fixture where k='product'),'quantity',1)),'{}','{}','Test',0);
 if not (r->>'success')::boolean then raise exception 'Authenticated purchase failed: %',r;end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if not exists(select 1 from mlm_packs where id=(select v from pack_fixture where k='pack')) then raise exception 'Public catalog unavailable';end if;
 begin perform place_order(null,'[]','{}','{}','Test',0);raise exception 'Anonymous checkout allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: promotions, override, snapshots, paid-only commission, rollback, refunds, limits, coupons and RLS' result;
rollback;
