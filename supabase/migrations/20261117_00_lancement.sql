-- =====================================================================
-- Lancement : les chiffres sensibles réservés au gérant, et ouverture
-- d'un commerce par le client lui-même.
-- Dépend de 20261005_02_rls, 20261114_00_inventaires, 20261115_00_roles_comptes.
--
-- 1. Prix d'achat, CA et coûts : l'équipe ne peut plus les lire, même en
--    interrogeant la base directement. Les colonnes sensibles de products
--    et restaurants ne sont plus lisibles par « authenticated » ; le gérant
--    les obtient par prix_produits() et chiffres_commerce().
--    ⚠️ Une colonne ajoutée plus tard à products ou restaurants n'est pas
--    lisible tant qu'elle n'est pas ajoutée au « grant select (...) » ci-dessous.
-- 2. ca_history, inventaires et factures : lecture réservée au gérant.
-- 3. creer_mon_commerce() : un compte sans commerce ouvre le sien et en
--    devient le gérant (période d'essai).
-- =====================================================================

-- ── 1. Colonnes sensibles ─────────────────────────────────────────────
revoke select on public.products from anon, authenticated;
grant select (id, restaurant_id, nom, categorie, unite, fournisseur, stock_min, cote, actif, created_at)
  on public.products to authenticated;

revoke select on public.restaurants from anon, authenticated;
grant select (id, name, ville, objectif, plan, actif, created_at, ca_mode, last_pos_import_id,
              adresse, telephone, horaires, modules, parametres)
  on public.restaurants to authenticated;

-- Prix d'achat des produits du commerce ouvert (gérant, responsable, admin).
create or replace function public.prix_produits()
returns table (id uuid, prix_achat numeric)
language sql stable security definer set search_path = public
as $$
  select p.id, p.prix_achat from public.products p
  where p.restaurant_id = public.my_restaurant_id() and public.can_manage()
$$;

-- CA, coûts et ratios du commerce ouvert (gérant, responsable, admin).
create or replace function public.chiffres_commerce()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object('ca_sale', r.ca_sale, 'ca_sucre', r.ca_sucre,
                           'cout_sale', r.cout_sale, 'cout_sucre', r.cout_sucre,
                           'ratio_sale', r.ratio_sale, 'ratio_sucre', r.ratio_sucre)
  from public.restaurants r
  where r.id = public.my_restaurant_id() and public.can_manage()
$$;

-- Ratios de tous les commerces (écran admin).
create or replace function public.chiffres_clients()
returns table (id uuid, ratio_sale numeric, ratio_sucre numeric)
language sql stable security definer set search_path = public
as $$
  select r.id, r.ratio_sale, r.ratio_sucre from public.restaurants r where public.is_admin()
$$;

revoke execute on function public.prix_produits()     from public, anon;
revoke execute on function public.chiffres_commerce() from public, anon;
revoke execute on function public.chiffres_clients()  from public, anon;
grant execute on function public.prix_produits()     to authenticated;
grant execute on function public.chiffres_commerce() to authenticated;
grant execute on function public.chiffres_clients()  to authenticated;

-- ── 2. Lecture réservée au gérant ─────────────────────────────────────
drop policy if exists manage_select on public.ca_history;
create policy manage_select on public.ca_history as restrictive for select to authenticated
  using (public.can_manage());

drop policy if exists manage_select on public.scanned_invoices;
create policy manage_select on public.scanned_invoices as restrictive for select to authenticated
  using (public.can_manage());

drop policy if exists manage_select on public.scanned_invoice_items;
create policy manage_select on public.scanned_invoice_items as restrictive for select to authenticated
  using (public.can_manage());

-- Les inventaires gardent les prix du jour.
drop policy if exists inventories_select on public.inventories;
create policy inventories_select on public.inventories
  for select to authenticated
  using ((restaurant_id = public.my_restaurant_id() and public.can_manage()) or public.is_admin());

-- ── 3. Ouvrir son commerce ────────────────────────────────────────────
-- Le nom saisi à l'inscription est repris dans le profil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, nullif(left(trim(new.raw_user_meta_data->>'name'), 80), ''))
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;
end;
$$;

-- p_parametres et p_modules : mêmes formats que restaurants.parametres / modules.
create or replace function public.creer_mon_commerce(
  p_nom text, p_ville text, p_parametres jsonb, p_modules jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_rest uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté' using errcode = '42501'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Nom du commerce obligatoire'; end if;
  -- Verrou sur le profil : deux envois simultanés ne créent pas deux commerces.
  perform 1 from public.profiles where id = auth.uid() for update;
  if exists (select 1 from public.profiles where id = auth.uid()
             and (restaurant_id is not null or role = 'admin')) then
    raise exception 'Ce compte a déjà un commerce' using errcode = '42501';
  end if;
  insert into public.restaurants (name, ville, plan, parametres, modules)
  values (left(trim(p_nom), 80), nullif(left(trim(p_ville), 80), ''), 'essai',
          case when jsonb_typeof(p_parametres) = 'object' then p_parametres else '{}'::jsonb end,
          case when jsonb_typeof(p_modules) = 'object' then p_modules else '{}'::jsonb end)
  returning id into v_rest;
  insert into public.restaurant_members (profile_id, restaurant_id, role)
  values (auth.uid(), v_rest, 'owner');
  update public.profiles set restaurant_id = v_rest, role = 'owner' where id = auth.uid();
  return v_rest;
end;
$$;

revoke execute on function public.creer_mon_commerce(text, text, jsonb, jsonb) from public, anon;
grant execute on function public.creer_mon_commerce(text, text, jsonb, jsonb) to authenticated;
