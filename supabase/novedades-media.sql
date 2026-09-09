insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('novedades','novedades',true,2097152,array['image/jpeg','image/png','image/webp']);
create policy novedades_images_read on storage.objects for select to anon,authenticated using(bucket_id='novedades');
create policy novedades_images_insert on storage.objects for insert to authenticated with check(bucket_id='novedades' and (select public.is_admin_user()));
create policy novedades_images_update on storage.objects for update to authenticated using(bucket_id='novedades' and (select public.is_admin_user())) with check(bucket_id='novedades' and (select public.is_admin_user()));
create policy novedades_images_delete on storage.objects for delete to authenticated using(bucket_id='novedades' and (select public.is_admin_user()));
