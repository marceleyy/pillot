-- =====================================================================
-- Pillot — RLS multi-restaurant (2026-10-05)
-- Idempotent : create or replace / drop policy if exists.
-- À appliquer APRÈS 20261005_01_nouvelles_tables.sql.
-- Rôles applicatifs (profiles.role) : admin | owner | manager | employee
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Fonctions d'aide (security definer => lisent profiles sans RLS,
--    donc pas de récursion dans les policies de profiles)
-- ---------------------------------------------------------------------
create or replace function public.my_restaurant_id()
returns uuid  -- adapter si restaurants.id n'est pas uuid
language sql stable security definer
set search_path = public
as $$
  select p.restaurant_id from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.my_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select p.role::text from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.can_manage()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.my_role() in ('owner', 'manager', 'admin'), false)
$$;

revoke execute on function public.my_restaurant_id() from public, anon;
revoke execute on function public.my_role()          from public, anon;
revoke execute on function public.is_admin()         from public, anon;
revoke execute on function public.can_manage()       from public, anon;
grant  execute on function public.my_restaurant_id() to authenticated, service_role;
grant  execute on function public.my_role()          to authenticated, service_role;
grant  execute on function public.is_admin()         to authenticated, service_role;
grant  execute on function public.can_manage()       to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (public.can_manage() and restaurant_id = public.my_restaurant_id())
  );

-- Update : soi-même, un gérant/manager sur son restaurant, ou admin.
-- Les changements de role / restaurant_id sont contrôlés par le trigger ci-dessous.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (public.can_manage() and restaurant_id = public.my_restaurant_id())
  )
  with check (
    id = auth.uid()
    or public.is_admin()
    or (public.can_manage() and restaurant_id = public.my_restaurant_id())
  );

-- Insert / delete : admin seulement (les invitations passent par une edge
-- function avec la clé service_role, qui contourne la RLS).
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- Trigger : empêche l'escalade de privilèges via role / restaurant_id.
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- service_role / postgres (edge functions, SQL editor) : pas de contrôle
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.role is not distinct from old.role
     and new.restaurant_id is not distinct from old.restaurant_id then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- Gérant (owner) seulement : peut changer le rôle d'un membre de SON
  -- restaurant entre manager et employee, sans déplacer la personne, sans
  -- toucher à un owner/admin, et sans modifier son propre rôle.
  -- (Un manager ne peut ni promouvoir ni rétrograder : aligné sur invite-employe.)
  if public.my_role() = 'owner'
     and old.restaurant_id = public.my_restaurant_id()
     and new.restaurant_id is not distinct from old.restaurant_id
     and old.id <> auth.uid()
     and coalesce(old.role::text, 'employee') in ('manager', 'employee')
     and new.role::text in ('manager', 'employee') then
    return new;
  end if;

  raise exception 'Modification de role ou restaurant_id non autorisée'
    using errcode = '42501';
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ---------------------------------------------------------------------
-- 3. restaurants
-- ---------------------------------------------------------------------
alter table public.restaurants enable row level security;

drop policy if exists restaurants_select on public.restaurants;
create policy restaurants_select on public.restaurants
  for select to authenticated
  using (id = public.my_restaurant_id() or public.is_admin());

drop policy if exists restaurants_update on public.restaurants;
create policy restaurants_update on public.restaurants
  for update to authenticated
  using ((public.can_manage() and id = public.my_restaurant_id()) or public.is_admin())
  with check ((public.can_manage() and id = public.my_restaurant_id()) or public.is_admin());

