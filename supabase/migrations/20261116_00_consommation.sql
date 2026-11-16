-- =====================================================================
-- Livraisons et consommation sur une période.
-- Dépend de 20261005_02_rls (my_restaurant_id, can_manage) et des tables
-- scanned_invoices / scanned_invoice_items (20261005_00).
--
-- Consommation d'un produit sur une période :
--   stock au début + livré pendant la période − stock à la fin
-- Le stock « au début » et « à la fin » est la dernière saisie de stock
-- (inventaire, correction ou livraison) à ces dates. Les heures sont
-- comparées à la milliseconde près, comme le navigateur les envoie : un
-- inventaire pris comme borne compte bien dans sa propre période.
-- Valorisation au prix d'achat actuel des produits.
-- Une livraison est enregistrée comme une facture (source « manuel » ou
-- « scan ») : ses lignes rattachées à un produit comptent comme entrées.
-- =====================================================================

-- ── 1. Enregistrer une livraison ──────────────────────────────────────
-- p_lignes : [{product_id, quantite, prix_unitaire?}]
-- La livraison compte au moment où elle est enregistrée (stock et consommation) ;
-- p_date n'est que la date inscrite sur le bon.
-- Toute l'équipe peut réceptionner. Le prix n'est pris en compte que pour
-- un gérant/responsable ; sinon on garde le prix d'achat connu du produit.
create or replace function public.enregistrer_livraison(
  p_fournisseur text, p_numero text, p_date date, p_lignes jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_rest uuid := public.my_restaurant_id();
  v_gerant boolean := public.can_manage();
  v_id uuid; v_n integer; v_attendu integer;
begin
  if v_rest is null then raise exception 'Aucun restaurant associé à ce compte'; end if;
  if jsonb_typeof(p_lignes) is distinct from 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Livraison vide';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_lignes) e
    where (e->>'quantite') is null
       or (e->>'quantite')::numeric = 'NaN'::numeric
       or (e->>'quantite')::numeric <= 0
       or (e->>'quantite')::numeric > 1000000
       or ((e->>'prix_unitaire') is not null and (
             (e->>'prix_unitaire')::numeric = 'NaN'::numeric
          or (e->>'prix_unitaire')::numeric < 0
          or (e->>'prix_unitaire')::numeric > 1000000))
  ) then
    raise exception 'Quantité ou prix invalide';
  end if;

  -- Une ligne par produit (la dernière saisie gagne), produits du commerce seulement.
  drop table if exists pg_temp._liv;
  create temp table _liv on commit drop as
  with saisie as (
    select distinct on ((e->>'product_id')::uuid)
           (e->>'product_id')::uuid as pid,
           (e->>'quantite')::numeric as q,
           nullif(e->>'prix_unitaire', '')::numeric as prix
    from jsonb_array_elements(p_lignes) with ordinality as o(e, ord)
    order by (e->>'product_id')::uuid, o.ord desc
  )
  select p.id, p.nom, p.unite, s.q,
         case when v_gerant and s.prix > 0 then s.prix else coalesce(p.prix_achat, 0) end as prix,
         p.prix_achat as prix_avant,
         coalesce((select se.stock_reel from public.stock_entries se
                   where se.product_id = p.id and se.restaurant_id = v_rest
                   order by se.created_at desc limit 1), 0) as stock_avant
  from saisie s join public.products p on p.id = s.pid and p.restaurant_id = v_rest;

  select count(*) into v_n from pg_temp._liv;
  select count(distinct (e->>'product_id')::uuid) into v_attendu from jsonb_array_elements(p_lignes) e;
  if v_n is distinct from v_attendu then raise exception 'Produit inconnu pour ce restaurant'; end if;

  insert into public.scanned_invoices (restaurant_id, fournisseur, numero_bl, date_facture, total_ht, statut, source)
  select v_rest, nullif(trim(p_fournisseur), ''), nullif(trim(p_numero), ''), coalesce(p_date, current_date),
         round(sum(q * prix), 2), 'validated', 'manuel'
  from pg_temp._liv
  returning id into v_id;

  insert into public.scanned_invoice_items
    (invoice_id, product_nom, quantite, unite, prix_unitaire, total_ht, matched_product_id, prix_precedent, variation_pct)
  select v_id, nom, q, unite, prix, round(q * prix, 2), id, prix_avant,
         case when prix_avant > 0 then round((prix - prix_avant) / prix_avant * 100, 1) end
  from pg_temp._liv;

  insert into public.stock_entries (product_id, restaurant_id, stock_reel, saisi_par)
  select id, v_rest, stock_avant + q, auth.uid() from pg_temp._liv;

  if v_gerant then
    update public.products p set prix_achat = l.prix
    from pg_temp._liv l where p.id = l.id and l.prix > 0 and p.prix_achat is distinct from l.prix;
  end if;

  return v_id;
