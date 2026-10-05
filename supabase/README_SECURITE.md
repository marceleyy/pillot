# Sécurité Supabase — Pillot

## 0. Avant tout : sauvegarde
Faire une sauvegarde de la base (Dashboard > Database > Backups, ou `pg_dump`)
**avant** d'appliquer quoi que ce soit. Tester d'abord sur un projet de staging si possible.

## 1. Ordre d'application
Dans le SQL Editor (rôle `postgres`), dans cet ordre :

1. `migrations/20261005_01_nouvelles_tables.sql` — tables `pointages`, `nettoyage_plans`, `ca_imports`, colonnes `temperature_logs.action_corrective`, `ca_history.date_debut/date_fin`.
2. `migrations/20261005_02_rls.sql` — fonctions `my_restaurant_id()`, `my_role()`, `is_admin()`, `can_manage()`, trigger anti-escalade sur `profiles`, policies.
3. `migrations/20261005_03_rgpd.sql` — mesures RGPD : taux horaire déplacé dans `employees_paie` (responsables seulement), date de retrait des employés, pointages protégés (plus de suppression en cascade, historique des corrections dans `pointages_historique`, heure d'arrivée imposée par le serveur pour un employé), un responsable ne modifie que le rôle d'un autre profil, fonction `anonymiser_employe()`, purge `rgpd_purge()` (3 ans).

Les trois fichiers sont rejouables (idempotents). Déployer la nouvelle version de l'appli en même temps que le script 03 : l'ancienne ne lit pas `employees_paie` et afficherait une masse salariale à 0.

Purge automatique : activer l'extension `pg_cron` (Dashboard > Database > Extensions) **avant** le script 03, qui planifie alors `rgpd_purge()` chaque dimanche à 3 h. Sans `pg_cron`, lancer `select public.rgpd_purge();` à la main de temps en temps. Durée modifiable : `select public.rgpd_purge(60);` (en mois).

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
- Taux horaire : après le script 03, `employees.salaire_horaire` reste toujours vide
  (un trigger déplace toute valeur écrite vers `employees_paie`).
- Badgeuse sur tablette : la connecter avec un compte **employé** dédié, jamais celui
  du gérant (les comptes responsables sont déconnectés après 15 min d'inactivité).
- Insertion dans `profiles` : admin seulement. Les invitations passent par une
  edge function `service_role`. Un éventuel trigger `handle_new_user` doit être
  `security definer`.
- `access_requests` : admin seulement. Un formulaire public doit passer par une edge function.
