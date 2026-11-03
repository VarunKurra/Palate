begin;
create function public.import_menu(rid uuid,menu jsonb) returns int language plpgsql security definer set search_path='' as $$
declare c jsonb; i jsonb; cid uuid; iid uuid; category_map jsonb='{}'; item_map jsonb='{}'; item_data jsonb; n int=0; pairs jsonb; begin
 if not private.can_manage(rid) then raise exception 'Restaurant access required'; end if;
 if jsonb_typeof(menu->'items')<>'array' or jsonb_array_length(menu->'items') not between 1 and 500 then raise exception 'Import between 1 and 500 dishes'; end if;
 for c in select * from jsonb_array_elements(menu->'categories') loop
 if coalesce(c#>>'{name,en}','')='' then raise exception 'Every category needs an English name'; end if;
 select id into cid from public.menu_categories where restaurant_id=rid and lower(name->>'en')=lower(c#>>'{name,en}') limit 1;
 if cid is null then insert into public.menu_categories(restaurant_id,name,position) values(rid,c->'name',(select count(*) from public.menu_categories where restaurant_id=rid)) returning id into cid; end if;
 category_map=category_map||jsonb_build_object(c->>'id',cid); cid=null;
 end loop;
 for i in select * from jsonb_array_elements(menu->'items') loop
 item_map=item_map||jsonb_build_object(i->>'id',gen_random_uuid());
 end loop;
 for i in select * from jsonb_array_elements(menu->'items') loop
 cid=(category_map->>(i->>'category'))::uuid; iid=(item_map->>(i->>'id'))::uuid;
 if cid is null or iid is null then raise exception 'Dish category or ID missing'; end if;
 if coalesce(i#>>'{name,en}','')='' then raise exception 'Dish name missing'; end if;
 select coalesce(jsonb_agg(item_map->>value),'[]') into pairs from jsonb_array_elements_text(coalesce(i->'pairsWith','[]')) where item_map ? value;
 item_data=jsonb_build_object('dietary','[]'::jsonb,'allergens','[]'::jsonb,'moods','[]'::jsonb,'description','{"en":""}'::jsonb,'ingredients','{"en":""}'::jsonb,'short','{"en":""}'::jsonb,'course','mains')||i||jsonb_build_object('pairsWith',pairs,'course',coalesce(i->>'course',case when i->>'category' in ('starters','mains','drinks','sweets') then i->>'category' else 'mains' end));
 insert into public.menu_items(id,restaurant_id,category_id,name,price_cents,available,position,data) values(iid,rid,cid,i#>>'{name,en}',(i->>'priceCents')::int,coalesce((i->>'available')::boolean,true),(select count(*) from public.menu_items where restaurant_id=rid),item_data);
 n=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.import_menu(uuid,jsonb) from public,anon;
grant execute on function public.import_menu(uuid,jsonb) to authenticated;
alter table public.menu_items add constraint item_data_object check(jsonb_typeof(data)='object');
alter table public.menu_items add constraint item_arrays check(
 coalesce(jsonb_typeof(data->'dietary')='array',true) and coalesce(jsonb_typeof(data->'allergens')='array',true) and coalesce(jsonb_typeof(data->'moods')='array',true) and coalesce(jsonb_typeof(data->'pairsWith')='array',true));
alter table public.restaurants add constraint settings_object check(jsonb_typeof(settings)='object');
alter table public.menu_categories add constraint category_name check(jsonb_typeof(name)='object' and length(name->>'en') between 1 and 120);
commit;
