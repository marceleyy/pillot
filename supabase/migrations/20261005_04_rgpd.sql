-- =====================================================================
-- Pillot — mesures RGPD (2026-10-05)
-- Idempotent. À appliquer APRÈS 20261005_01, 02 et 03.
--   1. Taux horaire déplacé dans employees_paie (lisible par les gérants seulement)
--   2. Date de retrait des employés (base des durées de conservation)
--   3. Pointages : plus de suppression en cascade, historique des corrections,
--      heures imposées par le serveur pour les employés
--   4. Profils : un gérant ne peut changer que le rôle d'un membre
--   5. Anonymisation d'un ancien employé (fonction appelée par l'appli)
--   6. Purge automatique (conservation 3 ans par défaut)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Taux horaire : table séparée, RLS gérants
--    La RLS filtre des lignes, pas des colonnes : tant que le taux est dans
--    employees, tout employé peut le lire par l'API. Le trigger ci-dessous
--    déplace toute valeur écrite dans employees.salaire_horaire (l'appli
--    continue d'écrire là) vers employees_paie, puis la remet à null.
-- ---------------------------------------------------------------------
create table if not exists public.employees_paie (
  employee_id     uuid primary key references public.employees(id) on delete cascade, -- adapter si employees.id n'est pas uuid
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade, -- adapter si restaurants.id n'est pas uuid
  salaire_horaire numeric,
  updated_at      timestamptz default now()
);

alter table public.employees_paie enable row level security;
drop policy if exists tenant_all on public.employees_paie;
create policy tenant_all on public.employees_paie
  for all to authenticated
  using ((restaurant_id = public.my_restaurant_id() and public.can_manage()) or public.is_admin())
  with check (
    ((restaurant_id = public.my_restaurant_id() and public.can_manage()) or public.is_admin())
    and exists (select 1 from public.employees e
                where e.id = employees_paie.employee_id and e.restaurant_id = employees_paie.restaurant_id)
  );

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'employees' and column_name = 'salaire_horaire') then
    execute $f$
      create or replace function public.employees_move_paie()
      returns trigger
      language plpgsql security definer
      set search_path = public
      as $body$
      begin
        if new.salaire_horaire is not null then
          insert into public.employees_paie (employee_id, restaurant_id, salaire_horaire, updated_at)
          values (new.id, new.restaurant_id, new.salaire_horaire, now())
          on conflict (employee_id) do update
            set salaire_horaire = excluded.salaire_horaire,
                restaurant_id   = excluded.restaurant_id,
                updated_at      = now();
          update public.employees set salaire_horaire = null where id = new.id;
        end if;
        return null;
      end;
      $body$
    $f$;
    execute 'revoke execute on function public.employees_move_paie() from public, anon, authenticated';

    drop trigger if exists employees_move_paie on public.employees;
    create trigger employees_move_paie
      after insert or update of salaire_horaire on public.employees
      for each row when (new.salaire_horaire is not null)
      execute function public.employees_move_paie();

    -- Reprise de l'existant
    insert into public.employees_paie (employee_id, restaurant_id, salaire_horaire)
    select id, restaurant_id, salaire_horaire from public.employees
    where salaire_horaire is not null
    on conflict (employee_id) do update set salaire_horaire = excluded.salaire_horaire, updated_at = now();
    update public.employees set salaire_horaire = null where salaire_horaire is not null;
  else
    raise notice 'employees.salaire_horaire absente : déplacement du taux ignoré';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Date de retrait d'un employé (actif passe à false)
-- ---------------------------------------------------------------------
alter table public.employees add column if not exists retire_le timestamptz;

create or replace function public.employees_retire_le()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.retire_le := case when new.actif is false then now() end;
  elsif new.actif is false and old.actif is distinct from false then
    new.retire_le := now();
  elsif new.actif is distinct from false then
    new.retire_le := null;
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'employees' and column_name = 'actif') then
    drop trigger if exists employees_retire_le on public.employees;
    create trigger employees_retire_le
      before insert or update of actif on public.employees
      for each row execute function public.employees_retire_le();
    update public.employees set retire_le = now() where actif is false and retire_le is null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3a. Pointages : supprimer un employé ne doit plus effacer ses heures
-- ---------------------------------------------------------------------
do $$
declare
  c text;
