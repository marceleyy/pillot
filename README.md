# Pillot Restaurant

Application web de gestion de restaurant : inventaire, commandes fournisseurs, catalogue produits, registre HACCP (températures, nettoyage, DLC, réception, huile), planning de l'équipe, tâches du jour, fiches techniques et tableau de bord.

Éditeur : Marcel Sanda Mompole (EI).

## Démarrer

```bash
npm ci
npm run dev      # développement
npm run build    # version de production dans dist/
npm run lint
```

React 19 + Vite. Les données et les comptes sont dans Supabase (`src/lib/supabase.js`, clé publique « anon »).

## Avant de mettre un nouveau restaurant en service

1. **Sécurité (RLS)** : chaque table doit avoir la sécurité au niveau des lignes activée, avec une règle qui limite l'accès au `restaurant_id` du profil connecté. La clé anon est publique : sans RLS, n'importe qui peut lire les données.
2. **Comptes** : créer le restaurant (`restaurants`), puis les utilisateurs (Authentication) et leur profil (`profiles` : `restaurant_id`, `role` = `owner`, `manager` ou `employee`).
3. **Mot de passe oublié** : dans Supabase, Authentication → URL Configuration, mettre l'adresse de l'application dans « Site URL » et « Redirect URLs ».
4. **Démarrage côté client** : le gérant ajoute ses produits (menu Produits), ses équipements (menu Équipements) et ses types de poste (Planning → Types de poste).

## Rôles

- `owner` / `manager` : tout le restaurant.
- `employee` : tableau de bord, inventaire, commandes, HACCP, fiches techniques, planning en lecture, tâches. Pas de CA, de catalogue, d'équipements ni de réglages.
- `admin` : vue multi-restaurants.

Tout rôle inconnu ou vide est traité comme `employee`. Ces restrictions sont appliquées dans l'interface : pour qu'elles tiennent face à un appel direct à l'API, les règles RLS doivent aussi vérifier le rôle (écriture sur `products`, `shift_types`, `shifts`, `restaurants`, lecture des taux horaires dans `employees`).

Le module « Pillot Glaces » (glaciers) n'apparaît que si le restaurant a au moins un parfum dans `glaces_flavors`. Pour l'activer chez un nouveau client, insérer un premier parfum dans cette table.

La liste du plan de nettoyage personnalisée est enregistrée sur chaque appareil (stockage local du navigateur).

## Sécurité, fonctions serveur et nouveaux modules

- `supabase/migrations/` : nouvelles tables (pointages, plan de nettoyage, imports de caisse) et règles de sécurité par restaurant et par rôle. Mode d'emploi : `supabase/README_SECURITE.md` (faire une sauvegarde avant).
- `supabase/functions/` : `scan-facture` (lecture de factures, clé Anthropic côté serveur) et `invite-employe` (invitations d'équipe). Déploiement : `supabase/functions/README.md`. Le scan n'apparaît que si `VITE_SCAN_FACTURE=1`.
- Réglages > Clôture de la semaine : CA (saisi ou importé d'un export de caisse), achats et variation de stock donnent le ratio coût matière.
