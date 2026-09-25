-- Run against a test copy or the SQL editor. Every change is rolled back.
begin;

-- Exercise the workflow even when the company has it disabled. Rollback restores it.
update system_config set value = 'true' where key = 'allow_assign_existing_user';

do $$
declare
  admin_id uuid;
  member_id uuid;
  outsider_id uuid;
  request_id uuid;
  original_sponsor uuid;
  resulting_status text;
begin
  select id into admin_id from profiles where role = 'super_admin' limit 1;
  select id, sponsor_id into member_id, original_sponsor
    from profiles
   where role not in ('admin', 'super_admin')
     and id <> admin_id
     and sponsor_id is distinct from admin_id
   limit 1;
  select id into outsider_id
    from profiles where role not in ('admin', 'super_admin') and id not in (admin_id, member_id) limit 1;

  if admin_id is null or member_id is null or outsider_id is null then
    raise exception 'Three existing profiles are required for this test';
  end if;

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  request_id := request_network_membership(member_id, admin_id, 'right');

  begin
    perform request_network_membership(member_id, admin_id, 'right');
    raise exception 'Duplicate open request was accepted';
  exception when unique_violation then null;
  end;

  perform set_config('request.jwt.claim.sub', member_id::text, true);
  perform respond_network_request(request_id, 'accept');
  select status into resulting_status from network_requests where id = request_id;

  if original_sponsor is null and resulting_status <> 'accepted' then
    raise exception 'Unsponsored member was not linked after acceptance';
  elsif original_sponsor is not null and resulting_status <> 'review' then
    raise exception 'Existing network transfer skipped administrative review';
  end if;

  if original_sponsor is not null then
    perform set_config('request.jwt.claim.sub', admin_id::text, true);
    perform respond_network_request(request_id, 'approve');
  end if;

  if (select sponsor_id from profiles where id = member_id) is distinct from admin_id then
    raise exception 'Accepted request did not update the sponsor';
  end if;

  perform set_config('request.jwt.claim.sub', outsider_id::text, true);
  begin
    perform network_tree(admin_id);
    raise exception 'Unauthorized cross-network read was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
