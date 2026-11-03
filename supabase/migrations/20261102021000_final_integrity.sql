begin;
create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
 declare rowdata jsonb; rid uuid; begin
 rowdata=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 rid=case when TG_TABLE_NAME='restaurants' then (rowdata->>'id')::uuid else (rowdata->>'restaurant_id')::uuid end;
 if rid is not null and not exists(select 1 from public.restaurants where id=rid) then return coalesce(new,old); end if;
 insert into public.audit_log(restaurant_id,actor_id,action,entity,entity_id) values(rid,auth.uid(),lower(TG_OP),TG_TABLE_NAME,coalesce(rowdata->>'id',rowdata->>'user_id',rowdata->>'email'));
 return coalesce(new,old); end $$;
alter table public.menu_items add constraint item_translated_name_object check(coalesce(jsonb_typeof(data->'name')='object',true));
create index if not exists restaurant_invitation_email on public.restaurant_invitations(email);
create index if not exists support_tickets_user_created on public.support_tickets(user_id,created_at desc);
create index if not exists demo_requests_created on public.demo_requests(created_at desc);
comment on function public.get_public_menu(text) is 'Intentionally public. Returns only published menu fields. Staff and active members may preview their own setup. No account contacts, private analytics or billing data are returned.';
comment on function public.record_menu_event(text,uuid,text,uuid,text,text) is 'Intentionally public guest analytics ingress. Validates tenant publication, event type and dish ownership, deduplicates repeated events, limits per session. Counts are untrusted browser-reported engagement, not sales.';
commit;
