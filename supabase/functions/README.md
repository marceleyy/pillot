# Edge Functions Pillot

| Fonction | Rôle | Qui peut l'appeler |
|---|---|---|
| `scan-facture` | Lit une facture / un BL (photo ou PDF) avec Claude et renvoie un JSON | gérant, manager, admin |
| `invite-employe` | Envoie une invitation par e-mail et crée le profil dans le restaurant de l'appelant | gérant, manager (employés seulement), admin |

`_shared/common.ts` contient le CORS et la vérification de l'appelant (JWT + table `profiles`).

## Déploiement

```bash
supabase login
supabase link --project-ref <ref-du-projet>

# Clé Claude : secret serveur, jamais dans le code du navigateur
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Origine autorisée (CORS) : l'URL de l'appli en production
supabase secrets set ALLOWED_ORIGIN=https://<url-de-l-appli>

supabase functions deploy scan-facture
supabase functions deploy invite-employe
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies automatiquement par Supabase aux fonctions.

## Activer le scan dans l'application

Le scan est masqué tant que la variable Vite n'est pas définie. Dans `.env.local` (ou les variables d'environnement de l'hébergeur) :

```
VITE_SCAN_FACTURE=1
```

puis reconstruire l'application (`npm run build`).

## Invitations : URL de redirection

Le lien de l'e-mail d'invitation renvoie vers `window.location.origin`. Ajouter l'URL de production (et `http://localhost:5173` pour le développement) dans le dashboard Supabase : **Authentication → URL Configuration → Redirect URLs**. Sinon Supabase redirige vers la Site URL.

Le modèle d'e-mail se personnalise dans **Authentication → Email Templates → Invite user**.

## Tester en local

```bash
supabase functions serve --env-file supabase/.env.local   # contient ANTHROPIC_API_KEY=...
```
