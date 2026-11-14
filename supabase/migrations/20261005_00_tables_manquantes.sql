-- =====================================================================
-- Pillot — tables utilisées par l'appli mais absentes de la base (2026-10-05)
-- À appliquer AVANT 20261005_01 / 02 / 03 / 04.
-- Idempotent et sans effet sur les données existantes :
--   create table if not exists + add column if not exists (si une table
--   existe déjà sous une forme plus ancienne, seules les colonnes
--   manquantes sont ajoutées, rien n'est supprimé ni modifié).
-- Colonnes déduites des lectures/écritures du front (src/**) :
--   equipements            EquipementSetup.jsx, HACCP_complet.jsx
--   dlc_entries            HACCP_complet.jsx
--   glaces_flavors / glaces_daily / pos_imports / pos_sales   PillotGlaces.jsx, App.jsx
--   scanned_invoices / scanned_invoice_items                  EquipementSetup.jsx (scanner), Cloture.jsx
-- La RLS est activée ici (fermé par défaut) ; les policies sont créées
-- par 20261005_02_rls.sql.
-- =====================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Équipements (frigos, congélateurs, friteuses… et leurs seuils)
-- ---------------------------------------------------------------------
create table if not exists public.equipements (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  nom           text not null,
  type          text not null default 'autre',  -- frigo | congelateur | vitrine | bain_marie | zone_chaude | friteuse | autre
  marque        text,
  modele        text,
  localisation  text,
  temp_min      numeric,
  temp_max      numeric,
  actif         boolean not null default true,
  ordre         integer not null default 0,
  created_at    timestamptz default now()
);
alter table public.equipements
  add column if not exists nom          text,
  add column if not exists type         text default 'autre',
  add column if not exists marque       text,
  add column if not exists modele       text,
  add column if not exists localisation text,
  add column if not exists temp_min     numeric,
  add column if not exists temp_max     numeric,
  add column if not exists actif        boolean default true,
  add column if not exists ordre        integer default 0,
  add column if not exists created_at   timestamptz default now();
create index if not exists equipements_restaurant_idx on public.equipements (restaurant_id, ordre);

-- ---------------------------------------------------------------------
-- DLC (produits entamés / à surveiller)
-- ---------------------------------------------------------------------
create table if not exists public.dlc_entries (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_nom   text not null,
  dlc_date      date not null,
  lot           text,
  fournisseur   text,
  quantite      numeric default 1,
  unite         text,
  statut        text not null default 'actif',  -- actif | consomme | jete
  saisi_par     uuid references public.profiles(id) on delete set null,
  created_at    timestamptz default now()
);
alter table public.dlc_entries
  add column if not exists product_nom text,
  add column if not exists dlc_date    date,
  add column if not exists lot         text,
  add column if not exists fournisseur text,
  add column if not exists quantite    numeric default 1,
  add column if not exists unite       text,
  add column if not exists statut      text default 'actif',
  add column if not exists saisi_par   uuid references public.profiles(id) on delete set null,
  add column if not exists created_at  timestamptz default now();
create index if not exists dlc_entries_restaurant_idx on public.dlc_entries (restaurant_id, statut, dlc_date);

-- ---------------------------------------------------------------------
-- Glacier : parfums
-- ---------------------------------------------------------------------
create table if not exists public.glaces_flavors (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  nom            text not null,
  categorie      text default 'glace',
  couleur_hex    text default '#7C3AED',
  stock_bacs     numeric not null default 0,
  stock_min_bacs numeric not null default 2,
  actif          boolean not null default true,
  ordre          integer not null default 0,
  created_at     timestamptz default now()
);
alter table public.glaces_flavors
  add column if not exists nom            text,
  add column if not exists categorie      text default 'glace',
  add column if not exists couleur_hex    text default '#7C3AED',
  add column if not exists stock_bacs     numeric default 0,
  add column if not exists stock_min_bacs numeric default 2,
  add column if not exists actif          boolean default true,
  add column if not exists ordre          integer default 0,
  add column if not exists created_at     timestamptz default now();
create index if not exists glaces_flavors_restaurant_idx on public.glaces_flavors (restaurant_id, ordre);

-- ---------------------------------------------------------------------
-- Imports de caisse (glacier) et ventes détaillées
-- ---------------------------------------------------------------------
create table if not exists public.pos_imports (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  import_date   date not null default current_date,
  source        text default 'manual',
  total_ca      numeric not null default 0,
  nb_produits   integer not null default 0,
  created_at    timestamptz default now()
);
alter table public.pos_imports
  add column if not exists import_date date default current_date,
  add column if not exists source      text default 'manual',
  add column if not exists total_ca    numeric default 0,
  add column if not exists nb_produits integer default 0,
  add column if not exists created_at  timestamptz default now();
create index if not exists pos_imports_restaurant_idx on public.pos_imports (restaurant_id, created_at);

-- pos_imports.select("*, pos_sales(*)") : la clé étrangère est nécessaire à PostgREST
create table if not exists public.pos_sales (
  id            uuid primary key default gen_random_uuid(),
  pos_import_id uuid not null references public.pos_imports(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_nom   text not null,
  qty_sold      numeric not null default 0,
  ca            numeric not null default 0,
  created_at    timestamptz default now()
);
alter table public.pos_sales
  add column if not exists product_nom text,
  add column if not exists qty_sold    numeric default 0,
  add column if not exists ca          numeric default 0,
  add column if not exists created_at  timestamptz default now();
create index if not exists pos_sales_import_idx     on public.pos_sales (pos_import_id);
create index if not exists pos_sales_restaurant_idx on public.pos_sales (restaurant_id);

-- ---------------------------------------------------------------------
-- Glacier : bilan quotidien (upsert onConflict "restaurant_id,date")
-- ---------------------------------------------------------------------
create table if not exists public.glaces_daily (
  id                        uuid primary key default gen_random_uuid(),
  restaurant_id             uuid not null references public.restaurants(id) on delete cascade,
  date                      date not null default current_date,
  stock_debut_bacs          numeric,
  stock_fin_bacs            numeric,
  consommation_theorique_kg numeric default 0,
  consommation_reelle_kg    numeric,
  perte_kg                  numeric default 0,
  ecart_kg                  numeric,
  ecart_pct                 numeric,
  ca_glaces                 numeric,
  pos_import_id             uuid references public.pos_imports(id) on delete set null,
  created_at                timestamptz default now()
);
alter table public.glaces_daily
  add column if not exists stock_debut_bacs          numeric,
  add column if not exists stock_fin_bacs            numeric,
  add column if not exists consommation_theorique_kg numeric default 0,
  add column if not exists consommation_reelle_kg    numeric,
  add column if not exists perte_kg                  numeric default 0,
  add column if not exists ecart_kg                  numeric,
  add column if not exists ecart_pct                 numeric,
  add column if not exists ca_glaces                 numeric,
  add column if not exists pos_import_id             uuid references public.pos_imports(id) on delete set null,
  add column if not exists created_at                timestamptz default now();
create unique index if not exists glaces_daily_restaurant_date_key on public.glaces_daily (restaurant_id, date);

-- ---------------------------------------------------------------------
-- Factures scannées (fonction scan-facture) et leurs lignes
-- ---------------------------------------------------------------------
create table if not exists public.scanned_invoices (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  fournisseur   text,
  numero_bl     text,
  date_facture  date,
  total_ht      numeric,
  statut        text not null default 'validated',
  source        text default 'scan',
  created_at    timestamptz default now()
);
alter table public.scanned_invoices
  add column if not exists fournisseur  text,
  add column if not exists numero_bl    text,
  add column if not exists date_facture date,
  add column if not exists total_ht     numeric,
  add column if not exists statut       text default 'validated',
  add column if not exists source       text default 'scan',
  add column if not exists created_at   timestamptz default now();
create index if not exists scanned_invoices_restaurant_date_idx on public.scanned_invoices (restaurant_id, date_facture);

-- Lignes : pas de restaurant_id (le front ne l'envoie pas) ; la RLS passe par
-- invoice_id -> scanned_invoices.restaurant_id (script 02, section 6b).
-- quantite / prix_unitaire peuvent être nuls (ligne ignorée, ligne sans prix).
create table if not exists public.scanned_invoice_items (
  id                 uuid primary key default gen_random_uuid(),
  invoice_id         uuid not null references public.scanned_invoices(id) on delete cascade,
  product_nom        text,
  quantite           numeric,
  unite              text,
  prix_unitaire      numeric,
  total_ht           numeric,
  matched_product_id uuid references public.products(id) on delete set null,
  prix_precedent     numeric,
  variation_pct      numeric,
  created_at         timestamptz default now()
);
alter table public.scanned_invoice_items
  add column if not exists product_nom        text,
  add column if not exists quantite           numeric,
  add column if not exists unite              text,
  add column if not exists prix_unitaire      numeric,
  add column if not exists total_ht           numeric,
  add column if not exists matched_product_id uuid references public.products(id) on delete set null,
  add column if not exists prix_precedent     numeric,
  add column if not exists variation_pct      numeric,
  add column if not exists created_at         timestamptz default now();
create index if not exists scanned_invoice_items_invoice_idx on public.scanned_invoice_items (invoice_id);

-- ---------------------------------------------------------------------
-- RLS activée (sans policy = aucun accès API tant que 02 n'est pas passé)
-- ---------------------------------------------------------------------
alter table public.equipements           enable row level security;
alter table public.dlc_entries           enable row level security;
alter table public.glaces_flavors        enable row level security;
alter table public.glaces_daily          enable row level security;
alter table public.pos_imports           enable row level security;
alter table public.pos_sales             enable row level security;
alter table public.scanned_invoices      enable row level security;
alter table public.scanned_invoice_items enable row level security;
