-- Additive pack model; system subscription plans are intentionally untouched.
alter table public.products add column if not exists earning_type text check (earning_type in ('price_percentage','points_percentage','fixed'));
alter table public.products add column if not exists earning_value numeric not null default 0 check(earning_value>=0);
alter table public.product_commissions drop constraint if exists product_commissions_type_check;
alter table public.product_commissions add constraint product_commissions_type_check check(type in ('percentage','price_percentage','points_percentage','fixed'));
create table public.mlm_packs (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),description text not null default '', image_url text not null default '',active boolean not null default false,
 kind text not null check(kind in ('fixed','selectable')),price numeric(14,2) not null check(price>0),currency text not null default 'PEN' check(currency in ('PEN','USD')),
 custom_points numeric check(custom_points>=0),commissionable_points numeric not null default 0 check(commissionable_points>=0),earning_type text not null default 'price_percentage' check(earning_type in ('price_percentage','points_percentage','fixed')),earning_value numeric not null default 0 check(earning_value>=0),
 min_units integer check(min_units>0),max_units integer check(max_units>0),max_price numeric check(max_price>0),max_points numeric check(max_points>0),
 promo_base integer check(promo_base>0),promo_total integer,promo_extra numeric not null default 0 check(promo_extra>=0),promo_points boolean not null default false,promo_commission boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(max_units is null or min_units is null or max_units>=min_units),check((promo_base is null and promo_total is null) or (promo_base is not null and promo_total>promo_base)),check(earning_type='fixed' or earning_value<=100)
);
create table public.mlm_pack_products (
 id uuid primary key default gen_random_uuid(),pack_id uuid not null references public.mlm_packs on delete cascade,product_id uuid not null references public.products on delete restrict,variant_id uuid references public.product_variants on delete restrict,
 role text not null default 'base' check(role in ('base','benefit')),quantity integer not null default 1 check(quantity>0),effective_price numeric check(effective_price>=0)
);
create unique index mlm_pack_products_identity on public.mlm_pack_products(pack_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid),role);
create index mlm_pack_products_product on public.mlm_pack_products(product_id);
create index mlm_pack_products_variant on public.mlm_pack_products(variant_id);
create table public.order_packs (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders on delete cascade,pack_id uuid references public.mlm_packs on delete set null,snapshot jsonb not null,created_at timestamptz not null default now()
);
create index order_packs_order on public.order_packs(order_id);
create index order_packs_pack on public.order_packs(pack_id);
alter table public.order_items add column if not exists order_pack_id uuid references public.order_packs on delete restrict;
alter table public.order_items add column if not exists mlm_snapshot jsonb;
create index order_items_pack on public.order_items(order_pack_id);
alter table public.orders add column if not exists mlm_version integer not null default 0;
alter table public.orders add column if not exists stock_reserved boolean not null default false;
alter table public.orders add column if not exists mlm_settled boolean not null default false;
alter table public.orders add column if not exists mlm_reversed boolean not null default false;
create table public.mlm_point_entries (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles,order_id uuid not null references public.orders,
 kind text not null check(kind in ('volume','commission')),points numeric not null check(points>=0),source_key text not null,description text not null default '',reversed_at timestamptz,created_at timestamptz not null default now(),unique(order_id,user_id,kind,source_key)
);
create index mlm_point_entries_user on public.mlm_point_entries(user_id,created_at desc);
create index mlm_point_entries_order on public.mlm_point_entries(order_id);
alter table public.mlm_packs enable row level security;
alter table public.mlm_pack_products enable row level security;
alter table public.order_packs enable row level security;
alter table public.mlm_point_entries enable row level security;
revoke all on public.mlm_packs,public.mlm_pack_products,public.order_packs,public.mlm_point_entries from anon,authenticated;
grant select on public.mlm_packs,public.mlm_pack_products to anon,authenticated;
grant insert,update,delete on public.mlm_packs,public.mlm_pack_products to authenticated;
grant select on public.order_packs,public.mlm_point_entries to authenticated;
grant all on public.mlm_packs,public.mlm_pack_products,public.order_packs,public.mlm_point_entries to service_role;
create policy packs_read on public.mlm_packs for select using(active or public.get_my_role() in ('admin','super_admin'));
create policy packs_admin on public.mlm_packs for all to authenticated using(public.get_my_role() in ('admin','super_admin')) with check(public.get_my_role() in ('admin','super_admin'));
create policy pack_products_read on public.mlm_pack_products for select using(exists(select 1 from public.mlm_packs p where p.id=pack_id));
create policy pack_products_admin on public.mlm_pack_products for all to authenticated using(public.get_my_role() in ('admin','super_admin')) with check(public.get_my_role() in ('admin','super_admin'));
create policy order_packs_read on public.order_packs for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id));
create policy points_read on public.mlm_point_entries for select to authenticated using(user_id=(select auth.uid()) or public.get_my_role() in ('admin','super_admin'));