drop policy if exists restaurants_insert on public.restaurants;
create policy restaurants_insert on public.restaurants
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists restaurants_delete on public.restaurants;
create policy restaurants_delete on public.restaurants
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Isolation par restaurant : policy tenant_all sur chaque table
--    ayant une colonne restaurant_id (ignorée si table/colonne absente)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'products','stock_entries','recipes','temperature_logs','cleaning_logs',
    'dlc_entries','reception_controls','oil_changes','equipements','employees',
    'shift_types','shifts','tasks','task_completions','glaces_flavors',
    'glaces_daily','pos_imports','pos_sales','scanned_invoices','ca_history',
    'pointages','nettoyage_plans','ca_imports'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'restaurant_id'
    ) then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists tenant_all on public.%I', t);
      execute format(
        'create policy tenant_all on public.%I for all to authenticated
           using (restaurant_id = public.my_restaurant_id() or public.is_admin())
           with check (restaurant_id = public.my_restaurant_id() or public.is_admin())', t);
    else
      raise notice 'tenant_all ignorée : public.% absente ou sans restaurant_id', t;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Restrictions par rôle (policies RESTRICTIVE, combinées en ET)
-- ---------------------------------------------------------------------

-- 5a. Écriture réservée à owner/manager/admin.
--     (shifts ajouté : seul le planning "canManage" écrit des services.)
--     NB : restaurants a déjà ses policies dédiées (section 3).
do $$
declare
  t text;
  tables text[] := array[
    'products','recipes','equipements','employees','shift_types',
    'ca_history','ca_imports','shifts','restaurants'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists manage_insert on public.%I', t);
      execute format('drop policy if exists manage_update on public.%I', t);
      execute format('drop policy if exists manage_delete on public.%I', t);
      execute format('create policy manage_insert on public.%I as restrictive for insert to authenticated with check (public.can_manage())', t);
      execute format('create policy manage_update on public.%I as restrictive for update to authenticated using (public.can_manage()) with check (public.can_manage())', t);
      execute format('create policy manage_delete on public.%I as restrictive for delete to authenticated using (public.can_manage())', t);
    end if;
  end loop;
end $$;

-- 5b. shifts : un employé ne voit que les services publiés (colonne "published").
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'shifts' and column_name = 'published') then
    drop policy if exists shifts_published_only on public.shifts;
    create policy shifts_published_only on public.shifts
      as restrictive for select to authenticated
      using (public.can_manage() or published is true);
  end if;
end $$;

-- 5c. employees : lecture pour tout le restaurant (via tenant_all).
--     ATTENTION : le front n'affiche que id,nom,prenom,heures_contrat aux
--     employés, mais la RLS filtre des LIGNES, pas des colonnes :
--     salaire_horaire reste lisible par un employé via l'API. Pour le
--     masquer il faudrait une vue (security_invoker) exposant les colonnes
--     publiques + révoquer le select direct, ou des GRANT par colonne.

-- 5d. pointages : badgeuse partagée sur la tablette => tout membre du
--     restaurant peut insérer / clôturer (update). Suppression : managers.
do $$
begin
  if to_regclass('public.pointages') is not null then
    drop policy if exists pointages_delete_manage on public.pointages;
    create policy pointages_delete_manage on public.pointages
      as restrictive for delete to authenticated
      using (public.can_manage());
    -- Un employé ne peut que fermer un pointage encore ouvert ; corriger un pointage clos = manager
    drop policy if exists pointages_update_open on public.pointages;
    create policy pointages_update_open on public.pointages
      as restrictive for update to authenticated
      using (public.can_manage() or fin is null);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. Tables sans restaurant_id
-- ---------------------------------------------------------------------

-- 6a. recipe_items : rattachée via recipe_id -> recipes.restaurant_id
do $$
begin
  if to_regclass('public.recipe_items') is not null then
    alter table public.recipe_items enable row level security;

    drop policy if exists tenant_all on public.recipe_items;
    create policy tenant_all on public.recipe_items
      for all to authenticated
      using (exists (select 1 from public.recipes r
                     where r.id = recipe_items.recipe_id
                       and (r.restaurant_id = public.my_restaurant_id() or public.is_admin())))
      with check (exists (select 1 from public.recipes r
                          where r.id = recipe_items.recipe_id
                            and (r.restaurant_id = public.my_restaurant_id() or public.is_admin())));

    -- Écriture alignée sur recipes (managers seulement)
    drop policy if exists manage_insert on public.recipe_items;
    drop policy if exists manage_update on public.recipe_items;
    drop policy if exists manage_delete on public.recipe_items;
    create policy manage_insert on public.recipe_items as restrictive for insert to authenticated with check (public.can_manage());
    create policy manage_update on public.recipe_items as restrictive for update to authenticated using (public.can_manage()) with check (public.can_manage());
    create policy manage_delete on public.recipe_items as restrictive for delete to authenticated using (public.can_manage());
  end if;
end $$;

-- 6b. scanned_invoice_items : rattachée à scanned_invoices.
--     La table n'est pas utilisée dans le front : la colonne de liaison est
--     détectée (scanned_invoice_id, puis invoice_id). Si l'item possède
--     lui-même restaurant_id, on l'utilise directement.
do $$
declare
  fk text;
begin
  if to_regclass('public.scanned_invoice_items') is null then
    return;
  end if;
  execute 'alter table public.scanned_invoice_items enable row level security';
  execute 'drop policy if exists tenant_all on public.scanned_invoice_items';

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'scanned_invoice_items'
               and column_name = 'restaurant_id') then
    execute 'create policy tenant_all on public.scanned_invoice_items for all to authenticated
               using (restaurant_id = public.my_restaurant_id() or public.is_admin())
               with check (restaurant_id = public.my_restaurant_id() or public.is_admin())';
    return;
  end if;

  select c.column_name into fk
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'scanned_invoice_items'
    and c.column_name in ('scanned_invoice_id', 'invoice_id')
  order by c.column_name = 'scanned_invoice_id' desc
  limit 1;

  if fk is null or to_regclass('public.scanned_invoices') is null then
    -- Lien inconnu : admin seulement (fermé par défaut), à adapter.
    raise notice 'scanned_invoice_items : colonne de liaison introuvable, accès admin seulement';
    execute 'create policy tenant_all on public.scanned_invoice_items for all to authenticated
               using (public.is_admin()) with check (public.is_admin())';
  else
    execute format(
      'create policy tenant_all on public.scanned_invoice_items for all to authenticated
         using (exists (select 1 from public.scanned_invoices i
                        where i.id = scanned_invoice_items.%1$I
                          and (i.restaurant_id = public.my_restaurant_id() or public.is_admin())))
         with check (exists (select 1 from public.scanned_invoices i
                             where i.id = scanned_invoice_items.%1$I
                               and (i.restaurant_id = public.my_restaurant_id() or public.is_admin())))',
      fk);
  end if;
end $$;

-- 6c. access_requests : admin seulement.
--     (Si un formulaire public de demande d'accès insère en anon, il doit
--     passer par une edge function service_role, ou ajouter une policy
--     d'insert dédiée.)
do $$
begin
  if to_regclass('public.access_requests') is not null then
    alter table public.access_requests enable row level security;
    drop policy if exists admin_all on public.access_requests;
    create policy admin_all on public.access_requests
      for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. Vue latest_stock : appliquer la RLS de l'appelant (PG15+)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'latest_stock') then
    execute 'alter view public.latest_stock set (security_invoker = true)';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. Contrôle : signale les policies PRÉEXISTANTES (non créées ici).
--    Les policies permissives s'additionnent (OU) : une ancienne policy
--    "using (true)" annulerait l'isolation. À supprimer manuellement.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and policyname not in (
        'tenant_all','manage_insert','manage_update','manage_delete',
        'shifts_published_only','pointages_delete_manage','pointages_update_open','admin_all',
        'profiles_select','profiles_update','profiles_insert','profiles_delete',
        'restaurants_select','restaurants_update','restaurants_insert','restaurants_delete')
  loop
    raise warning 'Policy préexistante à vérifier : %.% ', r.tablename, r.policyname;
  end loop;
end $$;
