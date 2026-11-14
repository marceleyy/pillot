-- =====================================================================
-- Inventaires datés aux prix figés
-- Un inventaire = un comptage validé d'un seul coup. Il garde, pour
-- chaque produit compté, la quantité ET le prix d'achat du jour : sa
-- valeur ne bouge plus si un prix change ensuite.
-- Les produits non comptés ne sont pas touchés.
-- Dépend de public.my_restaurant_id(), public.is_admin(), public.can_manage().
-- =====================================================================

create table if not exists public.inventories (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  cree_par       uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  -- [{product_id, nom, categorie, cote, unite, quantite, avant, prix}]
  lignes         jsonb not null,
  nb_produits    integer not null,
  valeur_totale  numeric(12,2) not null default 0,
  valeur_sale    numeric(12,2) not null default 0,
  valeur_sucre   numeric(12,2) not null default 0,
  nb_sans_prix   integer not null default 0
);

create index if not exists inventories_restaurant_date
  on public.inventories (restaurant_id, created_at desc);

alter table public.inventories enable row level security;

drop policy if exists inventories_select on public.inventories;
create policy inventories_select on public.inventories
  for select to authenticated
  using (restaurant_id = public.my_restaurant_id() or public.is_admin());

-- Pas d'insert direct : on passe par valider_inventaire() (prix lus en base).
-- Pas d'update : un inventaire validé ne se modifie plus.
drop policy if exists inventories_delete on public.inventories;
create policy inventories_delete on public.inventories
  for delete to authenticated
  using (public.can_manage() and restaurant_id = public.my_restaurant_id());

revoke insert, update on public.inventories from anon, authenticated;
grant select, delete on public.inventories to authenticated;

-- ---------------------------------------------------------------------
-- valider_inventaire(p_lignes) : [{product_id, quantite}, ...]
-- Lit les prix d'achat en base, enregistre l'inventaire et met à jour
-- le stock réel (stock_entries) dans la même transaction.
-- ---------------------------------------------------------------------
create or replace function public.valider_inventaire(p_lignes jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rest   uuid := public.my_restaurant_id();
  v_id     uuid;
  v_lignes jsonb;
  v_n      integer;
  v_attendu integer;
begin
  if v_rest is null then
    raise exception 'Aucun restaurant associé à ce compte';
  end if;
  if jsonb_typeof(p_lignes) is distinct from 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Inventaire vide';
  end if;

  select count(distinct (e->>'product_id')::uuid) into v_attendu
  from jsonb_array_elements(p_lignes) e;

  if exists (
    select 1 from jsonb_array_elements(p_lignes) e
    where (e->>'quantite') is null or (e->>'quantite')::numeric < 0
  ) then
    raise exception 'Quantité invalide';
  end if;

  -- Une ligne par produit (la dernière saisie gagne).
  with saisie as (
    select distinct on ((e->>'product_id')::uuid)
           (e->>'product_id')::uuid as pid,
           (e->>'quantite')::numeric as q
    from jsonb_array_elements(p_lignes) with ordinality as o(e, ord)
    order by (e->>'product_id')::uuid, o.ord desc
  ),
  avant as (
    select distinct on (se.product_id) se.product_id, se.stock_reel
    from public.stock_entries se
    where se.restaurant_id = v_rest
    order by se.product_id, se.created_at desc
  )
  select jsonb_agg(jsonb_build_object(
           'product_id', p.id, 'nom', p.nom, 'categorie', p.categorie,
           'cote', p.cote, 'unite', p.unite, 'quantite', s.q,
           'avant', a.stock_reel, 'prix', coalesce(p.prix_achat, 0))
         order by p.cote, p.categorie, p.nom),
         count(*)
    into v_lignes, v_n
  from saisie s
  join public.products p on p.id = s.pid and p.restaurant_id = v_rest
  left join avant a on a.product_id = p.id;

  if v_n is distinct from v_attendu then
    raise exception 'Produit inconnu pour ce restaurant';
  end if;

  insert into public.inventories
    (restaurant_id, lignes, nb_produits, valeur_totale, valeur_sale, valeur_sucre, nb_sans_prix)
  select v_rest, v_lignes, v_n,
         coalesce(sum(q * prix), 0),
         coalesce(sum(q * prix) filter (where cote is distinct from 'SUCRE'), 0),
         coalesce(sum(q * prix) filter (where cote = 'SUCRE'), 0),
         count(*) filter (where q > 0 and prix <= 0)
  from (
    select (l->>'quantite')::numeric as q, (l->>'prix')::numeric as prix, l->>'cote' as cote
    from jsonb_array_elements(v_lignes) l
  ) t
  returning id into v_id;

  insert into public.stock_entries (product_id, restaurant_id, stock_reel, saisi_par)
  select (l->>'product_id')::uuid, v_rest, (l->>'quantite')::numeric, auth.uid()
  from jsonb_array_elements(v_lignes) l;

  return v_id;
end;
$$;

revoke execute on function public.valider_inventaire(jsonb) from public, anon;
grant  execute on function public.valider_inventaire(jsonb) to authenticated;
