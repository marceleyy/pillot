-- =====================================================================
-- Rôles et comptes : plusieurs commerces par compte, ouverture d'un
-- commerce sans SQL, rôle par défaut corrigé.
-- Dépend de 20261005_02_rls (my_restaurant_id, my_role, is_admin, can_manage,
-- profiles_guard_role) et de 20261114_02_parametres.
--
-- Principe : profiles.restaurant_id reste le « commerce ouvert » (toutes les
-- règles RLS s'appuient dessus). La table restaurant_members liste les
-- commerces d'un compte et son rôle dans chacun ; changer_restaurant()
-- bascule de l'un à l'autre.
-- Rôles : admin (Pillot), owner (gérant), manager (responsable), employee (équipe).
-- =====================================================================

-- ── 1. Rôle par défaut ────────────────────────────────────────────────
-- « staff » n'était géré par aucune règle : un gérant ne pouvait pas le changer.
update public.profiles set role = 'employee' where role is null or role not in ('admin', 'owner', 'manager', 'employee');
alter table public.profiles alter column role set default 'employee';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'owner', 'manager', 'employee'));

-- ── 2. Commerces d'un compte ──────────────────────────────────────────
create table if not exists public.restaurant_members (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role          text not null default 'employee' check (role in ('owner', 'manager', 'employee')),
  created_at    timestamptz not null default now(),
  primary key (profile_id, restaurant_id)
);
create index if not exists restaurant_members_restaurant on public.restaurant_members (restaurant_id);

-- Reprise de l'existant : chaque compte rattaché devient membre de son commerce.
insert into public.restaurant_members (profile_id, restaurant_id, role)
select p.id, p.restaurant_id, case when p.role in ('owner', 'manager') then p.role else 'employee' end
from public.profiles p
where p.restaurant_id is not null and p.role <> 'admin'
on conflict do nothing;

alter table public.restaurant_members enable row level security;
drop policy if exists members_select on public.restaurant_members;
create policy members_select on public.restaurant_members
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin()
         or (public.can_manage() and restaurant_id = public.my_restaurant_id()));
-- Écritures : seulement par les fonctions ci-dessous.
revoke insert, update, delete on public.restaurant_members from anon, authenticated;
grant select on public.restaurant_members to authenticated;

-- ── 3. Mes commerces / changer de commerce ────────────────────────────
create or replace function public.mes_restaurants()
returns table (id uuid, name text, ville text, role text, actuel boolean)
language sql stable security definer set search_path = public
as $$
  select r.id, r.name, r.ville,
         case when public.is_admin() then 'admin' else m.role end,
         r.id = public.my_restaurant_id()
  from public.restaurants r
  left join public.restaurant_members m on m.restaurant_id = r.id and m.profile_id = auth.uid()
  where m.profile_id is not null or public.is_admin()
  order by r.name
$$;

