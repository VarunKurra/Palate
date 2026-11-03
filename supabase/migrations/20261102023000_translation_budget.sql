begin;
create function public.consume_translation_budget(rid uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare used int; begin
 if not exists(select 1 from public.restaurants where id=rid and status in ('setup','active')) then return false; end if;
 insert into private.request_limits(bucket,count,expires_at) values(rid::text||':translate:'||date_trunc('hour',now())::text,1,now()+interval '2 hours') on conflict(bucket) do update set count=private.request_limits.count+1 returning count into used;
 return used<=10;
end $$;
revoke all on function public.consume_translation_budget(uuid) from public,anon,authenticated;
grant execute on function public.consume_translation_budget(uuid) to service_role;
commit;
