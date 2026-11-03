begin;
create schema if not exists private;
revoke all on schema private from public;
create table public.palate_staff (
 user_id uuid primary key references auth.users on delete cascade,
 role text not null check(role in ('admin','operator')), created_at timestamptz not null default now()
);
create table public.staff_invitations (
 email text primary key check(email=lower(email)), role text not null check(role in ('admin','operator')),
 created_at timestamptz not null default now()
);
create table public.restaurants (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 slug text unique not null check(slug ~ '^[a-z0-9][a-z0-9-]{1,70}$'),
 status text not null default 'setup' check(status in ('setup','active','paused','archived')),
 owner_email text, settings jsonb not null default '{}',
 plan text not null default 'standard', setup_cents int not null default 20000 check(setup_cents>=0),
 monthly_cents int not null default 2000 check(monthly_cents>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.restaurant_members (
 restaurant_id uuid references public.restaurants on delete cascade, user_id uuid references auth.users on delete cascade,
 role text not null default 'owner' check(role in ('owner','editor')), created_at timestamptz not null default now(), primary key(restaurant_id,user_id)
);
create table public.restaurant_invitations (
 restaurant_id uuid references public.restaurants on delete cascade, email text not null check(email=lower(email)),
 role text not null default 'owner' check(role in ('owner','editor')), created_at timestamptz not null default now(), primary key(restaurant_id,email)
);
create table public.demo_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users on delete cascade,
 name text not null check(length(name) between 1 and 120), restaurant_name text not null check(length(restaurant_name) between 1 and 120),
 email text not null, phone text not null default '', website text not null default '', notes text not null default '' check(length(notes)<=3000),
 status text not null default 'new' check(status in ('new','contacted','scheduled','approved','closed')),
 restaurant_id uuid references public.restaurants on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.menu_categories (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants on delete cascade,
 name jsonb not null default '{"en":"New category"}', position int not null default 0,
 unique(restaurant_id,id)
);
create table public.menu_items (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants on delete cascade,
 category_id uuid not null, name text not null check(length(name) between 1 and 160),
 price_cents int not null default 0 check(price_cents between 0 and 10000000), available boolean not null default true,
 position int not null default 0, data jsonb not null default '{}', updated_at timestamptz not null default now(),
 foreign key(restaurant_id,category_id) references public.menu_categories(restaurant_id,id) on delete restrict,
 unique(restaurant_id,id)
);
create table public.menu_deals (
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants on delete cascade,
 name text not null check(length(name) between 1 and 120), enabled boolean not null default false,
 discount_cents int not null default 0 check(discount_cents>=0), data jsonb not null default '{}', position int not null default 0,
 created_at timestamptz not null default now()
);
create table public.menu_events (
 id bigint generated always as identity primary key, restaurant_id uuid not null references public.restaurants on delete cascade,
 session_id uuid not null, kind text not null check(kind in ('menu_view','dish_view','save','recommendation','deal_view','language','filter')),
 item_id uuid, language text, source text not null default 'direct', created_at timestamptz not null default now()
);
create index menu_events_restaurant_time on public.menu_events(restaurant_id,created_at desc);
create index menu_events_session on public.menu_events(restaurant_id,session_id,created_at desc);
create index menu_items_restaurant on public.menu_items(restaurant_id,position);
create index restaurant_members_user on public.restaurant_members(user_id);
create index menu_categories_restaurant on public.menu_categories(restaurant_id,position);
create index menu_deals_restaurant on public.menu_deals(restaurant_id);
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 restaurant_id uuid references public.restaurants on delete set null, subject text not null check(length(subject) between 1 and 160),
 message text not null check(length(message) between 1 and 5000), status text not null default 'open' check(status in ('open','in_progress','resolved')),
 reply text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_log (
 id bigint generated always as identity primary key, restaurant_id uuid references public.restaurants on delete cascade,
 actor_id uuid, action text not null, entity text not null, entity_id text, created_at timestamptz not null default now()
);
create index audit_log_restaurant on public.audit_log(restaurant_id,created_at desc);
create function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.palate_staff where user_id=(select auth.uid())); $$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.palate_staff where user_id=(select auth.uid()) and role='admin'); $$;
create function private.can_manage(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_staff() or exists(select 1 from public.restaurant_members m join public.restaurants r on r.id=m.restaurant_id where m.restaurant_id=rid and m.user_id=(select auth.uid()) and r.status='active'); $$;
create function private.is_owner(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_staff() or exists(select 1 from public.restaurant_members m join public.restaurants r on r.id=m.restaurant_id where m.restaurant_id=rid and m.user_id=(select auth.uid()) and m.role='owner' and r.status='active'); $$;
grant usage on schema private to authenticated;
grant execute on function private.is_staff(),private.is_admin(),private.can_manage(uuid),private.is_owner(uuid) to authenticated;

-- Every customer-owned table is protected at the database, independent of the UI.
do $$ declare t text; begin foreach t in array array['palate_staff','staff_invitations','restaurants','restaurant_members','restaurant_invitations','demo_requests','menu_categories','menu_items','menu_deals','menu_events','support_tickets','audit_log'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop; end $$;
grant select on public.palate_staff to authenticated;
create policy staff_read on public.palate_staff for select to authenticated using(user_id=auth.uid() or private.is_admin());
grant select,insert,delete on public.staff_invitations to authenticated;
create policy staff_invite on public.staff_invitations for all to authenticated using(private.is_admin()) with check(private.is_admin());
grant select,insert on public.restaurants to authenticated;
grant update(name,slug,settings) on public.restaurants to authenticated;
create policy restaurant_read on public.restaurants for select to authenticated using(private.is_staff() or exists(select 1 from public.restaurant_members where restaurant_id=id and user_id=auth.uid()));
create policy restaurant_create on public.restaurants for insert to authenticated with check(private.is_staff());
create policy restaurant_edit on public.restaurants for update to authenticated using(private.can_manage(id)) with check(private.can_manage(id));
grant select on public.restaurant_members to authenticated;
create policy members_read on public.restaurant_members for select to authenticated using(user_id=auth.uid() or private.is_owner(restaurant_id));
grant select,insert,delete on public.restaurant_invitations to authenticated;
create policy invitation_read on public.restaurant_invitations for select to authenticated using(private.is_owner(restaurant_id));
create policy invitation_add on public.restaurant_invitations for insert to authenticated with check(private.is_owner(restaurant_id));
create policy invitation_remove on public.restaurant_invitations for delete to authenticated using(private.is_owner(restaurant_id));
grant select,insert on public.demo_requests to authenticated;
grant update(status,restaurant_id) on public.demo_requests to authenticated;
create policy demo_read on public.demo_requests for select to authenticated using(user_id=auth.uid() or private.is_staff());
create policy demo_submit on public.demo_requests for insert to authenticated with check(user_id=auth.uid() and status='new' and restaurant_id is null and email=auth.jwt()->>'email');
create policy demo_staff on public.demo_requests for update to authenticated using(private.is_staff()) with check(private.is_staff());
do $$ declare t text; begin foreach t in array array['menu_categories','menu_items','menu_deals'] loop
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy tenant_access on public.%I for all to authenticated using(private.can_manage(restaurant_id)) with check(private.can_manage(restaurant_id))',t);
 end loop; end $$;
grant select on public.menu_events to authenticated;
create policy event_read on public.menu_events for select to authenticated using(private.can_manage(restaurant_id));
grant select,insert on public.support_tickets to authenticated;
grant update(status,reply) on public.support_tickets to authenticated;
create policy ticket_read on public.support_tickets for select to authenticated using(user_id=auth.uid() or private.is_staff());
create policy ticket_create on public.support_tickets for insert to authenticated with check(user_id=auth.uid() and status='open' and reply is null and (restaurant_id is null or private.can_manage(restaurant_id)));
create policy ticket_reply on public.support_tickets for update to authenticated using(private.is_staff()) with check(private.is_staff());
grant select on public.audit_log to authenticated;
create policy audit_read on public.audit_log for select to authenticated using(private.can_manage(restaurant_id));

create function private.touch() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger restaurant_touch before update on public.restaurants for each row execute function private.touch();
create trigger item_touch before update on public.menu_items for each row execute function private.touch();
create trigger demo_touch before update on public.demo_requests for each row execute function private.touch();
create trigger ticket_touch before update on public.support_tickets for each row execute function private.touch();
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
 declare rowdata jsonb; rid uuid; begin
 rowdata=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 rid=case when TG_TABLE_NAME='restaurants' then (rowdata->>'id')::uuid else (rowdata->>'restaurant_id')::uuid end;
 insert into public.audit_log(restaurant_id,actor_id,action,entity,entity_id) values(rid,auth.uid(),lower(TG_OP),TG_TABLE_NAME,rowdata->>'id');
 return coalesce(new,old); end $$;
create trigger restaurant_audit after insert or update on public.restaurants for each row execute function private.audit_change();
create trigger item_audit after insert or update or delete on public.menu_items for each row execute function private.audit_change();
create trigger category_audit after insert or update or delete on public.menu_categories for each row execute function private.audit_change();
create trigger deal_audit after insert or update or delete on public.menu_deals for each row execute function private.audit_change();

-- Explicit, verified-email invitation claiming; users cannot self-grant roles.
create function public.claim_access() returns void language plpgsql security definer set search_path='' as $$
 declare mail text; begin
 select lower(email) into mail from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if mail is null then return; end if;
 insert into public.palate_staff(user_id,role) select auth.uid(),role from public.staff_invitations where email=mail on conflict(user_id) do nothing;
 delete from public.staff_invitations where email=mail;
 insert into public.restaurant_members(restaurant_id,user_id,role) select restaurant_id,auth.uid(),role from public.restaurant_invitations where email=mail on conflict do nothing;
 delete from public.restaurant_invitations where email=mail;
 end $$;
create function public.set_restaurant_status(rid uuid,new_status text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not private.is_staff() then raise exception 'Staff access required'; end if;
 if new_status not in ('setup','active','paused','archived') then raise exception 'Invalid status'; end if;
 if new_status='active' and not exists(select 1 from public.menu_items where restaurant_id=rid) then raise exception 'Add at least one menu item before activation'; end if;
 update public.restaurants set status=new_status where id=rid;
 if not found then raise exception 'Restaurant not found'; end if;
 end $$;
create function public.remove_restaurant_member(rid uuid,member_id uuid) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not private.is_owner(rid) then raise exception 'Owner access required'; end if;
 if member_id=auth.uid() then raise exception 'You cannot remove your own access'; end if;
 if (select count(*) from public.restaurant_members where restaurant_id=rid and role='owner')<=1 and exists(select 1 from public.restaurant_members where restaurant_id=rid and user_id=member_id and role='owner') then raise exception 'Keep at least one owner'; end if;
 delete from public.restaurant_members where restaurant_id=rid and user_id=member_id;
 end $$;
create function public.remove_staff(member_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if not private.is_admin() or member_id=auth.uid() then raise exception 'Cannot remove this staff account'; end if;
 delete from public.palate_staff where user_id=member_id; end $$;
create function public.team_directory(rid uuid default null) returns table(user_id uuid,email text,role text) language plpgsql security definer set search_path='' as $$ begin
 if rid is null then
 if not private.is_admin() then raise exception 'Admin access required'; end if;
 return query select s.user_id,u.email::text,s.role from public.palate_staff s join auth.users u on u.id=s.user_id;
 else
 if not private.is_owner(rid) then raise exception 'Owner access required'; end if;
 return query select m.user_id,u.email::text,m.role from public.restaurant_members m join auth.users u on u.id=m.user_id where m.restaurant_id=rid;
 end if; end $$;

create function public.get_public_menu(menu_slug text) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare r public.restaurants; result jsonb; begin
 select * into r from public.restaurants where slug=menu_slug and (status='active' or private.can_manage(id));
 if not found then raise exception 'Menu unavailable'; end if;
 select jsonb_build_object('schemaVersion',1,
 'restaurant',coalesce(r.settings->'restaurant','{}'::jsonb)||jsonb_build_object('id',r.id,'name',r.name,'sample',false,'slug',r.slug,'currency',coalesce(r.settings#>>'{restaurant,currency}','USD'),'defaultLanguage','en','languages',coalesce(r.settings#>'{restaurant,languages}','["en"]'::jsonb),'palateUrl','/'),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by position,id) from public.menu_categories where restaurant_id=r.id),'[]'::jsonb),
 'items',coalesce((select jsonb_agg(data||jsonb_build_object('id',id,'category',category_id,'name',coalesce(data->'name','{}'::jsonb)||jsonb_build_object('en',name),'priceCents',price_cents,'available',available) order by position,id) from public.menu_items where restaurant_id=r.id),'[]'::jsonb),
 'deal',coalesce((select data||jsonb_build_object('id',id,'enabled',enabled,'name',coalesce(data->'name','{}'::jsonb)||jsonb_build_object('en',name),'discountCents',discount_cents) from public.menu_deals where restaurant_id=r.id and enabled order by position,id limit 1),'{"enabled":false,"itemIds":[]}'::jsonb),
 'assistant',jsonb_build_object('endpoint',null,'mode','local')) into result;
 return result; end $$;

-- No direct public writes to analytics. Accept only published tenants, known events and their items.
create function public.record_menu_event(menu_slug text,visitor uuid,event_kind text,dish uuid default null,locale text default 'en',referral text default 'direct') returns void language plpgsql security definer set search_path='' as $$
 declare rid uuid; begin
 select id into rid from public.restaurants where slug=menu_slug and status='active';
 if rid is null or visitor is null or event_kind not in ('menu_view','dish_view','save','recommendation','deal_view','language','filter') then return; end if;
 if dish is not null and not exists(select 1 from public.menu_items where restaurant_id=rid and id=dish) then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(rid::text||visitor::text,0));
 if (select count(*) from public.menu_events where restaurant_id=rid and session_id=visitor and created_at>now()-interval '1 minute')>=40 then return; end if;
 if exists(select 1 from public.menu_events where restaurant_id=rid and session_id=visitor and kind=event_kind and item_id is not distinct from dish and created_at>now()-case when event_kind='menu_view' then interval '30 minutes' else interval '2 seconds' end) then return; end if;
 insert into public.menu_events(restaurant_id,session_id,kind,item_id,language,source) values(rid,visitor,event_kind,dish,left(locale,12),case when referral in ('qr','website','social','direct') then referral else 'direct' end);
 end $$;
create function public.restaurant_analytics(rid uuid,days int default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb; since timestamptz; begin
 if not private.can_manage(rid) then raise exception 'Restaurant access required'; end if;
 since=now()-make_interval(days=>greatest(1,least(days,365)));
 with e as (select * from public.menu_events where restaurant_id=rid and created_at>=since),
 totals as (select count(distinct session_id) filter(where kind='menu_view') as visits,count(*) filter(where kind='dish_view') as views,count(*) filter(where kind='save') as saves,count(*) filter(where kind='recommendation') as recommendations,count(distinct session_id) filter(where kind in ('dish_view','save','recommendation','deal_view')) as engaged from e)
 select jsonb_build_object('totals',(select to_jsonb(t) from totals t),
 'daily',(select coalesce(jsonb_agg(x),'[]') from (select d::date as day,count(distinct e.session_id) filter(where e.kind='menu_view') as visits,count(*) filter(where e.kind='dish_view') as views from generate_series(date_trunc('day',since),date_trunc('day',now()),interval '1 day') d left join e on e.created_at>=d and e.created_at<d+interval '1 day' group by d order by d) x),
 'items',(select coalesce(jsonb_agg(x),'[]') from (select i.id,i.name,i.data->>'image' as image,count(*) filter(where e.kind='dish_view') as views,count(*) filter(where e.kind='save') as saves from public.menu_items i left join e on e.item_id=i.id where i.restaurant_id=rid group by i.id order by views desc,saves desc limit 20) x),
 'sources',(select coalesce(jsonb_agg(x),'[]') from (select source,count(distinct session_id) as visits from e where kind='menu_view' group by source order by visits desc) x),
 'languages',(select coalesce(jsonb_agg(x),'[]') from (select language,count(*) as events from e where kind in ('menu_view','language') group by language order by events desc) x),
 'dealViews',(select count(*) from e where kind='deal_view')) into result;
 return result; end $$;

-- Uploaded menu images are intentionally public; editing remains tenant-scoped.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('menu-media','menu-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
create policy palate_media_insert on storage.objects for insert to authenticated with check(bucket_id='menu-media' and (storage.foldername(name))[1] in (select id::text from public.restaurants where private.can_manage(id)));
create policy palate_media_update on storage.objects for update to authenticated using(bucket_id='menu-media' and (storage.foldername(name))[1] in (select id::text from public.restaurants where private.can_manage(id))) with check(bucket_id='menu-media' and (storage.foldername(name))[1] in (select id::text from public.restaurants where private.can_manage(id)));
create policy palate_media_delete on storage.objects for delete to authenticated using(bucket_id='menu-media' and (storage.foldername(name))[1] in (select id::text from public.restaurants where private.can_manage(id)));
create policy palate_media_select on storage.objects for select to authenticated using(bucket_id='menu-media' and (storage.foldername(name))[1] in (select id::text from public.restaurants where private.can_manage(id)));

-- PostgreSQL grants EXECUTE to PUBLIC by default; explicitly close privileged RPCs.
revoke all on all functions in schema private from public,anon;
revoke all on function public.claim_access(),public.set_restaurant_status(uuid,text),public.remove_restaurant_member(uuid,uuid),public.remove_staff(uuid),public.team_directory(uuid),public.restaurant_analytics(uuid,int) from public,anon;
grant execute on function public.claim_access(),public.set_restaurant_status(uuid,text),public.remove_restaurant_member(uuid,uuid),public.remove_staff(uuid),public.team_directory(uuid),public.restaurant_analytics(uuid,int) to authenticated;
revoke all on function public.get_public_menu(text),public.record_menu_event(text,uuid,text,uuid,text,text) from public;
grant execute on function public.get_public_menu(text),public.record_menu_event(text,uuid,text,uuid,text,text) to anon,authenticated;
commit;
