-- =====================================================================
-- Tâches et réparations : les tâches ponctuelles du commerce
-- (réparation, entretien, achat, déco…), hors check-list du jour (tasks).
-- Dépend de 20261005_02_rls (my_restaurant_id, can_manage, is_admin).
--
-- Statuts : creee → en_cours → realisee. Chaque changement est ajouté à
-- « historique » par changer_statut_tache() avec l'heure du serveur et le
-- nom de la personne : personne ne peut écrire l'historique à la main.
-- Lecture : tout le commerce. Création, modification, suppression : gérant
-- et responsable. Changer le statut : gérant, responsable ou la personne
-- assignée.
-- =====================================================================

create table if not exists public.taches_reparations (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  titre         text not null check (length(btrim(titre)) between 1 and 200),
  categorie     text not null default 'salle'
                check (categorie in ('salle', 'cuisine', 'reparation', 'entretien', 'deco', 'achat')),
  priorite      text not null default 'normale'
                check (priorite in ('urgente', 'normale', 'quand_possible')),
  echeance      date,
  assignee_id   uuid references public.profiles(id) on delete set null,
  assignee_nom  text,
  detail        text check (detail is null or length(detail) <= 2000),
  statut        text not null default 'creee' check (statut in ('creee', 'en_cours', 'realisee')),
  historique    jsonb not null default '[]'::jsonb,
  realisee_le   timestamptz,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists taches_reparations_restaurant
  on public.taches_reparations (restaurant_id, statut, echeance);

alter table public.taches_reparations enable row level security;

drop policy if exists taches_select on public.taches_reparations;
create policy taches_select on public.taches_reparations
  for select to authenticated
  using (restaurant_id = public.my_restaurant_id() or public.is_admin());

drop policy if exists taches_insert on public.taches_reparations;
create policy taches_insert on public.taches_reparations
  for insert to authenticated
  with check (restaurant_id = public.my_restaurant_id() and public.can_manage());

drop policy if exists taches_update on public.taches_reparations;
create policy taches_update on public.taches_reparations
  for update to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.can_manage());

drop policy if exists taches_delete on public.taches_reparations;
create policy taches_delete on public.taches_reparations
  for delete to authenticated
  using (restaurant_id = public.my_restaurant_id() and public.can_manage());

-- Statut, historique et auteur ne s'écrivent pas directement.
revoke all on public.taches_reparations from anon;
revoke insert, update on public.taches_reparations from authenticated;
grant select, delete on public.taches_reparations to authenticated;
grant insert (restaurant_id, titre, categorie, priorite, echeance, assignee_id, detail)
  on public.taches_reparations to authenticated;
grant update (titre, categorie, priorite, echeance, assignee_id, detail)
  on public.taches_reparations to authenticated;

-- Nom affiché dans l'historique : nom, sinon e-mail.
create or replace function public.nom_utilisateur()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(nullif(btrim(p.name), ''), p.email, 'Inconnu') from public.profiles p where p.id = auth.uid()
$$;
revoke execute on function public.nom_utilisateur() from public, anon;
grant  execute on function public.nom_utilisateur() to authenticated;

-- À la création : statut « creee », auteur et première ligne d'historique posés par la base.
create or replace function public.taches_reparations_creation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.statut      := 'creee';
  new.realisee_le := null;
  new.created_by  := auth.uid();
  new.created_at  := now();
  new.historique  := jsonb_build_array(jsonb_build_object(
    'statut', 'creee', 'par', auth.uid(), 'nom', public.nom_utilisateur(), 'le', now()));
  return new;
end $$;
revoke execute on function public.taches_reparations_creation() from public, anon, authenticated;

drop trigger if exists taches_reparations_creation on public.taches_reparations;
create trigger taches_reparations_creation
  before insert on public.taches_reparations
  for each row execute function public.taches_reparations_creation();

-- Personne assignée : un membre du commerce ; son nom est recopié par la base.
create or replace function public.taches_reparations_assignee()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.assignee_id is null then
    new.assignee_nom := null;
  elsif tg_op = 'UPDATE' and new.assignee_id is not distinct from old.assignee_id then
    -- Personne inchangée (même partie de l'équipe depuis) : la tâche reste modifiable.
    new.assignee_nom := old.assignee_nom;
  else
    select coalesce(nullif(btrim(p.name), ''), p.email) into new.assignee_nom
      from public.restaurant_members m join public.profiles p on p.id = m.profile_id
     where m.restaurant_id = new.restaurant_id and m.profile_id = new.assignee_id;
    if not found then
      raise exception 'La personne assignée ne fait pas partie du commerce';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.taches_reparations_assignee() from public, anon, authenticated;

drop trigger if exists taches_reparations_assignee on public.taches_reparations;
create trigger taches_reparations_assignee
  before insert or update of assignee_id on public.taches_reparations
  for each row execute function public.taches_reparations_assignee();

-- Change le statut d'une tâche du commerce ouvert et le trace (qui, quand).
-- Une tâche déjà dans ce statut ne change pas (pas de doublon dans l'historique).
create or replace function public.changer_statut_tache(p_tache uuid, p_statut text)
returns public.taches_reparations
language plpgsql security definer set search_path = public
as $$
declare
  t public.taches_reparations;
begin
  if p_statut not in ('creee', 'en_cours', 'realisee') then
    raise exception 'Statut inconnu';
  end if;
  select * into t from public.taches_reparations
   where id = p_tache and restaurant_id = public.my_restaurant_id()
   for update;
  if not found then
    raise exception 'Tâche introuvable';
  end if;
  if not (public.can_manage() or t.assignee_id = auth.uid()) then
    raise exception 'Seuls le gérant, le responsable ou la personne assignée changent le statut';
  end if;
  if t.statut = p_statut then
    return t;
  end if;
  update public.taches_reparations
     set statut = p_statut,
         realisee_le = case when p_statut = 'realisee' then now() else null end,
         historique = historique || jsonb_build_array(jsonb_build_object(
           'statut', p_statut, 'par', auth.uid(), 'nom', public.nom_utilisateur(), 'le', now()))
   where id = t.id
  returning * into t;
  return t;
end $$;
revoke execute on function public.changer_statut_tache(uuid, text) from public, anon;
grant  execute on function public.changer_statut_tache(uuid, text) to authenticated;
