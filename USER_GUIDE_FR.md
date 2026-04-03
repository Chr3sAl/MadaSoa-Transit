# Guide Utilisateur MadaSoa Transit

## Vue d'ensemble

MadaSoa Transit est une application logistique bilingue avec deux espaces principaux :

- Un portail public de suivi pour les clients
- Une suite interne d'administration pour les operations, la finance et les administrateurs

L'application prend en charge deux langues :

- Anglais via `/en`
- Francais via `/fr`

## Espaces Principaux

### Portail Public

Le portail public permet de consulter les expeditions sans se connecter.

Points d'entree principaux :

- `/en`
- `/fr`

Les utilisateurs publics peuvent :

- Rechercher par numero de suivi Chine ou numero de suivi interne
- Rechercher par reference client
- Filtrer la recherche par reference client selon le type de transport
- Ouvrir la fiche detaillee d'une expedition
- Voir la progression du trajet, l'ETA, l'etat du paiement, le poids, le volume et les frais

Regles importantes du portail public :

- La recherche par reference client affiche uniquement les expeditions publiques avec un solde impaye
- Les expeditions masquees n'apparaissent pas publiquement
- La recherche publique est limitee pour eviter les abus

### Suite Admin

La suite admin permet de gerer la reception, les expeditions, les clients, les imports, les rapports et les acces equipe.

Points d'entree principaux :

- `/en/admin/login`
- `/fr/admin/login`

Apres connexion, chaque utilisateur ne voit que les sections autorisees pour son role.

## Comptes de Connexion Seed

Si la base a ete initialisee avec le seed, ces comptes sont disponibles :

- Admin : `admin@madasoatransit.local` / `Admin123!`
- Operateur : `operator@madasoatransit.local` / `Operator123!`
- Finance : `finance@madasoatransit.local` / `Finance123!`

Ces comptes proviennent du script de seed et doivent etre modifies pour une vraie production.

## Resume des Roles

| Role | Usage principal | Acces |
| --- | --- | --- |
| `admin` | Controle complet de la plateforme | Dashboard, Intake, Shipments, Customers, Imports, Reports, Team |
| `operator` | Operations quotidiennes entrepot et expeditions | Dashboard, Intake, Shipments, Customers, Imports, Reports |
| `finance` | Suivi paiement et reporting | Dashboard, Shipments, Customers, Reports |

## Matrice des Permissions

| Fonction | Admin | Operateur | Finance |
| --- | --- | --- | --- |
| Voir le dashboard | Oui | Oui | Oui |
| Utiliser le flux de reception | Oui | Oui | Non |
| Creer des expeditions | Oui | Oui | Non |
| Modifier les champs operationnels d'une expedition | Oui | Oui | Non |
| Modifier les champs financiers d'une expedition | Oui | Non | Oui |
| Rechercher et consulter les clients | Oui | Oui | Oui |
| Creer des clients | Oui | Oui | Non |
| Previsualiser et valider des imports | Oui | Oui | Non |
| Voir les rapports | Oui | Oui | Oui |
| Voir l'equipe | Oui | Non | Non |
| Creer des utilisateurs equipe | Oui | Non | Non |

## Navigation et Interface Communes

Tous les utilisateurs connectes peuvent utiliser :

- Le changement de langue entre francais et anglais
- Le theme switcher
- L'action de deconnexion
- Les cartes du dashboard et la navigation filtree selon le role

## Comment Utiliser le Portail Public

### 1. Recherche par numero de suivi

Utilisez ce mode si vous connaissez le numero de suivi Chine ou le numero interne.

Etapes :

1. Ouvrez `/en` ou `/fr`
2. Restez sur l'onglet de suivi
3. Saisissez le numero de suivi Chine ou interne
4. Cliquez sur `Search`
5. Consultez le resume de l'expedition
6. Cliquez sur `Open details` pour afficher la fiche detaillee

Les resultats peuvent afficher :

- Statut actuel
- Etape du trajet
- Origine et destination
- Client
- Transporteur
- ETA
- Poids reel
- Poids volumetrique
- Volume
- Frais
- Statut de paiement
- Chronologie de l'expedition

### 2. Recherche par reference client

Utilisez ce mode si le client connait sa reference interne plutot que le numero du colis.

Etapes :

