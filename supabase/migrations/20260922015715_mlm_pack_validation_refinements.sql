create or replace function public.my_mlm_points() returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('volume',coalesce(sum(points) filter(where kind='volume'),0),'commission',coalesce(sum(points) filter(where kind='commission'),0)) from mlm_point_entries where user_id=auth.uid() and reversed_at is null;
$$;
revoke all on function public.my_mlm_points() from public;
grant execute on function public.my_mlm_points() to authenticated;
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
    lineamt:=case when n=cnt then (quote->>'base_price_pen')::numeric-allocated else trunc((quote->>'base_price_pen')::numeric/cnt,2) end;allocated:=allocated+lineamt;
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

