begin;
create table private.request_limits(bucket text primary key,count int not null default 0,expires_at timestamptz not null);
revoke all on private.request_limits from public,anon,authenticated;
create function public.consume_ai_budget(rid uuid,client_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare used int; begin
 if not exists(select 1 from public.restaurants where id=rid and status='active') then return false; end if;
 insert into private.request_limits(bucket,count,expires_at) values(rid::text||':'||client_hash||':'||date_trunc('minute',now())::text,1,now()+interval '2 hours') on conflict(bucket) do update set count=private.request_limits.count+1 returning count into used;
 if used>12 then return false; end if;
 insert into private.request_limits(bucket,count,expires_at) values(rid::text||':hour:'||date_trunc('hour',now())::text,1,now()+interval '2 hours') on conflict(bucket) do update set count=private.request_limits.count+1 returning count into used;
 delete from private.request_limits where expires_at<now();
 return used<=300;
end $$;
revoke all on function public.consume_ai_budget(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_ai_budget(uuid,text) to service_role;
commit;
