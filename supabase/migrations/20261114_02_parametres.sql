-- Réglages propres à chaque commerce (sections du stock et leur règle de commande).
-- Ajoute une colonne seulement : sans risque pour les données existantes.
-- Sans elle, Pillot garde ses valeurs par défaut (Salé / Sucré) et l'écran
-- Réglages affiche « Mise à jour de la base nécessaire » à l'enregistrement.
-- L'objectif de coût matière et les modules utilisent les colonnes déjà en place
-- (restaurants.objectif, restaurants.modules).
alter table public.restaurants
  add column if not exists parametres jsonb not null default '{}'::jsonb;
