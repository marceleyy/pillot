-- =====================================================================
-- PHOTO DE LA BASE EN LIGNE — 14 novembre 2026
-- Lue sur le projet Supabase de Pillot (schéma public), sans rien modifier.
-- Elle sert de référence : ce qui existe vraiment, table par table.
-- NE PAS LANCER telle quelle : les changements passent par migrations/.
-- Migrations déjà appliquées en ligne : 20261005_00, _01, _02, _03.
-- Pas encore appliquées : 20261005_04_rgpd (branche non fusionnée),
-- 20261114_00_inventaires, 20261114_01_order_items.
-- =====================================================================

-- ── Tables ────────────────────────────────────────────────────────────

create table if not exists public.restaurants (
  id uuid default gen_random_uuid() not null,
  name text not null,
  ville text,
  objectif numeric default 0.25,
  plan text default 'Starter'::text,
  actif boolean default true,
  created_at timestamp with time zone default now(),
  ca_sale numeric default 0,
  ca_sucre numeric default 0,
  cout_sale numeric default 0,
  cout_sucre numeric default 0,
  ratio_sale numeric default 0,
  ratio_sucre numeric default 0,
  ca_mode text default 'manual'::text,
  last_pos_import_id uuid,
  adresse text,
  telephone text,
  horaires jsonb default '{}'::jsonb not null,
  modules jsonb default '{}'::jsonb not null,
  constraint restaurants_pkey PRIMARY KEY (id)
);

