begin;

-- Signup may remain confirmation-free. An email match alone must never grant access.
-- Existing memberships are preserved; pending invitations need a new private link.
alter table public.staff_invitations add column token_hash text, add column expires_at timestamptz;
alter table public.restaurant_invitations add column token_hash text, add column expires_at timestamptz;
create unique index staff_invitation_token on public.staff_invitations(token_hash) where token_hash is not null;
create unique index restaurant_invitation_token on public.restaurant_invitations(token_hash) where token_hash is not null;

create or replace function public.claim_access() returns void
language plpgsql security definer set search_path='' as $$
begin
  -- Kept as a harmless no-op for older cached clients.
  return;
end $$;

create function public.issue_invitation(invite_email text,invite_role text,rid uuid default null)
returns text language plpgsql security definer set search_path='' as $$
declare mail text:=lower(trim(invite_email)); secret text; digest text;
begin
  if rid is null then
    if not private.is_admin() then raise exception 'Admin access required'; end if;
    if invite_role is null or invite_role not in ('admin','operator') then raise exception 'Invalid invitation role'; end if;
  else
    if not private.is_owner(rid) then raise exception 'Owner access required'; end if;
    if invite_role is null or invite_role not in ('owner','editor') then raise exception 'Invalid invitation role'; end if;
  end if;
  if mail is null or length(mail)>320 or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid invitation email'; end if;
  secret:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  digest:=encode(sha256(convert_to(secret,'UTF8')),'hex');
  if rid is null then
    insert into public.staff_invitations(email,role,token_hash,expires_at)
    values(mail,invite_role,digest,now()+interval '7 days')
    on conflict(email) do update set role=excluded.role,token_hash=excluded.token_hash,expires_at=excluded.expires_at;
  else
    insert into public.restaurant_invitations(restaurant_id,email,role,token_hash,expires_at)
    values(rid,mail,invite_role,digest,now()+interval '7 days')
    on conflict(restaurant_id,email) do update set role=excluded.role,token_hash=excluded.token_hash,expires_at=excluded.expires_at;
  end if;
  insert into public.audit_log(restaurant_id,actor_id,action,entity,entity_id)
  values(rid,auth.uid(),'issue','invitation',mail);
  return secret;
end $$;

create function public.accept_invitation(invite_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare mail text; digest text; staff_inv public.staff_invitations; restaurant_inv public.restaurant_invitations;
begin
  if auth.uid() is null then raise exception 'Sign in again.'; end if;
  if invite_token is null or invite_token !~ '^[0-9a-f]{64}$' then raise exception 'Invitation unavailable'; end if;
  select lower(email) into mail from auth.users where id=auth.uid();
  digest:=encode(sha256(convert_to(invite_token,'UTF8')),'hex');
  select * into staff_inv from public.staff_invitations where token_hash=digest and expires_at>now() for update;
  if found then
    if mail is distinct from staff_inv.email then raise exception 'Invitation email mismatch'; end if;
    insert into public.palate_staff(user_id,role) values(auth.uid(),staff_inv.role) on conflict(user_id) do nothing;
    delete from public.staff_invitations where email=staff_inv.email;
    insert into public.audit_log(actor_id,action,entity,entity_id) values(auth.uid(),'accept','staff_invitation',mail);
    return jsonb_build_object('destination','/admin/');
  end if;
  select * into restaurant_inv from public.restaurant_invitations where token_hash=digest and expires_at>now() for update;
  if found then
    if mail is distinct from restaurant_inv.email then raise exception 'Invitation email mismatch'; end if;
    insert into public.restaurant_members(restaurant_id,user_id,role) values(restaurant_inv.restaurant_id,auth.uid(),restaurant_inv.role) on conflict(restaurant_id,user_id) do nothing;
    delete from public.restaurant_invitations where restaurant_id=restaurant_inv.restaurant_id and email=restaurant_inv.email;
    return jsonb_build_object('destination','/dashboard/','restaurant_id',restaurant_inv.restaurant_id);
  end if;
  raise exception 'Invitation unavailable';
end $$;

revoke all on function public.issue_invitation(text,text,uuid),public.accept_invitation(text) from public,anon;
grant execute on function public.issue_invitation(text,text,uuid),public.accept_invitation(text) to authenticated;
comment on function public.claim_access() is 'Deprecated no-op. Access requires a private single-use invitation or explicit staff demo approval.';
comment on function public.issue_invitation(text,text,uuid) is 'Returns a private link token once. Only its hash is stored. Reissuing invalidates the previous link.';
notify pgrst,'reload schema';
commit;
