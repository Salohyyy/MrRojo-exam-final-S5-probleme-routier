# MrRojo-exam-final-S5-probleme-routier
Manomboka 

# Structure du Projet

Voici l'arborescence des fichiers et dossiers du projet :

```
project-restored/
├── backend/
│   ├── api/
│   │   └── index.js
│   ├── config/
│   │   └── firebase.config.js
│   ├── controller/
│   │   └── report.controller.js
│   ├── routes/
│   │   └── report.routes.js
│   ├── metiers/
│   │   ├── reportService.js
│   │   └── testService.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── map/
│   │   │       └── MapReports.jsx
│   │   ├── hooks/
│   │   │   └── useReportsTraite.js
│   │   ├── App.jsx
│   │   ├── firebase.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── maps/
│   ├── antananarivo.mbtiles
│   └── osm-2020-02-10-v3.11_madagascar_antananarivo.mbtiles
├── nginx/
│   └── default.conf
└── docker-compose.yml
```

### 1. Fonctionnalités Backend (API)
L'API gère la synchronisation entre PostgreSQL (base locale) et Firebase (Cloud), ainsi que la gestion des signalements.

- Consultation des signalements (Reports) :
  
  - GET /api/reports : Récupère tous les signalements depuis PostgreSQL (avec jointures pour obtenir le type de problème, le statut, et l'utilisateur).
  - GET /api/reports/city/:city : Récupère les signalements traités ( reports_traites ) depuis Firebase filtrés par ville.
- Suivi des travaux (Report Syncs) :
  
  - GET /api/report-syncs : Liste les travaux en cours ( report_syncs ) avec les détails (budget, progression, entreprise assignée, surface).
- Mise à jour des statuts :
  
  - PUT /api/report-syncs/:id/status : Change le statut d'un chantier.
    - Action double : Met à jour PostgreSQL (tables report_syncs et reports ) ET synchronise immédiatement la modification vers Firebase (collection report_traites ).
- Référentiels :
  
  - GET /api/report-statuses : Liste les statuts possibles pour les signalements.
- Synchronisation Globale :
  
  - POST /api/sync-all-to-firebase : Déclenche manuellement une synchronisation complète de PostgreSQL vers Firebase.
    - Envoie tous les reports vers la collection reports .
    - Envoie tous les report_syncs vers la collection report_traites .
### 2. Fonctionnalités Frontend (Web)
L'interface permet de visualiser et d'interagir avec ces données.

- Tableau de bord principal :
  
  - Affichage d'une carte interactive ( MapReports ) pour géolocaliser les incidents.
  - Affichage d'une liste détaillée des signalements en cours de traitement ( ReportList ).
- Gestion des statuts :
  
  - Possibilité de modifier le statut d'un signalement directement depuis la liste (via le hook useReportsTraite ).
- Logique Métier (Hooks) :
  
  - useReportsTraite : Un hook personnalisé qui charge automatiquement les données au démarrage et gère les états de chargement/erreur.
### Résumé technique pour l'intégration
Si vous devez refaire ces fonctionnalités, voici les points clés à retenir :

1. Double écriture : Toute modification de statut doit se faire en local (Postgres) puis être répliquée sur Firebase.
2. Structure de données Firebase :
   - Collection reports : Signalements bruts.
   - Collection report_traites : Signalements pris en charge (avec info entreprise, budget, etc.).
3. Architecture : Le backend est découpé en Routes -> Contrôleurs -> Services (Métiers) -> Base de données.