1. Ouvrez `/en` ou `/fr`
2. Basculez sur l'onglet reference client
3. Saisissez la reference client
4. Choisissez le type de transport
5. Cliquez sur `Search`
6. Consultez la liste des expeditions ouvertes
7. Ouvrez la fiche detaillee si necessaire

Ce mode est prevu pour les dossiers avec encours et non pour tout l'historique.

## Comment Utiliser la Suite Admin

### 1. Se connecter

Etapes :

1. Ouvrez `/en/admin/login` ou `/fr/admin/login`
2. Saisissez votre email et votre mot de passe
3. Cliquez sur `Submit`
4. Vous serez redirige vers le dashboard admin

### 2. Dashboard

Le dashboard fournit une vue rapide de l'activite.

Il affiche :

- Le total des expeditions
- Les dossiers ouverts
- Les expeditions livrees
- Le nombre d'imports
- Les expeditions recentes
- Les imports recents

Utilisez-le comme point de depart du travail quotidien.

## Guide du Role Admin

Le role `admin` a un acces complet a toute la plateforme.

### Responsabilites typiques

- Superviser l'ensemble de l'operation
- Creer et modifier les expeditions
- Gerer la reception et les colis non attribues
- Creer des clients
- Lancer les imports tableur
- Consulter les rapports
- Gerer les comptes equipe
- Ajuster les champs financiers des expeditions

### Flux par section

#### Reception / Intake

Utilisez Intake pour les colis nouvellement recus a l'entrepot.

Flux :

1. Scanner un colis avec :
   - un scanner materiel
   - le champ de scan manuel
   - le scanner camera live
2. Relire l'apercu du scan
3. Confirmer ou corriger :
   - numero de suivi Chine
   - client
   - poids reel
   - valeur declaree
   - type de transport
   - transporteur
   - devise declaree
   - emplacement etagere
   - notes
4. Creer l'expedition immediatement ou enregistrer le colis comme non attribue
5. Si le colis est non attribue, l'assigner plus tard depuis la file d'attente

Fonctions supplementaires admin :

- Rechercher un client existant pendant la reception
- Creer rapidement un client sans quitter Intake
- Attribuer plus tard les colis non attribues et creer l'expedition

#### Expeditions

Les admins peuvent creer de nouvelles expeditions et modifier tous les champs.

Flux de creation :

1. Ouvrir `Shipments`
2. Ouvrir `New shipment`
3. Remplir les champs requis :
   - tracking number
   - customer
   - customer reference
   - origin
   - destination
   - status
4. Ajouter les champs optionnels :
   - transport type
   - carrier
   - actual weight
   - volumetric weight
   - volume
   - ETA
   - notes
   - public visibility
   - freight amount
   - currency
   - payment status

Les admins peuvent modifier a la fois les champs operationnels et financiers.

#### Clients

Les admins peuvent :

- Rechercher des clients
- Creer des clients
- Definir un code client et un prefixe de reference
- Enregistrer des alias destinataire
- Enregistrer des numeros de telephone Chine
- Enregistrer des alias marketplace ou etiquette

Cette page sert de reference centrale pour la correspondance client pendant la reception et les imports.

#### Imports

Les admins peuvent previsualiser et valider les imports d'expeditions a partir de fichiers tableur.

Types de fichiers acceptes :

- `.csv`
- `.xlsx`
- `.xls`

Colonnes obligatoires :

- `trackingNumber`
- `customerReference`
- `customerName`
- `origin`
- `destination`
- `currentStatus`
- `paymentStatus`

Flux d'import :

1. Charger un fichier
2. Cliquer sur `Preview`
3. Consulter les lignes valides
4. Consulter les erreurs de validation
5. Corriger le fichier source si besoin
6. Cliquer sur `Commit import`
7. Verifier l'historique des imports

#### Rapports

Les admins peuvent consulter :

- Les volumes par statut
- Les expeditions impayees par client
- Le volume mensuel
- Le resume d'historique des imports

#### Equipe

Les admins peuvent :

- Voir la liste de l'equipe
- Ajouter de nouveaux membres
- Attribuer un role parmi `admin`, `operator` et `finance`

## Guide du Role Operateur

Le role `operator` est destine aux operations entrepot et expeditions.

### Responsabilites typiques

- Receptionner les colis entrants
- Associer les colis aux clients
- Creer des expeditions
- Mettre a jour les donnees operationnelles
- Maintenir les fiches clients
- Lancer les imports
- Consulter les rapports

### Ce que les operateurs peuvent faire

