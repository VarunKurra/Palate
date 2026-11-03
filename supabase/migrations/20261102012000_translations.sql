begin;
create function public.save_translations(rid uuid,locale text,translations jsonb,category_names jsonb,enable boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare item record; cat record; langs jsonb; begin
 if not private.can_manage(rid) then raise exception 'Restaurant access required'; end if;
 if locale='en' or locale !~ '^[a-z]{2,3}(-[A-Za-z]{2,4})?$' then raise exception 'Invalid language'; end if;
 for item in select * from public.menu_items where restaurant_id=rid loop
 if coalesce(translations#>>array[item.id::text,'name'],'')='' then raise exception 'Translate every dish name before enabling this language'; end if;
 update public.menu_items set data=data||jsonb_build_object('name',coalesce(data->'name','{}')||jsonb_build_object(locale,translations#>>array[item.id::text,'name']),'description',coalesce(data->'description','{}')||jsonb_build_object(locale,translations#>>array[item.id::text,'description']),'short',coalesce(data->'short','{}')||jsonb_build_object(locale,translations#>>array[item.id::text,'description']),'ingredients',coalesce(data->'ingredients','{}')||jsonb_build_object(locale,translations#>>array[item.id::text,'ingredients'])) where id=item.id;
 end loop;
 for cat in select * from public.menu_categories where restaurant_id=rid loop
 if coalesce(category_names->>cat.id::text,'')='' then raise exception 'Translate every category'; end if;
 update public.menu_categories set name=name||jsonb_build_object(locale,category_names->>cat.id::text) where id=cat.id;
 end loop;
 if enable then
 select coalesce(settings#>'{restaurant,languages}','["en"]') into langs from public.restaurants where id=rid;
 if not langs ? locale then langs=langs||jsonb_build_array(locale); end if;
 update public.restaurants set settings=jsonb_set(settings,'{restaurant,languages}',langs,true) where id=rid;
 end if;
end $$;
revoke all on function public.save_translations(uuid,text,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.save_translations(uuid,text,jsonb,jsonb,boolean) to authenticated;
insert into public.staff_invitations(email,role) values('varunbkurra@gmail.com','admin') on conflict(email) do nothing;
commit;
