# Portefeuille — porte-cartes web

Une web app React (façon "app Cartes") pour ranger visuellement vos cartes
bancaires : pile de cartes animée, ajout avec détection automatique du
réseau (Visa / Mastercard / Amex / …), et stockage **chiffré, 100% local**.

## Sécurité — comment ça marche

Comme cette app est prévue pour y ranger de vraies cartes (Revolut, Crédit
Agricole, banques étrangères…), la sécurité a été pensée dès le départ :

- **Aucun backend, aucun réseau.** L'app est une SPA statique. Les numéros
  de carte, CVV, etc. ne sont jamais envoyés où que ce soit — ils ne
  quittent jamais le navigateur.
- **Chiffrement local avant stockage.** À la première utilisation, vous
  créez un code d'accès. Il sert (via PBKDF2, 250 000 itérations,
  SHA-256) à dériver une clé AES-256-GCM qui chiffre vos cartes avant
  qu'elles soient écrites dans IndexedDB. Rien n'est jamais stocké en
  clair sur le disque.
- **Rien n'est récupérable sans le code.** Le code d'accès n'est stocké
  nulle part — seul un vérificateur chiffré permet de savoir si le code
  saisi est correct. Si vous l'oubliez, il n'y a pas de "mot de passe
  oublié" : c'est le prix de ne rien envoyer sur un serveur.
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

**Limite honnête :** ceci reste une app web tournant dans un navigateur,
pas un coffre-fort bancaire certifié. Elle protège contre la lecture
occasionnelle de vos données sur l'appareil (vol d'ordinateur, accès
partagé, etc.), mais ne remplace pas les protections d'une vraie banque.
À utiliser en connaissance de cause.

## Fonctionnalités

- Pile de cartes façon Apple Wallet, défilement au doigt/à la souris.
- Ajout de carte avec formatage en direct du numéro, détection du réseau,
  masque de date MM/YY, validation Luhn et de la date d'expiration.
- Visuel de carte réaliste (puce, sans-contact, dégradé personnalisable,
  logo du réseau) qui se retourne pour voir le CVV.
- Copie rapide du numéro / CVV dans le presse-papiers.
- Suppression avec confirmation.
- Interface responsive : mobile et desktop.

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm run build    # build de prod (tsc + vite build)
npm run lint      # oxlint
```