#### Intake

Les operateurs ont le meme acces Intake que les admins :

- scanner des colis
- utiliser le scan camera live
- consulter l'aperçu du scan
- selectionner un client existant
- creer rapidement un client pendant Intake
- confirmer poids, valeur, transport, etagere et notes
- creer une expedition
- enregistrer en non attribue
- assigner plus tard depuis la file non attribuee

#### Expeditions

Les operateurs peuvent creer des expeditions et modifier uniquement les champs operationnels.

Champs modifiables par l'operateur :

- customer reference
- transport type
- origin
- destination
- carrier
- current status
- actual weight
- volumetric weight
- volume
- ETA
- notes
- public visibility

Les operateurs ne peuvent pas modifier les champs financiers :

- payment status
- freight amount
- currency

#### Clients

Les operateurs peuvent :

- rechercher des clients
- creer des clients
- gerer les alias et coordonnees lors de la creation

#### Imports

Les operateurs peuvent :

- charger des fichiers CSV/XLSX
- previsualiser les lignes
- consulter les erreurs d'import
- valider les imports corrects

#### Rapports

Les operateurs peuvent consulter les rapports pour le suivi quotidien.

### Ce que les operateurs ne peuvent pas faire

- Gerer les comptes equipe
- Modifier les champs financiers
- Acceder a la page Team

## Guide du Role Finance

Le role `finance` est centre sur le suivi des paiements et le reporting.

### Responsabilites typiques

- Suivre les soldes ouverts
- Mettre a jour les champs de paiement
- Verifier les comptes clients
- Suivre les expeditions impayees dans les rapports

### Ce que les utilisateurs finance peuvent faire

#### Dashboard

Les utilisateurs finance peuvent suivre :

- total des expeditions
- dossiers ouverts
- nombre de livraisons
- resume de l'activite d'import

#### Expeditions

Les utilisateurs finance ne peuvent pas creer d'expeditions, mais ils peuvent modifier les champs financiers.

Champs modifiables par la finance :

- payment status
- freight amount
- currency

Cela permet de mettre a jour l'etat de facturation sans toucher aux donnees logistiques.

#### Clients

Les utilisateurs finance peuvent rechercher et consulter les fiches clients pour le suivi compte.

#### Rapports

Les utilisateurs finance peuvent consulter :

- outstanding by customer
- repartition par statut
- volume mensuel
- historique des imports

### Ce que la finance ne peut pas faire

- Utiliser Intake
- Creer des expeditions
- Creer des clients
- Lancer des imports
- Gerer les comptes equipe
- Modifier les champs operationnels

## Flux Quotidiens Recommandes

### Flux reception entrepot

Recommande pour admins et operateurs :

1. Receptionner le colis
2. Scanner l'etiquette
3. Verifier la suggestion de suivi et de client
4. Confirmer le poids reel et la valeur declaree
5. Definir le type de transport et les notes utiles
6. Creer l'expedition ou enregistrer le colis comme non attribue

### Flux import tableur

Recommande pour admins et operateurs :

1. Preparer le fichier CSV/XLSX avec les colonnes obligatoires
2. Previsualiser l'import
3. Corriger les lignes invalides
4. Valider l'import
5. Verifier l'historique

### Flux suivi finance

Recommande pour finance et admins :

1. Ouvrir `Reports`
2. Consulter `Outstanding by customer`
3. Ouvrir `Shipments`
4. Mettre a jour `paymentStatus`, `freightAmount` ou `currency`
5. Verifier si la visibilite publique reste correcte si besoin

## Notes Importantes

- La visibilite publique est essentielle. Une expedition masquee n'apparaitra pas sur le portail public.
- La recherche publique par reference client est orientee dossiers impayes.
- Intake exige une confirmation humaine. Le scan aide, mais l'operateur confirme toujours poids, valeur et transport.
- La gestion de l'equipe est reservee a l'admin.
- Les modifications finance sont volontairement limitees aux champs de facturation.

## Notes de Mise en Place

Pour qu'un nouvel environnement fonctionne correctement :

1. Appliquer les migrations Prisma
2. Executer le seed de base
3. Se connecter avec un compte seed ou un compte equipe cree

Commandes utiles :

```bash
npm run prisma:migrate:deploy
npm run db:seed
```

Si la base de donnees est vide, les comptes de connexion et les donnees admin n'existeront pas encore.
