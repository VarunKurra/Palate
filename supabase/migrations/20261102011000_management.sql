begin;
create function public.reorder_categories(rid uuid,ordered_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.can_manage(rid) then raise exception 'Restaurant access required'; end if;
 if cardinality(ordered_ids)<>(select count(*) from public.menu_categories where restaurant_id=rid) or cardinality(ordered_ids)<>(select count(distinct id) from unnest(ordered_ids) id) or exists(select 1 from unnest(ordered_ids) id where not exists(select 1 from public.menu_categories c where c.id=id and c.restaurant_id=rid)) then raise exception 'Invalid category order'; end if;
 update public.menu_categories c set position=u.ord from unnest(ordered_ids) with ordinality as u(id,ord) where c.id=u.id and c.restaurant_id=rid;
end $$;
create function public.save_menu_deal(rid uuid,deal_id uuid,details jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare chosen uuid; total int; begin
 if not private.can_manage(rid) then raise exception 'Restaurant access required'; end if;
 if jsonb_array_length(details#>'{data,itemIds}')<2 then raise exception 'Choose at least two dishes'; end if;
 if exists(select 1 from jsonb_array_elements_text(details#>'{data,itemIds}') x where not exists(select 1 from public.menu_items where restaurant_id=rid and id::text=x)) then raise exception 'Unknown dish in special'; end if;
 select sum(price_cents) into total from public.menu_items where restaurant_id=rid and id::text in (select jsonb_array_elements_text(details#>'{data,itemIds}'));
 if (details->>'discount_cents')::int>total then raise exception 'Discount exceeds bundle total'; end if;
 perform pg_advisory_xact_lock(hashtextextended(rid::text,1));
 if (details->>'enabled')::boolean then update public.menu_deals set enabled=false where restaurant_id=rid and enabled; end if;
 if deal_id is null then
 insert into public.menu_deals(restaurant_id,name,enabled,discount_cents,data) values(rid,details->>'name',(details->>'enabled')::boolean,(details->>'discount_cents')::int,details->'data') returning id into chosen;
 else
 update public.menu_deals set name=details->>'name',enabled=(details->>'enabled')::boolean,discount_cents=(details->>'discount_cents')::int,data=details->'data' where id=deal_id and restaurant_id=rid returning id into chosen;
 if not found then raise exception 'Special not found'; end if;
 end if; return chosen;
end $$;
create unique index one_featured_special on public.menu_deals(restaurant_id) where enabled;
create function public.create_restaurant(restaurant_name text,restaurant_slug text,owner text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; begin
 if not private.is_staff() then raise exception 'Staff access required'; end if;
 insert into public.restaurants(name,slug,owner_email,settings) values(restaurant_name,restaurant_slug,nullif(lower(trim(owner)),''),jsonb_build_object('restaurant',jsonb_build_object('currency','USD','languages',jsonb_build_array('en'),'monogram',left(restaurant_name,1),'theme',jsonb_build_object('accent','#315846','accentSoft','#e8efe8','paper','#fcfaf6','warm','#f5e6d7'),'address',jsonb_build_object('en',''),'hours',jsonb_build_object('en','')))) returning id into rid;
 insert into public.menu_categories(restaurant_id,name,position) values(rid,'{"en":"Starters"}',0),(rid,'{"en":"Main dishes"}',1),(rid,'{"en":"Desserts"}',2),(rid,'{"en":"Drinks"}',3);
 if nullif(trim(owner),'') is not null then insert into public.restaurant_invitations(restaurant_id,email,role) values(rid,lower(trim(owner)),'owner'); end if;
 return rid;
end $$;
revoke all on function public.reorder_categories(uuid,uuid[]),public.save_menu_deal(uuid,uuid,jsonb),public.create_restaurant(text,text,text) from public,anon;
grant execute on function public.reorder_categories(uuid,uuid[]),public.save_menu_deal(uuid,uuid,jsonb),public.create_restaurant(text,text,text) to authenticated;
commit;
