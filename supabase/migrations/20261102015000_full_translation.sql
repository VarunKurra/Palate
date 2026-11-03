begin;
drop function public.save_translations(uuid,text,jsonb,jsonb,boolean);
create function public.save_translations(rid uuid,locale text,translations jsonb,category_names jsonb,enable boolean default true,extra jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
declare item record; cat record; deal record; rs jsonb; field text; langs jsonb; begin
 if not private.can_manage(rid) then raise exception 'Restaurant access required'; end if;
 if locale='en' or locale !~ '^[a-z]{2,3}(-[A-Za-z]{2,4})?$' then raise exception 'Invalid language'; end if;
 for item in select * from public.menu_items where restaurant_id=rid loop
 if coalesce(translations#>>array[item.id::text,'name'],'')='' then raise exception 'Translate every dish name before enabling this language'; end if;
 foreach field in array array['description','ingredients'] loop
 if coalesce(item.data#>>array[field,'en'],'')<>'' and coalesce(translations#>>array[item.id::text,field],'')='' then raise exception 'Translate descriptions and ingredients before enabling this language'; end if;
 end loop;
 update public.menu_items set data=data||jsonb_build_object('name',coalesce(data->'name','{}')||jsonb_build_object(locale,translations#>>array[item.id::text,'name']),'description',coalesce(data->'description','{}')||jsonb_build_object(locale,translations#>>array[item.id::text,'description']),'short',coalesce(data->'short','{}')||jsonb_build_object(locale,translations#>>array[item.id::text,'description']),'ingredients',coalesce(data->'ingredients','{}')||jsonb_build_object(locale,translations#>>array[item.id::text,'ingredients'])) where id=item.id;
 end loop;
 for cat in select * from public.menu_categories where restaurant_id=rid loop
 if coalesce(category_names->>cat.id::text,'')='' then raise exception 'Translate every category'; end if;
 update public.menu_categories set name=name||jsonb_build_object(locale,category_names->>cat.id::text) where id=cat.id;
 end loop;
 select settings->'restaurant' into rs from public.restaurants where id=rid;
 foreach field in array array['address','hours'] loop
 if coalesce(rs#>>array[field,'en'],'')<>'' then
 if coalesce(extra#>>array['restaurant',field],'')='' then raise exception 'Translate restaurant address and hours'; end if;
 rs=jsonb_set(rs,array[field],coalesce(rs->field,'{}')||jsonb_build_object(locale,extra#>>array['restaurant',field]),true);
 end if;
 end loop;
 update public.restaurants set settings=jsonb_set(settings,'{restaurant}',rs) where id=rid;
 for deal in select * from public.menu_deals where restaurant_id=rid and enabled loop
 if coalesce(extra#>>array['deals',deal.id::text,'name'],'')='' or coalesce(extra#>>array['deals',deal.id::text,'description'],'')='' then raise exception 'Translate your featured special'; end if;
 update public.menu_deals set data=data||jsonb_build_object('name',coalesce(data->'name','{}')||jsonb_build_object(locale,extra#>>array['deals',deal.id::text,'name']),'description',coalesce(data->'description','{}')||jsonb_build_object(locale,extra#>>array['deals',deal.id::text,'description'])) where id=deal.id;
 end loop;
 if enable then
 select coalesce(settings#>'{restaurant,languages}','["en"]') into langs from public.restaurants where id=rid;
 if not langs ? locale then langs=langs||jsonb_build_array(locale); end if;
 update public.restaurants set settings=jsonb_set(settings,'{restaurant,languages}',langs,true) where id=rid;
 end if;
end $$;
revoke all on function public.save_translations(uuid,text,jsonb,jsonb,boolean,jsonb) from public,anon;
grant execute on function public.save_translations(uuid,text,jsonb,jsonb,boolean,jsonb) to authenticated;
commit;