-- Public quotation is invoker/RLS constrained. A quote is never trusted at order creation.
create or replace function public.quote_mlm_pack(p_selection jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare p mlm_packs%rowtype; e record; s jsonb; q int; units int:=0; bonus int:=0; val numeric:=0; pts numeric:=0; bp numeric:=0; price numeric; fx numeric; total numeric; lines jsonb:='[]'; promo boolean:=coalesce((p_selection->>'promotion')::boolean,false);seen uuid[]:='{}';
begin
 select * into p from mlm_packs where id=(p_selection->>'pack_id')::uuid and active;
 if not found then raise exception 'Este pack no está disponible';end if;
 select value::numeric into fx from system_config where key='exchange_rate_usd';
 if fx is null or fx<=0 then raise exception 'Tipo de cambio no disponible';end if;
 if jsonb_typeof(p_selection->'items')<>'array' or jsonb_array_length(p_selection->'items')>100 then raise exception 'Selección inválida';end if;
 if promo and p.promo_base is null then raise exception 'Promoción no disponible';end if;
 if p.kind='fixed' then
  -- Fixed content always comes from persisted rows, never client quantities.
  p_selection:=jsonb_set(p_selection,'{items}',coalesce((select jsonb_agg(jsonb_build_object('entry_id',id,'quantity',quantity)) from mlm_pack_products where pack_id=p.id and role='base'),'[]') || coalesce((select jsonb_agg(x) from jsonb_array_elements(p_selection->'items') x join mlm_pack_products m on m.id=(x->>'entry_id')::uuid where m.pack_id=p.id and m.role='benefit'),'[]'));
 end if;
 for s in select * from jsonb_array_elements(p_selection->'items') loop
  if (s->>'quantity')::numeric<>trunc((s->>'quantity')::numeric) then raise exception 'Cantidad inválida';end if;
  q:=(s->>'quantity')::int;if q is null or q<=0 or q>10000 then raise exception 'Cantidad inválida';end if;
  if (s->>'entry_id')::uuid=any(seen) then raise exception 'Producto repetido en la selección';end if;seen:=array_append(seen,(s->>'entry_id')::uuid);
  select m.*,pr.name,pr.points,pr.base_price,pr.currency,pr.track_stock,pr.general_stock,pr.status,pr.images,pr.sku,pr.is_digital,v.price variant_price,v.stock variant_stock,v.status variant_status,v.name variant_name,v.sku variant_sku into e from mlm_pack_products m join products pr on pr.id=m.product_id left join product_variants v on v.id=m.variant_id and v.product_id=pr.id where m.id=(s->>'entry_id')::uuid and m.pack_id=p.id;
  if not found or e.status<>'active' or (e.variant_id is not null and e.variant_status is distinct from 'active') then raise exception 'Producto no disponible';end if;
  if e.variant_id is null and exists(select 1 from product_variants where product_id=e.product_id and status='active') then raise exception 'Selecciona una presentación para %',e.name;end if;
  if e.track_stock and coalesce(e.variant_stock,e.general_stock,0)<q then raise exception 'Stock insuficiente: %',e.name;end if;
  price:=coalesce(e.effective_price,coalesce(e.variant_price,e.base_price)*case when e.currency=p.currency then 1 when e.currency='USD' then fx else 1/fx end);
  if e.role='benefit' then
   if not promo then raise exception 'Activa la promoción para elegir beneficios';end if;
   bonus:=bonus+q;bp:=bp+coalesce(e.points,0)*q;
  else units:=units+q;val:=val+price*q;pts:=pts+coalesce(e.points,0)*q;end if;
  lines:=lines||jsonb_build_array(jsonb_build_object('product_id',e.product_id,'variant_id',e.variant_id,'quantity',q,'name',e.name,'variant_name',e.variant_name,'sku',coalesce(e.variant_sku,e.sku),'image_url',e.images->0->>'url','points',coalesce(e.points,0),'role',e.role,'price',price,'is_digital',e.is_digital));
 end loop;
 if units=0 then raise exception 'Selecciona los productos del pack';end if;
 if p.kind='selectable' and ((p.min_units is not null and units<p.min_units) or (p.max_units is not null and units>p.max_units) or (p.max_price is not null and val>p.max_price) or (p.max_points is not null and pts>p.max_points)) then raise exception 'La selección no cumple los límites del pack';end if;
 if promo and (units<>p.promo_base or bonus<>p.promo_total-p.promo_base) then raise exception 'Completa % unidades base y % adicionales',p.promo_base,p.promo_total-p.promo_base;end if;
 total:=p.price+case when promo then p.promo_extra else 0 end;
 return jsonb_build_object('pack_id',p.id,'name',p.name,'image_url',p.image_url,'currency',p.currency,'price',total,'points',coalesce(p.custom_points,pts)+case when promo and p.promo_points then bp else 0 end,'commissionable_points',p.commissionable_points+case when promo and p.promo_commission then bp else 0 end,'commission_price',p.price+case when promo and p.promo_commission then p.promo_extra else 0 end,'earning_type',p.earning_type,'earning_value',p.earning_value,'lines',lines,'selection',p_selection,'config',to_jsonb(p));
end $$;
revoke all on function public.quote_mlm_pack(jsonb) from public;
grant execute on function public.quote_mlm_pack(jsonb) to anon,authenticated,service_role;

-- Atomic administration: failed child validation never leaves a partially edited pack.
create or replace function public.save_mlm_pack(p_pack jsonb,p_products jsonb) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare id_ uuid; x jsonb;
begin
 if public.get_my_role() not in ('admin','super_admin') or auth.uid() is null then raise exception 'No autorizado';end if;
 id_:=coalesce(nullif(p_pack->>'id','')::uuid,gen_random_uuid());
 insert into mlm_packs(id,name,description,image_url,active,kind,price,currency,custom_points,commissionable_points,earning_type,earning_value,min_units,max_units,max_price,max_points,promo_base,promo_total,promo_extra,promo_points,promo_commission)
 values(id_,p_pack->>'name',coalesce(p_pack->>'description',''),coalesce(p_pack->>'image_url',''),coalesce((p_pack->>'active')::boolean,false),p_pack->>'kind',(p_pack->>'price')::numeric,p_pack->>'currency',(p_pack->>'custom_points')::numeric,coalesce((p_pack->>'commissionable_points')::numeric,0),p_pack->>'earning_type',(p_pack->>'earning_value')::numeric,(p_pack->>'min_units')::int,(p_pack->>'max_units')::int,(p_pack->>'max_price')::numeric,(p_pack->>'max_points')::numeric,(p_pack->>'promo_base')::int,(p_pack->>'promo_total')::int,coalesce((p_pack->>'promo_extra')::numeric,0),coalesce((p_pack->>'promo_points')::boolean,false),coalesce((p_pack->>'promo_commission')::boolean,false))
 on conflict(id) do update set name=excluded.name,description=excluded.description,image_url=excluded.image_url,active=excluded.active,kind=excluded.kind,price=excluded.price,currency=excluded.currency,custom_points=excluded.custom_points,commissionable_points=excluded.commissionable_points,earning_type=excluded.earning_type,earning_value=excluded.earning_value,min_units=excluded.min_units,max_units=excluded.max_units,max_price=excluded.max_price,max_points=excluded.max_points,promo_base=excluded.promo_base,promo_total=excluded.promo_total,promo_extra=excluded.promo_extra,promo_points=excluded.promo_points,promo_commission=excluded.promo_commission,updated_at=now();
 if jsonb_typeof(p_products)<>'array' or jsonb_array_length(p_products)=0 or jsonb_array_length(p_products)>100 then raise exception 'Agrega los productos del pack (máximo 100)';end if;
 delete from mlm_pack_products where pack_id=id_;
 for x in select * from jsonb_array_elements(p_products) loop
  if nullif(x->>'variant_id','') is not null and not exists(select 1 from product_variants where id=(x->>'variant_id')::uuid and product_id=(x->>'product_id')::uuid) then raise exception 'Presentación inválida';end if;
  insert into mlm_pack_products(pack_id,product_id,variant_id,role,quantity,effective_price) values(id_,(x->>'product_id')::uuid,nullif(x->>'variant_id','')::uuid,x->>'role',(x->>'quantity')::int,(x->>'effective_price')::numeric);
 end loop;
 if not exists(select 1 from mlm_pack_products where pack_id=id_ and role='base') then raise exception 'Agrega productos base';end if;
 return id_;
end $$;
revoke all on function public.save_mlm_pack(jsonb,jsonb) from public;
grant execute on function public.save_mlm_pack(jsonb,jsonb) to authenticated;

create or replace function public.place_order(p_user_id uuid,p_items jsonb,p_shipping_addr jsonb,p_billing_addr jsonb,p_shipping_name text,p_shipping_cost numeric,p_coupon_code text default null,p_currency text default 'PEN',p_exchange_rate numeric default 1,p_notes text default null,p_payment_method text default 'pending') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare oid uuid:=gen_random_uuid(); num text; item jsonb; line jsonb; quote jsonb; lines jsonb:='[]';packid uuid;pr products%rowtype; vr product_variants%rowtype; q int; price numeric; subtotal_ numeric:=0; discount_ numeric:=0; total_ numeric;fx numeric;coupon coupons%rowtype;rules jsonb;sp uuid;sr text;lev int;rule record; haspack boolean:=false;ratio numeric; allocated numeric;lineamt numeric; n int;cnt int;
begin
 if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'No autorizado';end if;
 if p_currency<>'PEN' then raise exception 'La moneda base del pedido es PEN';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Carrito inválido';end if;
 if p_shipping_cost is null or p_shipping_cost<0 then raise exception 'Envío inválido';end if;
 select value::numeric into fx from system_config where key='exchange_rate_usd';if fx is null or fx<=0 then raise exception 'Tipo de cambio no disponible';end if;
 num:='ORD-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(gen_random_uuid()::text,1,6));
 insert into orders(id,order_number,user_id,status,payment_status,payment_method,subtotal,total,currency,exchange_rate,shipping_address,billing_address,shipping_amount,shipping_method_name,notes,mlm_version) values(oid,num,p_user_id,'pending','pending',p_payment_method,0,0,'PEN',fx,p_shipping_addr,p_billing_addr,p_shipping_cost,p_shipping_name,p_notes,1);
 for item in select * from jsonb_array_elements(p_items) loop
  if item->'pack_selection' is not null and item->'pack_selection'<>'null'::jsonb then
   haspack:=true;quote:=quote_mlm_pack(item->'pack_selection');packid:=gen_random_uuid();
   if coalesce((item->>'quantity')::int,1)<>1 then raise exception 'Cada selección corresponde a un pack';end if;
   ratio:=case when quote->>'currency'='USD' then fx else 1 end;
   quote:=quote||jsonb_build_object('base_price_pen',round((quote->>'price')::numeric*ratio,2),'commission_price_pen',round((quote->>'commission_price')::numeric*ratio,2),'fixed_pen',(quote->>'earning_value')::numeric*ratio);
   select sponsor_id into sp from profiles where id=p_user_id;quote:=quote||jsonb_build_object('sponsor_id',sp);
   insert into order_packs(id,order_id,pack_id,snapshot) values(packid,oid,(quote->>'pack_id')::uuid,quote);
   cnt:=jsonb_array_length(quote->'lines');n:=0;allocated:=0;
   for line in select * from jsonb_array_elements(quote->'lines') loop
    n:=n+1;
    -- Divide the pack amount across real order lines; last line absorbs rounding.
    lineamt:=case when n=cnt then (quote->>'base_price_pen')::numeric-allocated else round((quote->>'base_price_pen')::numeric/cnt,2) end;allocated:=allocated+lineamt;
    lines:=lines||jsonb_build_array(line||jsonb_build_object('pack',packid,'line_total',lineamt));
   end loop;
  else
   lines:=lines||jsonb_build_array(item);
  end if;
 end loop;
 if haspack and nullif(trim(p_coupon_code),'') is not null then raise exception 'Los packs no admiten cupones adicionales';end if;
 -- Consistent lock ordering and aggregate demand protect stock across pack/normal lines.
 perform 1 from products where id in (select (x->>'product_id')::uuid from jsonb_array_elements(lines) x) order by id for update;
 perform 1 from product_variants where id in (select nullif(x->>'variant_id','')::uuid from jsonb_array_elements(lines) x) order by id for update;
 for line in select * from jsonb_array_elements(lines) loop
  if (line->>'quantity')::numeric<>trunc((line->>'quantity')::numeric) then raise exception 'Cantidad inválida';end if;
  q:=(line->>'quantity')::int;if q is null or q<1 or q>10000 then raise exception 'Cantidad inválida';end if;
  select * into pr from products where id=(line->>'product_id')::uuid and status='active';if not found then raise exception 'Producto no disponible';end if;
  vr:=null;
  if nullif(line->>'variant_id','') is not null then
   select * into vr from product_variants where id=(line->>'variant_id')::uuid and product_id=pr.id and status='active';if not found then raise exception 'Presentación no disponible';end if;
  elsif exists(select 1 from product_variants where product_id=pr.id and status='active') then raise exception 'Selecciona una presentación para %',pr.name;
  end if;
  if pr.track_stock then
   if vr.id is not null then update product_variants set stock=stock-q where id=vr.id and stock>=q;
   else update products set general_stock=general_stock-q where id=pr.id and general_stock>=q;end if;
   if not found then raise exception 'Stock insuficiente: %',pr.name;end if;
  end if;
  price:=coalesce(vr.price,pr.base_price)*case when pr.currency='USD' then fx else 1 end;
  lineamt:=case when line->>'pack' is not null then (line->>'line_total')::numeric else round(price*q,2) end;
  rules:='[]';
  if line->>'pack' is null then
   select sponsor_id into sp from profiles where id=p_user_id;lev:=1;
   while sp is not null and lev<=10 loop
    select rank into sr from profiles where id=sp;
    select type,value into rule from product_commissions where product_id=pr.id and level=lev and (rank_override is null or rank_override=sr) order by rank_override nulls last limit 1;
    if not found then
     if lev=1 and pr.earning_type is not null then select pr.earning_type type,pr.earning_value value into rule;
     else select type,value into rule from mlm_commissions_config where rank=sr and level=lev and status='active' and lineamt>=min_purchase_amount limit 1;end if;
    end if;
    if rule.type is not null then rules:=rules||jsonb_build_array(jsonb_build_object('user_id',sp,'level',lev,'type',rule.type,'value',rule.value));end if;
    select sponsor_id into sp from profiles where id=sp;lev:=lev+1;
   end loop;
  end if;
  insert into order_items(order_id,product_id,variant_id,product_name,variant_name,sku,quantity,unit_price,total,image_url,order_pack_id,mlm_snapshot) values(oid,pr.id,vr.id,pr.name,vr.name,coalesce(vr.sku,pr.sku),q,lineamt/q,lineamt,coalesce(vr.images->0->>'url',pr.images->0->>'url'),(line->>'pack')::uuid,jsonb_build_object('points',coalesce(pr.points,0)*q,'rules',rules,'tracked',pr.track_stock));
  subtotal_:=subtotal_+lineamt;
 end loop;
 if nullif(trim(p_coupon_code),'') is not null then
  select * into coupon from coupons where code=upper(trim(p_coupon_code)) and status='active' and (expires_at is null or expires_at>now()) and (usage_limit is null or used_count<usage_limit) for update;
  if not found or subtotal_<coupon.min_order_amount then raise exception 'Cupón no disponible';end if;
  discount_:=least(subtotal_,case when coupon.type='percentage' then least(subtotal_*coupon.value/100,coalesce(coupon.max_discount,subtotal_)) else coupon.value end);
  update coupons set used_count=used_count+1 where id=coupon.id;
 end if;
 total_:=round(subtotal_-discount_+p_shipping_cost,2);
 update orders set subtotal=subtotal_,discount_amount=discount_,total=total_,tax_amount=round(total_-total_/1.18,2),coupon_id=coupon.id,coupon_code=coupon.code,stock_reserved=true where id=oid;
 insert into order_tracking(order_id,status,description) values(oid,'pending','En espera de pago');
 return jsonb_build_object('success',true,'order_id',oid,'order_number',num,'total',total_);
 exception when others then return jsonb_build_object('success',false,'error',sqlerrm);
end $$;
revoke all on function public.place_order(uuid,jsonb,jsonb,jsonb,text,numeric,text,text,numeric,text,text) from public,anon;
grant execute on function public.place_order(uuid,jsonb,jsonb,jsonb,text,numeric,text,text,numeric,text,text) to authenticated;

-- One lifecycle for all new orders: settle after payment, reverse once on cancellation/refund.
create schema if not exists private;
create or replace function private.order_mlm_lifecycle() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare i record;r jsonb;p record;pts numeric;amount_ numeric;typ text;uid uuid;val numeric;key_ text;ratio numeric;
begin
 if new.mlm_version<>1 then return new;end if;
 if old.mlm_reversed and (new.payment_status='paid' and old.payment_status<>'paid' or new.status not in ('cancelled','refunded')) then raise exception 'El pedido está cancelado o reembolsado';end if;
 if (new.status in ('cancelled','refunded') or new.payment_status='refunded') and not old.mlm_reversed then
  if old.stock_reserved then
   for i in select * from order_items where order_id=new.id order by product_id,variant_id loop
    if coalesce((i.mlm_snapshot->>'tracked')::boolean,false) then
     if i.variant_id is not null then update product_variants set stock=stock+i.quantity where id=i.variant_id;
     else update products set general_stock=general_stock+i.quantity where id=i.product_id;end if;
    end if;
   end loop;
  end if;
  update commissions set status='rejected' where reference_id=new.id::text and status<>'rejected';
  update mlm_point_entries set reversed_at=now() where order_id=new.id and reversed_at is null;
  if old.coupon_id is not null then update coupons set used_count=greatest(0,used_count-1) where id=old.coupon_id;end if;
  new.stock_reserved:=false;new.mlm_reversed:=true;return new;
 end if;
 if new.payment_status='paid' and not old.mlm_settled then
  ratio:=case when new.subtotal>0 then (new.subtotal-new.discount_amount)/new.subtotal else 1 end;
  for i in select * from order_items where order_id=new.id and order_pack_id is null loop
   pts:=coalesce((i.mlm_snapshot->>'points')::numeric,0);
   insert into mlm_point_entries(user_id,order_id,kind,points,source_key,description) values(new.user_id,new.id,'volume',pts,i.id::text,i.product_name);
   for r in select * from jsonb_array_elements(coalesce(i.mlm_snapshot->'rules','[]')) loop
    typ:=r->>'type';uid:=(r->>'user_id')::uuid;val:=(r->>'value')::numeric;key_:=i.id::text||':'||(r->>'level');
    if typ='points_percentage' then
     insert into mlm_point_entries(user_id,order_id,kind,points,source_key,description) values(uid,new.id,'commission',pts*val/100,key_,'Comisión: '||i.product_name);
    else
     amount_:=case when typ in ('percentage','price_percentage') then round(i.total*ratio*val/100,2) else val*i.quantity end;
     if amount_>0 then insert into commissions(user_id,from_user_id,type,amount,currency,status,description,reference_id) values(uid,new.user_id,'unilevel',amount_,'PEN','pending','Nivel '||(r->>'level')||' · '||i.product_name||' · '||new.order_number,new.id::text);end if;
    end if;
   end loop;
  end loop;
  for p in select * from order_packs where order_id=new.id loop
   r:=p.snapshot;pts:=(r->>'points')::numeric;
   insert into mlm_point_entries(user_id,order_id,kind,points,source_key,description) values(new.user_id,new.id,'volume',pts,p.id::text,r->>'name');
   uid:=(r->>'sponsor_id')::uuid;val:=(r->>'earning_value')::numeric;
   if uid is not null then
    if r->>'earning_type'='points_percentage' then
     insert into mlm_point_entries(user_id,order_id,kind,points,source_key,description) values(uid,new.id,'commission',(r->>'commissionable_points')::numeric*val/100,p.id::text,'Comisión: '||(r->>'name'));
    else
     amount_:=case when r->>'earning_type'='fixed' then (r->>'fixed_pen')::numeric else round((r->>'commission_price_pen')::numeric*val/100,2) end;
     if amount_>0 then insert into commissions(user_id,from_user_id,type,amount,currency,status,description,reference_id) values(uid,new.user_id,'direct',amount_,'PEN','pending','Pack '||(r->>'name')||' · '||new.order_number,new.id::text);end if;
    end if;
   end if;
  end loop;
  new.mlm_settled:=true;
 end if;
 return new;
end $$;
revoke all on function private.order_mlm_lifecycle() from public,anon,authenticated;
create trigger order_mlm_lifecycle before update on public.orders for each row execute function private.order_mlm_lifecycle();
