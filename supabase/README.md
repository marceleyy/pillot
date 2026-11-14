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
| `20261114_00_inventaires` | à appliquer (inventaires datés aux prix figés) |
| `20261114_01_order_items` | à appliquer (règle d'accès des lignes de commande) |
| `20261114_02_parametres` | à appliquer (réglages par commerce : sections du stock) |

Faire une sauvegarde avant toute migration. Mettre ce tableau à jour après chaque application.