create table if not exists public.profiles (
  id uuid not null,
  restaurant_id uuid,
  role text default 'staff'::text,
  name text,
  email text,
  created_at timestamp with time zone default now(),
  constraint profiles_pkey PRIMARY KEY (id),
  constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint profiles_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

create table if not exists public.access_requests (
  id uuid default gen_random_uuid() not null,
  admin_id uuid not null,
  restaurant_id uuid not null,
  raison text not null,
  message text,
  statut text default 'en_attente'::text,
  expires_at timestamp with time zone,
  reponse_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint access_requests_pkey PRIMARY KEY (id),
  constraint access_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES profiles(id),
  constraint access_requests_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

create table if not exists public.interventions (
  id uuid default gen_random_uuid() not null,
  admin_id uuid not null,
  restaurant_id uuid not null,
  access_request_id uuid,
  type text,
  description text,
  actions text,
  duree_minutes integer default 0,
  created_at timestamp with time zone default now(),
  constraint interventions_pkey PRIMARY KEY (id),
  constraint interventions_access_request_id_fkey FOREIGN KEY (access_request_id) REFERENCES access_requests(id),
  constraint interventions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES profiles(id),
  constraint interventions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

create table if not exists public.products (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  nom text not null,
  categorie text,
  unite text default 'unité'::text,
  fournisseur text,
  stock_min numeric default 0,
  prix_achat numeric default 0,
  cote text default 'SALE'::text,
  actif boolean default true,
  created_at timestamp with time zone default now(),
  constraint products_pkey PRIMARY KEY (id),
  constraint products_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.stock_entries (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  restaurant_id uuid not null,
  stock_reel numeric default 0 not null,
  inv_physique numeric,
  saisi_par uuid,
  created_at timestamp with time zone default now(),
  constraint stock_entries_pkey PRIMARY KEY (id),
  constraint stock_entries_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  constraint stock_entries_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  constraint stock_entries_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES profiles(id)
);

create table if not exists public.orders (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  fournisseur text not null,
  canal text default 'WhatsApp'::text,
  statut text default 'prepare'::text,
  semaine integer,
  annee integer,
  total_ht numeric default 0,
  message_text text,
  created_at timestamp with time zone default now(),
  constraint orders_pkey PRIMARY KEY (id),
  constraint orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

create table if not exists public.order_items (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  product_id uuid,
  product_nom text not null,
  quantite numeric not null,
  unite text,
  prix_unitaire numeric default 0,
  total_ht numeric default 0,
  constraint order_items_pkey PRIMARY KEY (id),
  constraint order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  constraint order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id)
);

create table if not exists public.recipes (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  nom text not null,
  prix_vente numeric default 0,
  actif boolean default true,
  created_at timestamp with time zone default now(),
  constraint recipes_pkey PRIMARY KEY (id),
  constraint recipes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

create table if not exists public.recipe_items (
  id uuid default gen_random_uuid() not null,
  recipe_id uuid not null,
  product_id uuid,
  product_nom text not null,
  quantite numeric not null,
  unite text,
  constraint recipe_items_pkey PRIMARY KEY (id),
  constraint recipe_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
  constraint recipe_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

create table if not exists public.ca_history (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  type text default 'hebdo'::text,
  periode text not null,
  semaine integer,
  mois integer,
  annee integer not null,
  ca_sale numeric default 0,
  ca_sucre numeric default 0,
  cout_sale numeric default 0,
  cout_sucre numeric default 0,
  ratio_sale numeric default 0,
  ratio_sucre numeric default 0,
  created_at timestamp with time zone default now(),
  date_debut date,
  date_fin date,
  constraint ca_history_pkey PRIMARY KEY (id),
  constraint ca_history_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

create table if not exists public.ca_imports (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  date_debut date,
  date_fin date,
  ca_sale numeric,
  ca_sucre numeric,
  source text,
  created_at timestamp with time zone default now(),
  constraint ca_imports_pkey PRIMARY KEY (id),
  constraint ca_imports_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.pos_imports (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  import_date date default CURRENT_DATE not null,
  source text default 'manual'::text,
  total_ca numeric default 0 not null,
  nb_produits integer default 0 not null,
  created_at timestamp with time zone default now(),
  constraint pos_imports_pkey PRIMARY KEY (id),
  constraint pos_imports_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.pos_sales (
  id uuid default gen_random_uuid() not null,
  pos_import_id uuid not null,
  restaurant_id uuid not null,
  product_nom text not null,
  qty_sold numeric default 0 not null,
  ca numeric default 0 not null,
  created_at timestamp with time zone default now(),
  constraint pos_sales_pkey PRIMARY KEY (id),
  constraint pos_sales_pos_import_id_fkey FOREIGN KEY (pos_import_id) REFERENCES pos_imports(id) ON DELETE CASCADE,
  constraint pos_sales_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.scanned_invoices (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  fournisseur text,
  numero_bl text,
  date_facture date,
  total_ht numeric,
  statut text default 'validated'::text not null,
  source text default 'scan'::text,
  created_at timestamp with time zone default now(),
  constraint scanned_invoices_pkey PRIMARY KEY (id),
  constraint scanned_invoices_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.scanned_invoice_items (
  id uuid default gen_random_uuid() not null,
  invoice_id uuid not null,
  product_nom text,
  quantite numeric,
  unite text,
  prix_unitaire numeric,
  total_ht numeric,
  matched_product_id uuid,
  prix_precedent numeric,
  variation_pct numeric,
  created_at timestamp with time zone default now(),
  constraint scanned_invoice_items_pkey PRIMARY KEY (id),
  constraint scanned_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES scanned_invoices(id) ON DELETE CASCADE,
  constraint scanned_invoice_items_matched_product_id_fkey FOREIGN KEY (matched_product_id) REFERENCES products(id) ON DELETE SET NULL
);

create table if not exists public.reception_controls (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  fournisseur text not null,
  date_reception date default CURRENT_DATE not null,
  numero_bl text,
  temperature_ok boolean default true,
  emballage_ok boolean default true,
  quantites_ok boolean default true,
  statut text default 'conforme'::text,
  note text,
  saisi_par uuid,
  created_at timestamp with time zone default now(),
  constraint reception_controls_pkey PRIMARY KEY (id),
  constraint reception_controls_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  constraint reception_controls_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES profiles(id)
);

create table if not exists public.dlc_entries (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  product_nom text not null,
  dlc_date date not null,
  lot text,
  fournisseur text,
  quantite numeric default 1,
  unite text,
  statut text default 'actif'::text not null,
  saisi_par uuid,
  created_at timestamp with time zone default now(),
  constraint dlc_entries_pkey PRIMARY KEY (id),
  constraint dlc_entries_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  constraint dlc_entries_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES profiles(id) ON DELETE SET NULL
);

create table if not exists public.equipements (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  nom text not null,
  type text default 'autre'::text not null,
  marque text,
  modele text,
  localisation text,
  temp_min numeric,
  temp_max numeric,
  actif boolean default true not null,
  ordre integer default 0 not null,
  created_at timestamp with time zone default now(),
  constraint equipements_pkey PRIMARY KEY (id),
  constraint equipements_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.temperature_logs (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  equipement text not null,
  temperature numeric not null,
  temperature_min numeric default '-22'::integer,
  temperature_max numeric default 4,
  saisi_par uuid,
  created_at timestamp with time zone default now(),
  action_corrective text,
  constraint temperature_logs_pkey PRIMARY KEY (id),
  constraint temperature_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  constraint temperature_logs_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES profiles(id)
);

create table if not exists public.cleaning_logs (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  tache text not null,
  fait boolean default false,
  saisi_par uuid,
  created_at timestamp with time zone default now(),
  constraint cleaning_logs_pkey PRIMARY KEY (id),
  constraint cleaning_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  constraint cleaning_logs_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES profiles(id)
);

create table if not exists public.nettoyage_plans (
  restaurant_id uuid not null,
  taches jsonb default '[]'::jsonb not null,
  updated_at timestamp with time zone default now(),
  constraint nettoyage_plans_pkey PRIMARY KEY (restaurant_id),
  constraint nettoyage_plans_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.oil_changes (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  equipement text default 'Friteuse 1'::text not null,
  date_changement date default CURRENT_DATE not null,
  prochain_changement date,
  tpo numeric,
  statut text default 'ok'::text,
  note text,
  saisi_par uuid,
  created_at timestamp with time zone default now(),
  constraint oil_changes_pkey PRIMARY KEY (id),
  constraint oil_changes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  constraint oil_changes_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES profiles(id)
);

create table if not exists public.glaces_flavors (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  nom text not null,
  categorie text default 'glace'::text,
  couleur_hex text default '#7C3AED'::text,
  stock_bacs numeric default 0 not null,
  stock_min_bacs numeric default 2 not null,
  actif boolean default true not null,
  ordre integer default 0 not null,
  created_at timestamp with time zone default now(),
  constraint glaces_flavors_pkey PRIMARY KEY (id),
  constraint glaces_flavors_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.glaces_daily (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  date date default CURRENT_DATE not null,
  stock_debut_bacs numeric,
  stock_fin_bacs numeric,
  consommation_theorique_kg numeric default 0,
  consommation_reelle_kg numeric,
  perte_kg numeric default 0,
  ecart_kg numeric,
  ecart_pct numeric,
  ca_glaces numeric,
  pos_import_id uuid,
  created_at timestamp with time zone default now(),
  constraint glaces_daily_pkey PRIMARY KEY (id),
  constraint glaces_daily_pos_import_id_fkey FOREIGN KEY (pos_import_id) REFERENCES pos_imports(id) ON DELETE SET NULL,
  constraint glaces_daily_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.employees (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  profile_id uuid,
  nom text not null,
  prenom text default ''::text,
  heures_contrat numeric default 35,
  salaire_horaire numeric default 11.65,
  couleur text default '#3B82F6'::text,
  actif boolean default true,
  created_at timestamp with time zone default now(),
  constraint employees_pkey PRIMARY KEY (id),
  constraint employees_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id),
  constraint employees_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.shift_types (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  nom text not null,
  abrev text,
  heure_debut text not null,
  heure_fin text not null,
  couleur text default '#3B82F6'::text,
  duree_minutes integer default 0,
  created_at timestamp with time zone default now(),
  constraint shift_types_pkey PRIMARY KEY (id),
  constraint shift_types_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.shifts (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  employee_id uuid not null,
  date date not null,
  heure_debut text not null,
  heure_fin text not null,
  type_nom text default 'Service'::text,
  couleur text default '#3B82F6'::text,
  repos boolean default false,
  note text,
  published boolean default false,
  created_at timestamp with time zone default now(),
  constraint shifts_pkey PRIMARY KEY (id),
  constraint shifts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  constraint shifts_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.leave_requests (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  employee_id uuid not null,
  date_debut date not null,
  date_fin date not null,
  type text default 'conge'::text,
  statut text default 'en_attente'::text,
  note_employe text,
  note_manager text,
  traite_par uuid,
  created_at timestamp with time zone default now(),
  constraint leave_requests_pkey PRIMARY KEY (id),
  constraint leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  constraint leave_requests_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  constraint leave_requests_traite_par_fkey FOREIGN KEY (traite_par) REFERENCES profiles(id)
);

create table if not exists public.time_entries (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  employee_id uuid not null,
  date date default CURRENT_DATE not null,
  heure_arrivee text,
  heure_depart text,
  pause_minutes integer default 0,
  heures_travaillees numeric default 0,
  note text,
  valide_par uuid,
  created_at timestamp with time zone default now(),
  constraint time_entries_pkey PRIMARY KEY (id),
  constraint time_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  constraint time_entries_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  constraint time_entries_valide_par_fkey FOREIGN KEY (valide_par) REFERENCES profiles(id)
);

create table if not exists public.pointages (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  employee_id uuid not null,
  debut timestamp with time zone default now() not null,
  fin timestamp with time zone,
  saisi_par uuid default auth.uid(),
  note text,
  created_at timestamp with time zone default now(),
  constraint pointages_pkey PRIMARY KEY (id),
  constraint pointages_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  constraint pointages_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  constraint pointages_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES auth.users(id)
);

create table if not exists public.tasks (
  id uuid default gen_random_uuid() not null,
  restaurant_id uuid not null,
  nom text not null,
  description text,
  categorie text default 'general'::text,
  assignee_id uuid,
  frequence text default 'daily'::text,
  jours_semaine integer[] default '{1,2,3,4,5,6,7}'::integer[],
  heure_limite text,
  priorite text default 'normale'::text,
  actif boolean default true,
  created_by uuid,
  created_at timestamp with time zone default now(),
  constraint tasks_pkey PRIMARY KEY (id),
  constraint tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES profiles(id),
  constraint tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id),
  constraint tasks_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

create table if not exists public.task_completions (
  id uuid default gen_random_uuid() not null,
  task_id uuid not null,
  restaurant_id uuid not null,
  completed_by uuid,
  date date default CURRENT_DATE not null,
  note text,
  completed_at timestamp with time zone default now(),
  constraint task_completions_pkey PRIMARY KEY (id),
  constraint task_completions_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES profiles(id),
  constraint task_completions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  constraint task_completions_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ── Vue ───────────────────────────────────────────────────────────────

create or replace view public.latest_stock with (security_invoker = true) as
  SELECT DISTINCT ON (product_id) product_id, stock_reel, inv_physique, created_at, saisi_par
  FROM stock_entries
  ORDER BY product_id, created_at DESC;

-- ── Index (hors clés) ─────────────────────────────────────────────────

CREATE INDEX equipements_restaurant_idx ON public.equipements USING btree (restaurant_id, ordre);
CREATE INDEX scanned_invoice_items_invoice_idx ON public.scanned_invoice_items USING btree (invoice_id);
CREATE INDEX ca_imports_restaurant_debut_idx ON public.ca_imports USING btree (restaurant_id, date_debut);
CREATE INDEX pointages_restaurant_debut_idx ON public.pointages USING btree (restaurant_id, debut);
CREATE INDEX glaces_flavors_restaurant_idx ON public.glaces_flavors USING btree (restaurant_id, ordre);
CREATE INDEX scanned_invoices_restaurant_date_idx ON public.scanned_invoices USING btree (restaurant_id, date_facture);
CREATE INDEX pos_sales_import_idx ON public.pos_sales USING btree (pos_import_id);
CREATE INDEX pos_imports_restaurant_idx ON public.pos_imports USING btree (restaurant_id, created_at);
CREATE UNIQUE INDEX glaces_daily_restaurant_date_key ON public.glaces_daily USING btree (restaurant_id, date);
CREATE INDEX dlc_entries_restaurant_idx ON public.dlc_entries USING btree (restaurant_id, statut, dlc_date);
CREATE INDEX pos_sales_restaurant_idx ON public.pos_sales USING btree (restaurant_id);

-- ── Fonctions et déclencheurs ─────────────────────────────────────────
-- my_restaurant_id(), my_role(), is_admin(), can_manage() et
-- profiles_guard_role() : voir migrations/20261005_02_rls.sql (identiques).

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER profiles_guard_role BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_guard_role();

-- ── Sécurité (RLS) : actives sur les 33 tables ────────────────────────
-- Règles permissives : un compte voit son restaurant (my_restaurant_id()),
-- l'admin voit tout. Règles restrictives « manage_* » : seuls owner,
-- manager et admin créent, modifient ou suppriment.
--
-- Restrictives manage_insert / manage_update / manage_delete (can_manage()) sur :
--   ca_history, ca_imports, employees, equipements, products, recipe_items,
--   recipes, restaurants, shift_types, shifts.
-- Restrictives particulières :
--   pointages_delete_manage (delete : can_manage()),
--   pointages_update_open (update : can_manage() OR fin IS NULL),
--   shifts_published_only (select : can_manage() OR published IS TRUE).
--
-- Permissives tenant_all (all, authenticated, son restaurant ou admin) sur :
--   ca_history, ca_imports, cleaning_logs, dlc_entries, employees, equipements,
--   glaces_daily, glaces_flavors, nettoyage_plans, oil_changes, pointages,
--   pos_imports, pos_sales, products, reception_controls, recipes,
--   scanned_invoices, shift_types, shifts, stock_entries, task_completions,
--   tasks, temperature_logs ; et, via la table parente :
--   recipe_items (recipes), scanned_invoice_items (scanned_invoices).
--
-- Profils et restaurants :
--   profiles_select / profiles_update : soi-même, admin, ou responsable du même restaurant.
--   profiles_insert / profiles_delete : admin.
--   restaurants_select : son restaurant ou admin ; restaurants_update : responsable
--   de son restaurant ou admin ; restaurants_insert / restaurants_delete : admin.
--   access_requests.admin_all, interventions : admin (insert), lecture par le restaurant concerné.
--
-- Anciennes règles encore présentes (rôle public, même condition
-- « son restaurant ou admin », sans with check) — à nettoyer :
--   access_requests « creer demande acces », « repondre a une demande », « voir demandes me concernant »
--   ca_history « voir son CA » · employees « emp own » · interventions « creer intervention », « voir interventions »
--   leave_requests « leave own » (seule règle : un employé peut valider son propre congé)
--   oil_changes « oil own » · orders « creer ses commandes », « voir ses commandes »
--   products « modifier ses produits », « voir ses produits » · reception_controls « recep own »
--   restaurants « voir son restaurant » · shift_types « shift_types own » · shifts « shifts own »
--   stock_entries « saisir son stock », « voir son stock » · task_completions « task_comp own »
--   tasks « tasks own »
--   time_entries « time own » (seule règle : un employé peut modifier ses heures)
--
-- order_items : RLS active mais aucune règle → illisible pour tous
-- (corrigé par migrations/20261114_01_order_items.sql).
