begin;
-- Disposable fixtures, rolled back even on success. No emails are sent.
insert into auth.users(id,email,email_confirmed_at) values
 ('11111111-1111-4111-8111-111111111111','owner-a@palate-test.invalid',now()),
 ('22222222-2222-4222-8222-222222222222','owner-b@palate-test.invalid',now()),
 ('33333333-3333-4333-8333-333333333333','staff@palate-test.invalid',now()),
 ('44444444-4444-4444-8444-444444444444','pending@palate-test.invalid',now());
insert into public.palate_staff values('33333333-3333-4333-8333-333333333333','admin',now());
insert into public.restaurants(id,name,slug,status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Test A','test-isolation-a','active'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Test B','test-isolation-b','active'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Test C','test-isolation-c','setup');
insert into public.restaurant_members values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner',now()),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner',now());
insert into public.menu_categories(id,restaurant_id,name) values
 ('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"en":"Mains"}'),
 ('bbbbbbbb-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"en":"Mains"}');
insert into public.menu_items(id,restaurant_id,category_id,name,price_cents) values
 ('aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-0000-4000-8000-000000000001','Dish A',1200),
 ('bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bbbbbbbb-0000-4000-8000-000000000001','Dish B',1300);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","email":"owner-a@palate-test.invalid","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.restaurants)<>1 then raise exception 'FAIL owner tenant isolation'; end if;
 if (select count(*) from public.menu_items)<>1 then raise exception 'FAIL owner item isolation'; end if;
 update public.menu_items set name='Dish A edited' where id='aaaaaaaa-0000-4000-8000-000000000002';
 if not found then raise exception 'FAIL owner cannot edit own dish'; end if;
 update public.menu_items set name='Wrong owner' where id='bbbbbbbb-0000-4000-8000-000000000002';
 if found then raise exception 'FAIL cross-tenant update'; end if;
 begin update public.restaurants set status='active' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; raise exception 'FAIL owner status escalation'; exception when insufficient_privilege then null; end;
 begin perform public.set_restaurant_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','paused'); raise exception 'FAIL owner RPC escalation'; exception when raise_exception then if SQLERRM<>'Staff access required' then raise; end if; end;
 begin insert into public.palate_staff(user_id,role) values(auth.uid(),'admin'); raise exception 'FAIL self-granted staff'; exception when insufficient_privilege then null; end;
 begin perform public.restaurant_analytics('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',30); raise exception 'FAIL analytics leak'; exception when raise_exception then if SQLERRM<>'Restaurant access required' then raise; end if; end;
 begin insert into public.menu_items(restaurant_id,category_id,name) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-0000-4000-8000-000000000001','Invalid category'); raise exception 'FAIL cross-tenant FK'; exception when foreign_key_violation then null; end;
 if public.get_public_menu('test-isolation-a')#>>'{items,0,name,en}'<>'Dish A edited' then raise exception 'FAIL menu propagation'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","email":"pending@palate-test.invalid","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.menu_items) then raise exception 'FAIL unapproved private menu read'; end if;
 if exists(select 1 from public.restaurants) then raise exception 'FAIL unapproved restaurant read'; end if;
 insert into public.demo_requests(user_id,name,restaurant_name,email) values(auth.uid(),'Pending','New restaurant','pending@palate-test.invalid');
 begin update public.demo_requests set status='approved' where user_id=auth.uid(); if found then raise exception 'FAIL self-approved demo'; end if; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","email":"staff@palate-test.invalid","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.restaurants)<3 then raise exception 'FAIL staff access'; end if;
 perform public.set_restaurant_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','paused');
 if (select status from public.restaurants where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>'paused' then raise exception 'FAIL status RPC'; end if;
 perform public.set_restaurant_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active');
 if not exists(select 1 from public.demo_requests) then raise exception 'FAIL staff demo inbox'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ declare m jsonb; begin
 m=public.get_public_menu('test-isolation-a');
 if m#>>'{restaurant,name}'<>'Test A' then raise exception 'FAIL public menu read'; end if;
 if m->'restaurant' ? 'owner_email' then raise exception 'FAIL private email in public menu'; end if;
 begin perform public.get_public_menu('test-isolation-c'); raise exception 'FAIL unpublished menu exposed'; exception when raise_exception then if SQLERRM<>'Menu unavailable' then raise; end if; end;
 begin perform 1 from public.restaurants; raise exception 'FAIL anon private table read'; exception when insufficient_privilege then null; end;
 begin perform public.set_restaurant_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','paused'); raise exception 'FAIL anon status RPC'; exception when insufficient_privilege then null; end;
 perform public.record_menu_event('test-isolation-a','55555555-5555-4555-8555-555555555555','menu_view');
 perform public.record_menu_event('test-isolation-a','55555555-5555-4555-8555-555555555555','menu_view');
 perform public.record_menu_event('test-isolation-a','55555555-5555-4555-8555-555555555555','dish_view','bbbbbbbb-0000-4000-8000-000000000002');
end $$;
reset role;
do $$ begin
 if (select count(*) from public.menu_events where restaurant_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>1 then raise exception 'FAIL analytics deduplication or cross-tenant dish'; end if;
end $$;
select 'PASS: owner isolation, edit propagation, pending access, staff activation, anonymous privacy, analytics isolation and deduplication' as result;
rollback;
