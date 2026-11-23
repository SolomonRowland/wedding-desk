-- The Wedding Desk: sign-in, roles and shared wedding data
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once. Version 2 (Nov 2026).

-- 1. Tables ---------------------------------------------------------------
create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Wedding',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Everyone who can see a wedding. Each person picks their own role; access comes from their invite.
create table if not exists public.members (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  email text not null,
  role text not null check (role in (
    'bride','groom','coordinator','maid_of_honor','best_man','bridesmaid','groomsman',
    'brides_parents','grooms_parents','family','friend')),
  access text not null default 'viewer' check (access in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);

-- Invite codes the Bride or Groom hands out. One code can be used once.
-- access: owner = full control (for your fiance), editor = can change the plan, viewer = can look.
create table if not exists public.invites (
  code text primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  access text not null default 'viewer' check (access in ('owner','editor','viewer')),
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references auth.users(id),
  used_at timestamptz
);

-- The plan itself: one JSON document per wedding (tasks, guests, budget, ...).
-- Vendor portal passwords are stripped by the app before saving and never stored here.
create table if not exists public.wedding_state (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Deleting someone's account must never be blocked, and must not delete a wedding others still use.
alter table public.weddings alter column created_by drop not null;
alter table public.weddings drop constraint if exists weddings_created_by_fkey;
alter table public.weddings add constraint weddings_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
alter table public.invites drop constraint if exists invites_used_by_fkey;
alter table public.invites add constraint invites_used_by_fkey foreign key (used_by) references auth.users(id) on delete set null;
alter table public.wedding_state drop constraint if exists wedding_state_updated_by_fkey;
alter table public.wedding_state add constraint wedding_state_updated_by_fkey foreign key (updated_by) references auth.users(id) on delete set null;
create index if not exists members_user_idx on public.members(user_id);
create index if not exists invites_wedding_idx on public.invites(wedding_id);

-- 2. Helper checks (run with owner rights so policies don't loop) ----------
create or replace function public.wd_access(w uuid) returns text
language sql stable security definer set search_path = public as $$
  select access from public.members where wedding_id = w and user_id = auth.uid()
$$;
create or replace function public.wd_is_member(w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where wedding_id = w and user_id = auth.uid())
$$;

-- 3. Row level security ----------------------------------------------------
alter table public.weddings enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.wedding_state enable row level security;

drop policy if exists "members see their wedding" on public.weddings;
create policy "members see their wedding" on public.weddings for select using (public.wd_is_member(id));
drop policy if exists "owners rename wedding" on public.weddings;
create policy "owners rename wedding" on public.weddings for update using (public.wd_access(id) = 'owner');

drop policy if exists "members see each other" on public.members;
create policy "members see each other" on public.members for select using (public.wd_is_member(wedding_id));
drop policy if exists "update own name and role" on public.members;
create policy "update own name and role" on public.members for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and access = public.wd_access(wedding_id)
              and (role not in ('bride','groom') or access = 'owner'));
drop policy if exists "owners manage members" on public.members;
create policy "owners manage members" on public.members for update using (public.wd_access(wedding_id) = 'owner');
drop policy if exists "owners remove members, anyone can leave" on public.members;
create policy "owners remove members, anyone can leave" on public.members for delete
  using (user_id = auth.uid() or public.wd_access(wedding_id) = 'owner');

drop policy if exists "owners see invites" on public.invites;
create policy "owners see invites" on public.invites for select using (public.wd_access(wedding_id) = 'owner');
drop policy if exists "owners delete invites" on public.invites;
create policy "owners delete invites" on public.invites for delete using (public.wd_access(wedding_id) = 'owner');

drop policy if exists "members read plan" on public.wedding_state;
create policy "members read plan" on public.wedding_state for select using (public.wd_is_member(wedding_id));
drop policy if exists "editors save plan" on public.wedding_state;
create policy "editors save plan" on public.wedding_state for update
  using (public.wd_access(wedding_id) in ('owner','editor'))
  with check (public.wd_access(wedding_id) in ('owner','editor'));

-- 4. Actions the app calls -------------------------------------------------
-- Start a new wedding. The Bride or Groom who creates it becomes an owner.
create or replace function public.wd_create_wedding(p_name text, p_my_name text, p_my_role text)
returns uuid language plpgsql security definer set search_path = public as $$
declare w uuid; em text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_my_role not in ('bride','groom') then raise exception 'Only the Bride or Groom can start a wedding'; end if;
  select email into em from auth.users where id = auth.uid();
  insert into weddings(name, created_by) values (coalesce(nullif(trim(p_name),''),'Our Wedding'), auth.uid()) returning id into w;
  insert into members(wedding_id, user_id, name, email, role, access) values (w, auth.uid(), trim(p_my_name), em, p_my_role, 'owner');
  insert into wedding_state(wedding_id, updated_by) values (w, auth.uid());
  return w;
end $$;

-- Make an invite code (Bride or Groom only).
create or replace function public.wd_make_invite(p_wedding uuid, p_access text default 'viewer', p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if public.wd_access(p_wedding) is distinct from 'owner' then raise exception 'Only the Bride or Groom can invite people'; end if;
  if p_access is null or p_access not in ('owner','editor','viewer') then raise exception 'Bad access level'; end if;
  if (select count(*) from invites where wedding_id = p_wedding and used_by is null and expires_at > now()) >= 30 then
    raise exception 'Too many unused invites. Cancel some first.'; end if;
  c := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into invites(code, wedding_id, access, note, created_by) values (c, p_wedding, p_access, p_note, auth.uid());
  return c;
end $$;

-- Join with a code. The person picks their own name and role.
create or replace function public.wd_join(p_code text, p_my_name text, p_my_role text)
returns uuid language plpgsql security definer set search_path = public as $$
declare i invites; em text; n int; acc text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into i from invites where code = upper(trim(p_code)) for update;
  if not found or i.used_by is not null or i.expires_at < now() then raise exception 'That invite code is not valid any more'; end if;
  select count(*) into n from members where wedding_id = i.wedding_id;
  if n >= 16 then raise exception 'This wedding already has the most people allowed'; end if;
  select email into em from auth.users where id = auth.uid();
  -- access always comes from the invite, never from the role someone picks
  if p_my_role is null or p_my_role not in ('bride','groom','coordinator','maid_of_honor','best_man','bridesmaid','groomsman',
    'brides_parents','grooms_parents','family','friend') then raise exception 'Pick your role'; end if;
  if length(trim(coalesce(p_my_name,''))) = 0 then raise exception 'Add your name'; end if;
  if p_my_role in ('bride','groom') and i.access <> 'owner' then raise exception 'Bride and Groom need the partner invite'; end if;
  acc := i.access;
  insert into members(wedding_id, user_id, name, email, role, access)
    values (i.wedding_id, auth.uid(), trim(p_my_name), em, p_my_role, acc)
    on conflict (wedding_id, user_id) do update set name = excluded.name, role = excluded.role,
      -- re-joining never lowers what someone could already do
      access = case when array_position(array['viewer','editor','owner'], excluded.access) > array_position(array['viewer','editor','owner'], members.access)
                    then excluded.access else members.access end;
  update invites set used_by = auth.uid(), used_at = now() where code = i.code;
  return i.wedding_id;
end $$;

-- Save the plan, refusing if someone else saved first (the app then merges and retries).
create or replace function public.wd_save(p_wedding uuid, p_data jsonb, p_version int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  -- coalesce: someone who is not in this wedding at all gets null here, which must also be refused
  if coalesce(public.wd_access(p_wedding), '') not in ('owner','editor') then raise exception 'You can view this wedding but not change it'; end if;
  update wedding_state set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
    where wedding_id = p_wedding and version = p_version returning version into v;
  if v is null then raise exception 'conflict'; end if;
  return v;
end $$;

revoke all on function public.wd_create_wedding(text,text,text), public.wd_make_invite(uuid,text,text),
  public.wd_join(text,text,text), public.wd_save(uuid,jsonb,int) from public, anon;
grant execute on function public.wd_create_wedding(text,text,text), public.wd_make_invite(uuid,text,text),
  public.wd_join(text,text,text), public.wd_save(uuid,jsonb,int), public.wd_access(uuid), public.wd_is_member(uuid) to authenticated;

-- 5. Every wedding keeps at least one person with full control ------------
create or replace function public.wd_keep_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.access = 'owner') or (tg_op = 'UPDATE' and old.access = 'owner' and new.access <> 'owner') then
    -- deleting the whole wedding, or the person's whole account, is allowed
    if exists (select 1 from weddings where id = old.wedding_id) and exists (select 1 from auth.users where id = old.user_id)
       and not exists (select 1 from members where wedding_id = old.wedding_id and access = 'owner' and user_id <> old.user_id) then
      raise exception 'Someone else needs full control first';
    end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists wd_keep_owner on public.members;
create trigger wd_keep_owner before update or delete on public.members for each row execute function public.wd_keep_owner();

-- 6. Live updates so everyone sees changes right away ----------------------
do $$ begin
  alter publication supabase_realtime add table public.wedding_state;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.members;
exception when duplicate_object then null; end $$;
