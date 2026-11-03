begin;
-- All fixtures and changes are rolled back. No emails or permanent accounts.
insert into auth.users(id,email,email_confirmed_at) values
 ('11111111-1111-4111-8111-111111111111','invite-owner@palate-test.invalid',now()),
 ('22222222-2222-4222-8222-222222222222','invite-guest@palate-test.invalid',now()),
 ('33333333-3333-4333-8333-333333333333','invite-admin@palate-test.invalid',now()),
 ('44444444-4444-4444-8444-444444444444','invite-other@palate-test.invalid',now());
insert into public.palate_staff(user_id,role) values('33333333-3333-4333-8333-333333333333','admin');
insert into public.restaurants(id,name,slug,status) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Invitation test','invitation-security-test','active');
insert into public.restaurant_members(restaurant_id,user_id,role) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner');
insert into public.restaurant_invitations(restaurant_id,email,role) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','invite-guest@palate-test.invalid','editor');
insert into public.staff_invitations(email,role) values('invite-guest@palate-test.invalid','operator');
create temporary table tokens(k text primary key,t text);
grant all on tokens to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 perform public.claim_access();
 if exists(select 1 from public.restaurant_members where user_id=auth.uid()) or exists(select 1 from public.palate_staff where user_id=auth.uid()) then raise exception 'FAIL auto-confirmed email claimed access'; end if;
 begin perform public.issue_invitation('someone@palate-test.invalid','admin',null);raise exception 'FAIL user can invite staff';exception when raise_exception then if SQLERRM<>'Admin access required' then raise;end if;end;
 begin perform public.accept_invitation(repeat('0',64));raise exception 'FAIL invalid token accepted';exception when raise_exception then if SQLERRM<>'Invitation unavailable' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
insert into tokens values('old',public.issue_invitation('invite-guest@palate-test.invalid','editor','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
insert into tokens values('valid',public.issue_invitation('invite-guest@palate-test.invalid','editor','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
do $$ begin
 begin perform public.issue_invitation('someone@palate-test.invalid','admin',null);raise exception 'FAIL owner can invite staff';exception when raise_exception then if SQLERRM<>'Admin access required' then raise;end if;end;
 begin perform public.issue_invitation('someone@palate-test.invalid','admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');raise exception 'FAIL invalid restaurant role';exception when raise_exception then if SQLERRM<>'Invalid invitation role' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
do $$ begin
 begin perform public.accept_invitation((select t from tokens where k='valid'));raise exception 'FAIL wrong email accepted';exception when raise_exception then if SQLERRM<>'Invitation email mismatch' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 begin perform public.accept_invitation((select t from tokens where k='old'));raise exception 'FAIL replaced link accepted';exception when raise_exception then if SQLERRM<>'Invitation unavailable' then raise;end if;end;
 if public.accept_invitation((select t from tokens where k='valid'))->>'destination'<>'/dashboard/' then raise exception 'FAIL wrong owner destination';end if;
 if not exists(select 1 from public.restaurant_members where user_id=auth.uid() and role='editor') then raise exception 'FAIL no restaurant membership';end if;
 begin perform public.accept_invitation((select t from tokens where k='valid'));raise exception 'FAIL invitation replay';exception when raise_exception then if SQLERRM<>'Invitation unavailable' then raise;end if;end;
 begin perform public.issue_invitation('someone@palate-test.invalid','owner','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');raise exception 'FAIL editor can invite owner';exception when raise_exception then if SQLERRM<>'Owner access required' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
insert into tokens values('expired',public.issue_invitation('invite-other@palate-test.invalid','operator',null));
reset role;
update public.staff_invitations set expires_at=now()-interval '1 second' where email='invite-other@palate-test.invalid';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
do $$ begin
 begin perform public.accept_invitation((select t from tokens where k='expired'));raise exception 'FAIL expired link accepted';exception when raise_exception then if SQLERRM<>'Invitation unavailable' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
insert into tokens values('staff',public.issue_invitation('invite-other@palate-test.invalid','operator',null));
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
do $$ begin
 if public.accept_invitation((select t from tokens where k='staff'))->>'destination'<>'/admin/' then raise exception 'FAIL wrong staff destination';end if;
 if not exists(select 1 from public.palate_staff where user_id=auth.uid() and role='operator') then raise exception 'FAIL no staff membership';end if;
end $$;
set local role anon;
do $$ begin
 begin perform public.accept_invitation(repeat('0',64));raise exception 'FAIL anonymous redemption';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: email-only access blocked; roles, matching email, rotation, expiry, single-use redemption and anonymous denial verified' as result;
rollback;
