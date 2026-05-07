# Snapshoot

Snapshoot est une application sociale mobile construite avec React, Ionic, TypeScript, Vite et Capacitor. Le projet couvre les consignes demandées:

- CRUD complet sur les utilisateurs.
- Recherche d’un utilisateur par email, id, ville ou nom.
- Ajout d’amis à partir d’une recherche.
- Envoi de messages à une personne ou à plusieurs personnes.
- Découverte de stories selon la position GPS.
- Cible Android via Capacitor.
- Backend local basé sur une base JSON, sans BaaS externe.

## Architecture

- `src/` contient le front mobile.
- `server/` expose une API REST locale.
- `data/db.json` joue le rôle de base de données.
- `capacitor.config.ts` prépare la cible Android.

## Prérequis

- Node.js 18 ou supérieur.
- npm.

## Installation

```bash
npm install
```

## Démarrage

Lance le front et le backend en parallèle:

```bash
npm run dev
```

Le front démarre sur `http://localhost:5173` et l’API sur `http://localhost:4000`.

## Scripts

```bash
npm run dev:client
```

Lance uniquement le front Vite.

```bash
npm run dev:server
```

Lance uniquement le backend JSON.

```bash
npm run build
```

Construit le front en production.

```bash
npm run lint
```

Analyse le code avec ESLint.

```bash
npm run cap:sync
```

Construit l’application web et synchronise Capacitor.

```bash
npm run cap:open:android
```

Ouvre le projet Android si le dossier natif a déjà été généré avec Capacitor.

## Android

Pour générer la cible Android la première fois:

```bash
npm run build
npx cap add android
npm run cap:sync
npx cap open android
```

Pour exécuter l’application sur un émulateur Android, configure l’URL de l’API dans un fichier `.env` avant le build, par exemple:

```bash
VITE_API_BASE_URL=http://10.0.2.2:4000/api
```

Sur un appareil physique, remplace cette URL par l’adresse IP joignable de ta machine ou par une API déployée.

## Base JSON

Le backend lit et réécrit `data/db.json`. Les données initiales contiennent déjà des utilisateurs, des messages et des stories pour faciliter la démonstration.

## Vérification fonctionnelle

- Créer, modifier et supprimer un utilisateur.
- Rechercher un profil par email ou identifiant.
- Ajouter un ami depuis un résultat de recherche.
- Envoyer un message vers un contact unique ou un groupe.
- Publier une story avec position GPS et média.
- Rafraîchir les stories proches via la géolocalisation.

## Archive de rendu

Pour livrer le projet, compresse le dossier `snapshoot/` en archive ZIP en gardant cette documentation et le fichier JSON de données.