end;
$$;

-- ── 2. Consommation sur une période (gérant) ──────────────────────────
create or replace function public.consommation(p_debut timestamptz, p_fin timestamptz)
returns table (
  product_id uuid, nom text, categorie text, cote text, unite text, fournisseur text,
  stock_debut numeric, entrees numeric, stock_fin numeric, consommation numeric,
  prix numeric, valeur numeric)
language plpgsql stable security definer set search_path = public
as $$
declare v_rest uuid := public.my_restaurant_id();
begin
  if not public.can_manage() or v_rest is null then
    raise exception 'Réservé au gérant du commerce' using errcode = '42501';
  end if;
  if p_debut is null or p_fin is null or p_fin <= p_debut then
    raise exception 'Période invalide';
  end if;
  return query
  with prods as (
    select p.* from public.products p where p.restaurant_id = v_rest and p.actif
  ),
  debut as (
    select distinct on (se.product_id) se.product_id, se.stock_reel
    from public.stock_entries se
    where se.restaurant_id = v_rest and date_trunc('milliseconds', se.created_at) <= p_debut
    order by se.product_id, se.created_at desc
  ),
  fin as (
    select distinct on (se.product_id) se.product_id, se.stock_reel
    from public.stock_entries se
    where se.restaurant_id = v_rest and date_trunc('milliseconds', se.created_at) <= p_fin
    order by se.product_id, se.created_at desc
  ),
  livre as (
    select i.matched_product_id as pid, sum(i.quantite) as q
    from public.scanned_invoice_items i
    join public.scanned_invoices f on f.id = i.invoice_id
    where f.restaurant_id = v_rest and i.matched_product_id is not null
      and date_trunc('milliseconds', f.created_at) > p_debut
      and date_trunc('milliseconds', f.created_at) <= p_fin
    group by i.matched_product_id
  )
  select p.id, p.nom, p.categorie, p.cote, p.unite, p.fournisseur,
         d.stock_reel, coalesce(l.q, 0), f.stock_reel,
         case when d.stock_reel is not null and f.stock_reel is not null
              then d.stock_reel + coalesce(l.q, 0) - f.stock_reel end,
         coalesce(p.prix_achat, 0),
         case when d.stock_reel is not null and f.stock_reel is not null
              then round((d.stock_reel + coalesce(l.q, 0) - f.stock_reel) * coalesce(p.prix_achat, 0), 2) end
  from prods p
  left join debut d on d.product_id = p.id
  left join fin f on f.product_id = p.id
  left join livre l on l.pid = p.id
  order by p.cote, p.categorie, p.nom;
end;
$$;

revoke execute on function public.enregistrer_livraison(text, text, date, jsonb) from public, anon;
revoke execute on function public.consommation(timestamptz, timestamptz)         from public, anon;
grant execute on function public.enregistrer_livraison(text, text, date, jsonb) to authenticated;
grant execute on function public.consommation(timestamptz, timestamptz)         to authenticated;
