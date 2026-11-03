begin;
create function public.approve_demo(request_id uuid,rid uuid) returns void language plpgsql security definer set search_path='' as $$
declare req public.demo_requests; begin
 if not private.is_staff() then raise exception 'Staff access required'; end if;
 select * into req from public.demo_requests where id=request_id for update;
 if not found then raise exception 'Request not found'; end if;
 if not exists(select 1 from public.restaurants where id=rid) then raise exception 'Choose a restaurant'; end if;
 if not exists(select 1 from auth.users where id=req.user_id and email_confirmed_at is not null) then raise exception 'Owner must verify their email first'; end if;
 insert into public.restaurant_members(restaurant_id,user_id,role) values(rid,req.user_id,'owner') on conflict(restaurant_id,user_id) do update set role='owner';
 update public.restaurants set owner_email=coalesce(owner_email,req.email) where id=rid;
 update public.demo_requests set status='approved',restaurant_id=rid where id=request_id;
 insert into public.audit_log(restaurant_id,actor_id,action,entity,entity_id) values(rid,auth.uid(),'approve','demo_request',request_id::text);
end $$;
revoke all on function public.approve_demo(uuid,uuid) from public,anon;
grant execute on function public.approve_demo(uuid,uuid) to authenticated;
alter table public.demo_requests add constraint demo_contact_lengths check(length(phone)<=100 and length(website)<=1000 and length(email)<=320);
alter table public.restaurant_invitations add constraint invitation_email_length check(length(email) between 3 and 320);
create trigger member_audit after insert or update or delete on public.restaurant_members for each row execute function private.audit_change();
create trigger invitation_audit after insert or delete on public.restaurant_invitations for each row execute function private.audit_change();
commit;