create or replace function public.changer_restaurant(p_restaurant uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'Non connecté' using errcode = '42501'; end if;
  if public.is_admin() then
    if not exists (select 1 from public.restaurants where id = p_restaurant) then
      raise exception 'Commerce introuvable';
    end if;
    update public.profiles set restaurant_id = p_restaurant where id = auth.uid();
    return;
  end if;
  select role into v_role from public.restaurant_members
  where profile_id = auth.uid() and restaurant_id = p_restaurant;
  if v_role is null then raise exception 'Vous n''avez pas accès à ce commerce' using errcode = '42501'; end if;
  update public.profiles set restaurant_id = p_restaurant, role = v_role where id = auth.uid();
end;
$$;

-- ── 4. Équipe d'un commerce (gérant) ──────────────────────────────────
create or replace function public.membres_du_commerce()
returns table (profile_id uuid, name text, email text, role text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.email, m.role
  from public.restaurant_members m join public.profiles p on p.id = m.profile_id
  where m.restaurant_id = public.my_restaurant_id()
    and (public.can_manage())
  order by case m.role when 'owner' then 0 when 'manager' then 1 else 2 end, p.name, p.email
$$;

-- Ajoute un compte existant (il s'est inscrit avec cet e-mail) au commerce ouvert,
-- ou change son rôle. Un gérant donne les rôles responsable ou équipe ;
-- seul l'admin nomme un gérant.
create or replace function public.ajouter_membre(p_email text, p_role text)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_rest uuid := public.my_restaurant_id(); v_id uuid;
begin
  if not public.can_manage() or v_rest is null then
    raise exception 'Réservé au gérant du commerce' using errcode = '42501';
  end if;
  if p_role not in ('owner', 'manager', 'employee') then raise exception 'Rôle inconnu'; end if;
  if p_role = 'owner' and not public.is_admin() then
    raise exception 'Seul l''administrateur nomme un gérant' using errcode = '42501';
  end if;
  if public.my_role() = 'manager' and p_role <> 'employee' then
    raise exception 'Un responsable ajoute seulement des membres de l''équipe' using errcode = '42501';
  end if;
  select id into v_id from public.profiles where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'Aucun compte avec cet e-mail : la personne doit d''abord créer son compte Pillot';
  end if;
  if v_id = auth.uid() then raise exception 'Vous ne pouvez pas changer votre propre rôle'; end if;
  if exists (select 1 from public.profiles where id = v_id and role = 'admin') then
    raise exception 'Ce compte est administrateur';
  end if;
  if exists (select 1 from public.restaurant_members where profile_id = v_id and restaurant_id = v_rest and role = 'owner')
     and not public.is_admin() then
    raise exception 'Seul l''administrateur change le rôle d''un gérant' using errcode = '42501';
  end if;
  -- Un responsable ne change pas le rôle d'un autre responsable.
  if public.my_role() = 'manager' and exists (
       select 1 from public.restaurant_members
       where profile_id = v_id and restaurant_id = v_rest and role = 'manager') then
    raise exception 'Seul le gérant change le rôle d''un responsable' using errcode = '42501';
  end if;
  insert into public.restaurant_members (profile_id, restaurant_id, role)
  values (v_id, v_rest, p_role)
  on conflict (profile_id, restaurant_id) do update set role = excluded.role;
  -- Compte sans commerce ouvert, ou déjà sur celui-ci : il l'ouvre avec ce rôle.
  update public.profiles set restaurant_id = v_rest, role = p_role
  where id = v_id and (restaurant_id is null or restaurant_id = v_rest);
  return v_id::text;
end;
$$;

create or replace function public.retirer_membre(p_profile uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_rest uuid := public.my_restaurant_id(); v_role text; v_autre uuid; v_autre_role text;
begin
  if not public.can_manage() or v_rest is null then
    raise exception 'Réservé au gérant du commerce' using errcode = '42501';
  end if;
  if p_profile = auth.uid() then raise exception 'Vous ne pouvez pas vous retirer vous-même'; end if;
  select role into v_role from public.restaurant_members where profile_id = p_profile and restaurant_id = v_rest;
  if v_role is null then return; end if;
  if v_role = 'owner' and not public.is_admin() then
    raise exception 'Seul l''administrateur retire un gérant' using errcode = '42501';
  end if;
  if v_role = 'manager' and public.my_role() = 'manager' then
    raise exception 'Un responsable retire seulement des membres de l''équipe' using errcode = '42501';
  end if;
  delete from public.restaurant_members where profile_id = p_profile and restaurant_id = v_rest;
  -- S'il avait ce commerce ouvert : il bascule sur un autre de ses commerces, ou sur aucun.
  select restaurant_id, role into v_autre, v_autre_role from public.restaurant_members
  where profile_id = p_profile order by created_at limit 1;
  update public.profiles set restaurant_id = v_autre, role = coalesce(v_autre_role, 'employee')
  where id = p_profile and restaurant_id = v_rest;
end;
$$;

-- ── 5. Ouvrir un commerce (admin) ─────────────────────────────────────
create or replace function public.creer_commerce(p_nom text, p_ville text, p_email_gerant text)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_rest uuid; v_gerant uuid;
begin
  if not public.is_admin() then raise exception 'Réservé à l''administrateur' using errcode = '42501'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Nom du commerce obligatoire'; end if;
  insert into public.restaurants (name, ville) values (trim(p_nom), nullif(trim(p_ville), ''))
  returning id into v_rest;
  if coalesce(trim(p_email_gerant), '') <> '' then
    select id into v_gerant from public.profiles
    where lower(email) = lower(trim(p_email_gerant)) and role <> 'admin';
    if v_gerant is not null then
      insert into public.restaurant_members (profile_id, restaurant_id, role)
      values (v_gerant, v_rest, 'owner') on conflict (profile_id, restaurant_id) do update set role = 'owner';
      update public.profiles set restaurant_id = v_rest, role = 'owner'
      where id = v_gerant and restaurant_id is null;
    end if;
  end if;
  return json_build_object('restaurant_id', v_rest, 'gerant_rattache', v_gerant is not null);
end;
$$;

revoke execute on function public.mes_restaurants()                 from public, anon;
revoke execute on function public.changer_restaurant(uuid)          from public, anon;
revoke execute on function public.membres_du_commerce()             from public, anon;
revoke execute on function public.ajouter_membre(text, text)        from public, anon;
revoke execute on function public.retirer_membre(uuid)              from public, anon;
revoke execute on function public.creer_commerce(text, text, text)  from public, anon;
grant execute on function public.mes_restaurants()                 to authenticated;
grant execute on function public.changer_restaurant(uuid)          to authenticated;
grant execute on function public.membres_du_commerce()             to authenticated;
grant execute on function public.ajouter_membre(text, text)        to authenticated;
grant execute on function public.retirer_membre(uuid)              to authenticated;
grant execute on function public.creer_commerce(text, text, text)  to authenticated;

-- ── 6. Congés et heures : seul un responsable valide ou corrige ───────
-- Les anciennes règles « leave own » / « time own » laissaient un employé
-- valider son propre congé ou modifier ses heures.
drop policy if exists manage_update on public.leave_requests;
create policy manage_update on public.leave_requests as restrictive for update to authenticated
  using (public.can_manage()) with check (public.can_manage());
drop policy if exists manage_delete on public.leave_requests;
create policy manage_delete on public.leave_requests as restrictive for delete to authenticated
  using (public.can_manage());
-- Création par un employé : seulement « en attente » / non validée.
drop policy if exists manage_insert on public.leave_requests;
create policy manage_insert on public.leave_requests as restrictive for insert to authenticated
  with check (public.can_manage() or (coalesce(statut, 'en_attente') = 'en_attente' and traite_par is null));
drop policy if exists manage_insert on public.time_entries;
create policy manage_insert on public.time_entries as restrictive for insert to authenticated
  with check (public.can_manage() or valide_par is null);
drop policy if exists manage_update on public.time_entries;
create policy manage_update on public.time_entries as restrictive for update to authenticated
  using (public.can_manage()) with check (public.can_manage());
drop policy if exists manage_delete on public.time_entries;
create policy manage_delete on public.time_entries as restrictive for delete to authenticated
  using (public.can_manage());
