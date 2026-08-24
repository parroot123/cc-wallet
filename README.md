# Portefeuille — porte-cartes web

Une web app React (façon "app Cartes") pour ranger visuellement vos cartes
bancaires : pile de cartes animée, ajout avec détection automatique du
réseau (Visa / Mastercard / Amex / …), et stockage **chiffré, 100% local**.

## Sécurité — comment ça marche

Comme cette app est prévue pour y ranger de vraies cartes (Revolut, Crédit
Agricole, banques étrangères…), la sécurité a été pensée dès le départ :

- **Chiffrement client avant tout stockage.** À la première utilisation,
  vous créez une *phrase secrète du coffre*. Elle sert (via PBKDF2,
  250 000 itérations, SHA-256) à dériver une clé AES-256-GCM qui chiffre
  vos cartes avant qu'elles soient écrites où que ce soit — IndexedDB
  local, et Supabase si vous activez la synchronisation. Rien n'est
  jamais stocké en clair.
- **Zero-knowledge si la synchronisation cloud est activée.** Cette phrase
  secrète n'est **jamais envoyée**, ni à Supabase ni ailleurs — seuls le
  sel et le blob chiffré transitent. Voir [Comptes et synchronisation
  cloud (Supabase)](#comptes-et-synchronisation-cloud-supabase) plus bas :
  même un accès complet à la base de données ne révèle aucune carte.
- **Sans synchronisation activée**, l'app reste 100% locale et hors ligne :
  aucun backend, aucun réseau, les numéros de carte ne quittent jamais le
  navigateur.
- **Rien n'est récupérable sans la phrase secrète du coffre.** Elle n'est
  stockée nulle part — seul un vérificateur chiffré permet de savoir si
  la phrase saisie est correcte. Si vous l'oubliez, il n'y a pas de
  "mot de passe oublié" pour le coffre : c'est le prix du zero-knowledge.
  (Le mot de passe du *compte*, lui, est récupérable par e-mail — voir
  plus bas — mais il ne donne accès à aucune carte à lui seul.)
- **Verrouillage automatique.** L'app se reverrouille après 3 minutes
  d'inactivité ou dès que l'onglet passe en arrière-plan.
- **Numéro/CVV masqués par défaut**, y compris dans le détail d'une carte
  — un appui explicite est nécessaire pour les afficher, et l'affichage
  se remasque automatiquement après 15 secondes.
- **Détection du réseau, pas de la banque.** La reconnaissance
  Visa/Mastercard/Amex/etc. repose sur les plages IIN publiques et
  standardisées, donc fiable. Le nom de la banque, en revanche, n'est
  *jamais deviné* à partir du numéro : sans base BIN commerciale fiable,
  ça produirait de fausses détections trompeuses. Le champ "Banque" est
  donc à remplir soi-même (avec une liste de suggestions courantes).

**Limite honnête :** ceci reste une app web, pas un coffre-fort bancaire
certifié. Elle protège contre la lecture occasionnelle de vos données
(vol d'appareil, accès partagé, fuite côté serveur si le cloud est
activé), mais ne remplace pas les protections d'une vraie banque.
Choisissez une phrase secrète du coffre longue et unique — c'est elle,
et elle seule, qui protège vos numéros de carte. À utiliser en
connaissance de cause.

## Fonctionnalités

- Pile de cartes façon Apple Wallet, défilement au doigt/à la souris.
- Ajout de carte avec formatage en direct du numéro, détection du réseau,
  masque de date MM/YY, validation Luhn et de la date d'expiration.
- Visuel de carte réaliste (puce, sans-contact, dégradé personnalisable,
  logo du réseau) qui se retourne pour voir le CVV.
- Copie rapide du numéro / CVV dans le presse-papiers.
- Suppression avec confirmation.
- Interface responsive : mobile et desktop.

## Comptes et synchronisation cloud (Supabase)

Par défaut l'app est **100% locale** : pas de compte, pas de réseau. Vous
pouvez activer un compte + synchronisation multi-appareils via
[Supabase](https://supabase.com) (gratuit pour cet usage) — utile si vous
voulez retrouver vos cartes sur plusieurs appareils, pas seulement
"1 téléphone = 1 coffre isolé".

### Ce que Supabase héberge, et ce qu'il ne voit jamais

Supabase gère uniquement :
- **les comptes** (e-mail + mot de passe, via Supabase Auth) — sert à
  protéger l'accès à l'app, pas à déchiffrer les cartes ;
- **une ligne par utilisateur** dans une table `vaults` contenant du sel
  cryptographique et un blob chiffré AES-256-GCM.

Supabase ne voit et ne stocke **jamais** un numéro de carte, un CVV ou une
date d'expiration en clair. La clé de déchiffrement est dérivée dans votre
navigateur à partir de la *phrase secrète du coffre*, qui n'est elle-même
jamais transmise. Les policies RLS (Row Level Security) du schéma
garantissent en plus que chaque utilisateur ne peut lire/écrire que sa
propre ligne.

### Mise en place (une fois)

1. Créez un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Dans **SQL Editor**, collez et exécutez le contenu de
   [`supabase/migration.sql`](./supabase/migration.sql) — il crée la table
   `vaults` et ses policies RLS.
3. Dans **Authentication → Providers**, l'auth par e-mail/mot de passe est
   activée par défaut — rien à faire. Dans **Authentication → URL
   Configuration**, ajoutez l'URL de votre déploiement Vercel (ex.
   `https://votre-app.vercel.app`) comme *Site URL* et dans *Redirect
   URLs* — nécessaire pour que le lien "mot de passe oublié" fonctionne.
4. Dans **Project Settings → API**, récupérez `Project URL` et la clé
   `anon public`.
5. Renseignez-les comme variables d'environnement :
   - **En local** : copiez `.env.example` en `.env.local` et remplissez
     `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
   - **Sur Vercel** : Project Settings → Environment Variables, ajoutez
     les deux mêmes clés, puis redéployez (Deployments → ⋯ → Redeploy).

Une fois ces variables présentes, l'app affiche automatiquement l'écran
de connexion/inscription au démarrage. Sans elles, elle démarre
directement sur le coffre local, comme avant — rien ne casse si vous ne
configurez rien.

### Bon à savoir

- La phrase secrète du coffre (chiffrement) et le mot de passe du compte
  (connexion) sont **volontairement deux choses différentes**. Utiliser
  la même valeur pour les deux réduit la protection zero-knowledge en cas
  de fuite du mot de passe de compte — préférez deux secrets distincts.
- La confirmation d'e-mail est activée par défaut sur un nouveau projet
  Supabase : après inscription, un e-mail de confirmation est envoyé
  avant que la connexion soit possible.

## Installer l'app sur iPhone (PWA)

L'app est une *Progressive Web App* : une fois déployée (Vercel ou
ailleurs en HTTPS), vous pouvez l'installer comme une vraie app, sans
passer par l'App Store.

1. Ouvrez l'URL de votre déploiement **dans Safari** sur iPhone (pas
   Chrome — iOS n'autorise l'installation que depuis Safari).
2. Appuyez sur l'icône **Partager** (le carré avec la flèche vers le
   haut) dans la barre du bas.
3. Choisissez **Sur l'écran d'accueil**, puis **Ajouter**.

L'app apparaît alors avec sa propre icône, s'ouvre en plein écran (sans
barre d'adresse Safari), et fonctionne hors-ligne une fois chargée une
première fois grâce au service worker. Sur Android/Chrome, une bannière
"Installer l'application" apparaît généralement automatiquement.

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm run build    # build de prod (tsc + vite build)
npm run lint      # oxlint
node scripts/gen-icons.mjs   # régénère les icônes PWA depuis public/favicon.svg
```
