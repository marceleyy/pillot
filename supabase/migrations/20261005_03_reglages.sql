-- Réglages du restaurant : coordonnées, horaires d'ouverture et modules affichés.
-- Sans risque pour les données existantes : ajoute des colonnes seulement.
alter table public.restaurants
  add column if not exists adresse   text,
  add column if not exists telephone text,
  add column if not exists horaires  jsonb not null default '{}'::jsonb,
  add column if not exists modules   jsonb not null default '{}'::jsonb;
-- modules.glaces : true = module glacier affiché, false = masqué,
-- absent = affiché seulement si le restaurant a des parfums actifs.
