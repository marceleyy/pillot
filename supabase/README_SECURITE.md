# Sécurité Supabase — Pillot

## 0. Avant tout : sauvegarde
Faire une sauvegarde de la base (Dashboard > Database > Backups, ou `pg_dump`)
**avant** d'appliquer quoi que ce soit. Tester d'abord sur un projet de staging si possible.

## 1. Ordre d'application
Dans le SQL Editor (rôle `postgres`), dans cet ordre :

0. `migrations/20261005_00_tables_manquantes.sql` — crée les 8 tables utilisées par l'appli mais absentes de la base : `equipements`, `dlc_entries`, `glaces_flavors`, `glaces_daily`, `pos_imports`, `pos_sales`, `scanned_invoices`, `scanned_invoice_items`.
1. `migrations/20261005_01_nouvelles_tables.sql` — tables `pointages`, `nettoyage_plans`, `ca_imports`, colonnes `temperature_logs.action_corrective`, `ca_history.date_debut/date_fin`.
2. `migrations/20261005_02_rls.sql` — fonctions `my_restaurant_id()`, `my_role()`, `is_admin()`, `can_manage()`, trigger anti-escalade sur `profiles`, policies.
3. `migrations/20261005_03_reglages.sql` — colonnes `restaurants.adresse`, `telephone`, `horaires`, `modules` (Réglages et interrupteur du module glacier). Sans elle, ces réglages affichent « mise à jour de la base nécessaire » ; le reste fonctionne.

Les deux fichiers sont rejouables (idempotents).

## 2. Après application : policies anciennes
Le script 02 affiche un `WARNING` pour chaque policy qu'il n'a pas créée.
Les policies permissives s'additionnent (OU) : une ancienne policy `using (true)`
annule l'isolation entre restaurants. Les lister puis supprimer celles qui sont en trop :

```sql
select tablename, policyname, permissive, cmd, qual
from pg_policies where schemaname = 'public' order by 1, 2;
-- drop policy "<nom>" on public.<table>;
```

## 3. Vérifier
Simuler un utilisateur (remplacer les uuid par de vrais `profiles.id`) :

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-employe>","role":"authenticated"}';
select count(*) from products;          -- uniquement son restaurant
select count(*) from shifts;            -- uniquement published = true
insert into products(restaurant_id, nom) values (public.my_restaurant_id(), 'test'); -- doit échouer
update profiles set role = 'owner' where id = auth.uid();                            -- doit échouer
rollback;
```

À refaire avec un `owner` (voit et modifie son restaurant, pas les autres),
un `admin` (voit tout) et en `set local role anon` (ne voit rien).

## 4. Points d'attention
- Les employés ne peuvent plus créer de fiches techniques (`recipes`/`recipe_items`
  réservées à owner/manager/admin) : l'écran Recettes doit masquer le bouton pour eux.
- `employees.salaire_horaire` reste lisible par un employé via l'API (la RLS filtre
  les lignes, pas les colonnes). Pour le cacher : vue dédiée ou GRANT par colonne.
- Insertion dans `profiles` : admin seulement. Les invitations passent par une
  edge function `service_role`. Un éventuel trigger `handle_new_user` doit être
  `security definer`.
- `access_requests` : admin seulement. Un formulaire public doit passer par une edge function.
