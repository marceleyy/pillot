# Base de données Pillot (Supabase)

- `schema_reference.sql` : photo de la base en ligne (tables, vue, index, règles RLS). Référence seulement, à ne pas lancer.
- `migrations/` : les changements, à appliquer dans l'ordre du nom de fichier, dans le SQL Editor (rôle `postgres`).

| Migration | En ligne |
| --- | --- |
| `20261005_00_tables_manquantes` | appliquée |
| `20261005_01_nouvelles_tables` | appliquée |
| `20261005_02_rls` | appliquée |
| `20261005_03_reglages` | appliquée |
| `20261005_04_rgpd` | pas encore dans `main` ni en ligne (branche non fusionnée), à reprendre avec les rôles |
| `20261114_00_inventaires` | appliqué le 15/11 (inventaires datés aux prix figés) |
| `20261114_01_order_items` | appliqué le 15/11 (règle d'accès des lignes de commande) |
| `20261114_02_parametres` | appliqué le 15/11 (réglages par commerce : sections du stock) |
| `20261115_00_roles_comptes` | appliqué le 15/11 (plusieurs commerces par compte, équipe, ouverture d'un commerce, congés/heures) |
| `20261116_00_consommation` | à appliquer (livraisons reçues et calcul de la consommation sur une période) |
| `20261117_00_lancement` | à appliquer (prix, CA, factures et inventaires réservés au gérant dans la base ; ouverture de son commerce à l'inscription). ⚠️ Une colonne ajoutée à `products` ou `restaurants` doit être ajoutée au `grant select (...)` |
| `20261125_00_taches_reparations` | appliquée le 25/11 (module Tâches et réparations : table, règles d'accès, statut tracé par `changer_statut_tache`) |

Faire une sauvegarde avant toute migration. Mettre ce tableau à jour après chaque application.
