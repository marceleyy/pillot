-- =====================================================================
-- Pillot — nouvelles tables et colonnes (2026-10-05)
-- Idempotent : peut être rejoué sans erreur.
-- Hypothèse : restaurants.id, employees.id sont des uuid (défaut Supabase ;
-- le code ne fait aucune conversion numérique des ids).
-- -- adapter si restaurants.id n'est pas uuid (idem employees.id)
-- =====================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid() (natif en PG13+, sans effet sinon)

-- ---------------------------------------------------------------------
-- Pointages (badgeuse)
-- ---------------------------------------------------------------------
create table if not exists public.pointages (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade, -- adapter si restaurants.id n'est pas uuid
  employee_id   uuid not null references public.employees(id) on delete cascade,   -- adapter si employees.id n'est pas uuid
  debut         timestamptz not null default now(),
  fin           timestamptz null,
  saisi_par     uuid references auth.users(id) default auth.uid(),
  note          text,
  created_at    timestamptz default now()
);

create index if not exists pointages_restaurant_debut_idx
  on public.pointages (restaurant_id, debut);

-- ---------------------------------------------------------------------
-- Plan de nettoyage (une ligne par restaurant, liste de tâches en JSON)
-- ---------------------------------------------------------------------
create table if not exists public.nettoyage_plans (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade, -- adapter si restaurants.id n'est pas uuid
  taches        jsonb not null default '[]'::jsonb,
  updated_at    timestamptz default now()
);

-- ---------------------------------------------------------------------
-- HACCP : action corrective sur relevé de température hors plage
-- ---------------------------------------------------------------------
alter table public.temperature_logs
  add column if not exists action_corrective text;

-- ---------------------------------------------------------------------
-- CA : période couverte (clôture hebdomadaire)
-- ---------------------------------------------------------------------
alter table public.ca_history
  add column if not exists date_debut date,
  add column if not exists date_fin   date;

-- ---------------------------------------------------------------------
-- Imports de CA (caisse / fichier)
-- ---------------------------------------------------------------------
create table if not exists public.ca_imports (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade, -- adapter si restaurants.id n'est pas uuid
  date_debut    date,
  date_fin      date,
  ca_sale       numeric,
  ca_sucre      numeric,
  source        text,
  created_at    timestamptz default now()
);

create index if not exists ca_imports_restaurant_debut_idx
  on public.ca_imports (restaurant_id, date_debut);
