begin;
create or replace function public.restaurant_analytics(rid uuid,days int default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb; since timestamptz; begin
 if not private.can_manage(rid) then raise exception 'Restaurant access required'; end if;
 since=date_trunc('day',now())-make_interval(days=>greatest(1,least(days,365))-1);
 with e as (select * from public.menu_events where restaurant_id=rid and created_at>=since),
 totals as (select count(distinct session_id) filter(where kind='menu_view') as visits,count(*) filter(where kind='dish_view') as views,count(*) filter(where kind='save') as saves,count(*) filter(where kind='recommendation') as recommendations,count(distinct session_id) filter(where kind in ('dish_view','save','recommendation','deal_view')) as engaged from e)
 select jsonb_build_object('totals',(select to_jsonb(t) from totals t),
 'daily',(select coalesce(jsonb_agg(x),'[]') from (select d::date as day,count(distinct e.session_id) filter(where e.kind='menu_view') as visits,count(*) filter(where e.kind='dish_view') as views from generate_series(date_trunc('day',since),date_trunc('day',now()),interval '1 day') d left join e on e.created_at>=d and e.created_at<d+interval '1 day' group by d order by d) x),
 'items',(select coalesce(jsonb_agg(x),'[]') from (select i.id,i.name,i.data->>'image' as image,count(*) filter(where e.kind='dish_view') as views,count(*) filter(where e.kind='save') as saves from public.menu_items i left join e on e.item_id=i.id where i.restaurant_id=rid group by i.id order by views desc,saves desc limit 20) x),
 'sources',(select coalesce(jsonb_agg(x),'[]') from (select source,count(distinct session_id) as visits from e where kind='menu_view' group by source order by visits desc) x),
 'languages',(select coalesce(jsonb_agg(x),'[]') from (select language,count(*) as events from e where kind in ('menu_view','language') group by language order by events desc) x),
 'dealViews',(select count(*) from e where kind='deal_view')) into result;
 return result; end $$;
commit;