begin
  select con.conname into c
  from pg_constraint con
  join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
  where con.conrelid = 'public.pointages'::regclass and con.contype = 'f'
    and con.confrelid = 'public.employees'::regclass and a.attname = 'employee_id'
  limit 1;
  if c is not null then
    execute format('alter table public.pointages drop constraint %I', c);
  end if;
  alter table public.pointages
    add constraint pointages_employee_id_fkey
    foreign key (employee_id) references public.employees(id) on delete restrict;
end $$;

-- ---------------------------------------------------------------------
-- 3b. Historique des corrections et suppressions de pointages
--     (le passage normal "ouvert -> fermé" n'est pas journalisé)
-- ---------------------------------------------------------------------
create table if not exists public.pointages_historique (
  id            uuid primary key default gen_random_uuid(),
  pointage_id   uuid not null,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade, -- adapter si restaurants.id n'est pas uuid
  employee_id   uuid,
  operation     text not null,           -- 'UPDATE' | 'DELETE'
  avant         jsonb not null,
  apres         jsonb,
  modifie_par   uuid,
  modifie_le    timestamptz not null default now()
);
create index if not exists pointages_historique_restaurant_idx
  on public.pointages_historique (restaurant_id, modifie_le);

alter table public.pointages_historique enable row level security;
drop policy if exists historique_select on public.pointages_historique;
create policy historique_select on public.pointages_historique
  for select to authenticated
  using ((restaurant_id = public.my_restaurant_id() and public.can_manage()) or public.is_admin());
-- Aucune policy d'écriture : seul le trigger (security definer) écrit.

create or replace function public.pointages_journal()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- Purge de conservation : pas de journal (sinon les données purgées seraient recopiées)
  -- (réservé à rgpd_purge : refusé si la session est celle d'un utilisateur de l'API)
  if current_setting('pillot.purge', true) = 'on'
     and current_setting('role') not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    insert into public.pointages_historique (pointage_id, restaurant_id, employee_id, operation, avant, modifie_par)
    values (old.id, old.restaurant_id, old.employee_id, 'DELETE', to_jsonb(old), auth.uid());
    return old;
  end if;
  if new.debut is distinct from old.debut
     or new.employee_id is distinct from old.employee_id
     or (old.fin is not null and new.fin is distinct from old.fin) then
    insert into public.pointages_historique (pointage_id, restaurant_id, employee_id, operation, avant, apres, modifie_par)
    values (old.id, old.restaurant_id, old.employee_id, 'UPDATE', to_jsonb(old), to_jsonb(new), auth.uid());
  end if;
  return new;
end;
$$;
revoke execute on function public.pointages_journal() from public, anon, authenticated;

drop trigger if exists pointages_journal on public.pointages;
create trigger pointages_journal
  after update or delete on public.pointages
  for each row execute function public.pointages_journal();

-- ---------------------------------------------------------------------
-- 3c. Badgeuse : pour un employé, l'heure d'arrivée est celle du serveur
--     et seul le départ d'un pointage ouvert peut être renseigné.
--     Gérants / managers / admin : saisie et corrections libres (journalisées).
-- ---------------------------------------------------------------------
create or replace function public.pointages_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.can_manage() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.debut     := now();
    new.fin       := null;
    new.saisi_par := auth.uid();
    return new;
  end if;

  -- UPDATE par un employé
  if new.debut is distinct from old.debut
     or new.employee_id is distinct from old.employee_id
     or new.restaurant_id is distinct from old.restaurant_id
     or new.saisi_par is distinct from old.saisi_par
     or (new.note is distinct from old.note
         and new.note is distinct from concat_ws(' · ', nullif(old.note, ''), 'Oubli de départ corrigé')) then
    raise exception 'Seul un responsable peut corriger un pointage' using errcode = '42501';
  end if;
  -- Départ : jamais dans le futur (horloge de la tablette en avance => heure du serveur)
  if new.fin is not null then
    new.fin := least(new.fin, now());
    if new.fin <= new.debut then
      raise exception 'Heure de départ invalide' using errcode = '22007';
    end if;
  end if;
  return new;
end;
$$;

-- La policy pointages_update_open (script 02) n'a pas de WITH CHECK : son USING
-- (fin is null) s'appliquait aussi à la ligne modifiée et empêchait un employé de
-- fermer son pointage. La nouvelle ligne est contrôlée par pointages_guard.
drop policy if exists pointages_update_open on public.pointages;
create policy pointages_update_open on public.pointages
  as restrictive for update to authenticated
  using (public.can_manage() or fin is null)
  with check (true);

drop trigger if exists pointages_guard on public.pointages;
create trigger pointages_guard
  before insert or update on public.pointages
  for each row execute function public.pointages_guard();

-- ---------------------------------------------------------------------
-- 4. Profils : sur le profil d'un autre membre, un gérant/manager ne peut
--    modifier que le rôle (contrôlé par profiles_guard_role). Admin : libre.
-- ---------------------------------------------------------------------
create or replace function public.profiles_guard_others()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') or old.id = auth.uid() or public.is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - 'role' - 'updated_at') is distinct from (to_jsonb(old) - 'role' - 'updated_at') then
    raise exception 'Seul le rôle d''un autre membre peut être modifié' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_others on public.profiles;
create trigger profiles_guard_others
  before update on public.profiles
  for each row execute function public.profiles_guard_others();

-- ---------------------------------------------------------------------
-- 5. Anonymisation d'un ancien employé (droit à l'effacement)
--    Les heures restent (obligation de l'employeur) mais ne sont plus
--    rattachées à un nom. Réservé aux responsables du restaurant.
-- ---------------------------------------------------------------------
create or replace function public.anonymiser_employe(p_employee_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r uuid;
  a boolean;
begin
  select restaurant_id, actif into r, a from public.employees where id = p_employee_id;
  if r is null then
    raise exception 'Employé introuvable' using errcode = 'P0002';
  end if;
  if not (public.is_admin() or (public.can_manage() and r = public.my_restaurant_id())) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if a is not false then
    raise exception 'Retirez d''abord l''employé du planning' using errcode = '22023';
  end if;
  update public.employees set nom = 'Ancien employé', prenom = '' where id = p_employee_id;
  delete from public.employees_paie where employee_id = p_employee_id;
  update public.pointages set note = null where employee_id = p_employee_id and note is not null;
  update public.pointages_historique
     set avant = avant - 'note', apres = apres - 'note'
   where employee_id = p_employee_id;
end;
$$;
revoke execute on function public.anonymiser_employe(uuid) from public, anon;
grant  execute on function public.anonymiser_employe(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Purge : conservation 3 ans (prescription des salaires, art. L3245-1
--    du Code du travail ; au-delà du minimum d'1 an de l'art. D3171-16).
--    Modifier p_mois pour une autre durée, convenue dans le contrat.
-- ---------------------------------------------------------------------
create or replace function public.rgpd_purge(p_mois int default 36)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  limite timestamptz := now() - make_interval(months => p_mois);
begin
  perform set_config('pillot.purge', 'on', true);
  delete from public.pointages where debut < limite;
  delete from public.pointages_historique where modifie_le < limite;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'shifts' and column_name = 'date') then
    execute 'delete from public.shifts where "date" < $1::date' using limite;
  end if;
  update public.pointages_historique h
     set avant = h.avant - 'note', apres = h.apres - 'note'
    from public.employees e
   where e.id = h.employee_id and e.actif is false and e.retire_le < limite;
  update public.pointages p set note = null
    from public.employees e
   where e.id = p.employee_id and e.actif is false and e.retire_le < limite and p.note is not null;
  update public.employees set nom = 'Ancien employé', prenom = ''
   where actif is false and retire_le < limite and nom is distinct from 'Ancien employé';
  delete from public.employees_paie p
   using public.employees e
   where e.id = p.employee_id and e.actif is false and e.retire_le < limite;
  perform set_config('pillot.purge', 'off', true);
end;
$$;
revoke execute on function public.rgpd_purge(int) from public, anon, authenticated;

-- Planification hebdomadaire si pg_cron est activé (Dashboard > Database > Extensions).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pillot-rgpd-purge';
    perform cron.schedule('pillot-rgpd-purge', '0 3 * * 0', 'select public.rgpd_purge()');
  else
    raise notice 'pg_cron absent : activer l''extension puis rejouer ce script, ou lancer select public.rgpd_purge(); à la main';
  end if;
end $$;
