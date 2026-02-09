# Guide d'installation - Architecture finale

## 🏗️ Architecture

### Deux systèmes d'authentification séparés :

1. **Employés (Admin)** 
   -  Authentification 100% locale (PostgreSQL)
   -  Pas besoin de Firebase pour se connecter
   -  Fonctionne hors ligne
   -  Utilisent JWT pour les sessions

2. **Utilisateurs normaux**
   -  Authentification 100% Firebase
   -  Pas de base locale
   -  Paramètres stockés dans Firebase Firestore
   -  Gérés par les employés via l'interface admin

## 📋 Prérequis

- Docker et Docker Compose
- Un projet Firebase (uniquement pour les utilisateurs, pas pour les admin)
- Node.js (pour le script de création d'employé)

## 🔥 Configuration Firebase

### 1. Console Firebase

1. Créez un projet sur https://console.firebase.google.com
2. **Activez Firestore Database** : Build > Firestore Database > Create database
   - Mode production
   - Région : choisir la plus proche
3. **Activez Authentication** : Build > Authentication > Get started
   - Enable Email/Password
4. **Téléchargez les credentials Admin SDK** :
   - Project Settings > Service Accounts
   - Generate new private key
   - Sauvegardez dans `api/firebase-credentials.json`
5. **Récupérez les credentials Web** :
   - Project Settings > General > Your apps
   - Icône Web (</>)
   - Copiez la config

### 2. Règles Firestore (optionnel, pour sécurité)

Dans Firestore Database > Rules :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Seul le serveur peut écrire
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🚀 Installation

### 1. Structure des fichiers

```
projet/
├── .env                              ← À créer
├── docker-compose.yml
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql
│   ├── firebase-credentials.json     ← À créer
│   └── src/
│       ├── index.js
│       ├── config/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── controllers/
│       └── services/
│           └── firebaseSettings.js   ← NOUVEAU (Firestore)
├── web/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── Login.jsx             ← Admin (local)
│       │   ├── UserLogin.jsx         ← Users (Firebase)
│       │   ├── SessionSettings.jsx
│       │   ├── BlockedUsers.jsx
│       │   └── FirebaseUsers.jsx
│       └── services/
├── scripts/
│   ├── package.json
│   └── create-employee.js            ← Créer un employé
└── maps/
```

### 2. Configuration

**Créer `.env` à la racine :**
```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet-id
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
```

### 3. Démarrage

```bash
# Lancer tous les services
docker-compose up --build

# En arrière-plan
docker-compose up -d --build
```

### 4. Créer un employé admin

```bash
# Installer les dépendances
cd scripts
npm install

# Créer un employé
node create-employee.js admin admin@example.com Password123!

# Sortie attendue :
# 🔄 Création de l'employé admin...
#  Rôle admin trouvé
#  Mot de passe hashé
#  Employé créé dans la base locale
# 
# 🎉 Employé admin créé avec succès !
# 
# 📝 Informations de connexion :
#    Username: admin
#    Email: admin@example.com
#    Password: Password123!
# 
# 🌐 Vous pouvez maintenant vous connecter sur http://localhost
# 🔒 Authentification : PostgreSQL (100% hors ligne)
```

## 🎯 Utilisation

### Interface Admin (Employés)

1. Ouvrir http://localhost
2. Se connecter avec :
   - Username : `admin`
   - Password : `Password123!`
3. Accéder aux 3 onglets :
   - **Paramètres globaux** : Durée session, tentatives par défaut
   - **Utilisateurs Firebase** : Voir tous les users, personnaliser les tentatives
   - **Utilisateurs bloqués** : Débloquer les comptes

### Interface Utilisateur (Test Firebase)

1. Sur http://localhost, cliquer sur "Interface Utilisateur (Test)"
2. Créer un utilisateur dans Firebase Console
3. Se connecter avec cet utilisateur
4. Tester :
   - Tentatives limitées
   - Blocage automatique
   - Expiration de session

## 📊 Stockage des données

### PostgreSQL (Local)
```
 employees (username, email, password_hash, role_id)
 roles
 users (pour données métier, PAS pour auth)
 reports, companies, etc. (votre app métier)
```

### Firebase Firestore
```
 auth_settings/global (session_duration_minutes, default_max_login_attempts)
 user_settings/{uid} (max_login_attempts personnalisé)
 login_attempts/{uid} (failed_attempts, is_blocked, blocked_at)
```

### Firebase Auth
```
 Liste des utilisateurs
 Emails, passwords
 Metadata (creation, last signin)
```

## 🔧 API Endpoints

### Employés (Admin)

```bash
# Login employé (local)
POST /api/employee-auth/login
Body: { "username": "admin", "password": "..." }
Response: { "token": "JWT...", "employee": {...} }

# Vérifier token employé
GET /api/employee-auth/verify
Headers: { "Authorization": "Bearer JWT..." }
```

### Utilisateurs Firebase

```bash
# Vérifier tentatives
POST /api/auth/check-attempts
Body: { "email": "user@example.com" }

# Enregistrer échec
POST /api/auth/failed-attempt
Body: { "email": "user@example.com" }

# Connexion réussie
POST /api/auth/successful-login
Headers: { "Authorization": "Bearer <firebase_token>" }
```

### Admin (Employés uniquement)

```bash
# Tous nécessitent : Authorization: Bearer <JWT_employé>

# Paramètres
GET /api/admin/settings
PUT /api/admin/settings/session-duration
Body: { "minutes": 30 }

PUT /api/admin/settings/max-attempts
Body: { "attempts": 3 }

# Utilisateurs
GET /api/admin/firebase-users
PUT /api/admin/users/:uid/max-attempts
Body: { "max_attempts": 5 } # null pour défaut

# Blocages
GET /api/admin/users/blocked
POST /api/admin/users/:uid/unblock
```

## 🧪 Tests

### 1. Test employé admin

```bash
# Se connecter avec username/password local
Username: admin
Password: Password123!

# Vérifier l'accès aux 3 onglets
# Vérifier que ça marche SANS internet (couper le wifi)
```

### 2. Test utilisateur Firebase

```bash
# Créer un utilisateur dans Firebase Console
# Se connecter via "Interface Utilisateur (Test)"
# Essayer 3 fois avec mauvais password
# Vérifier le blocage
# Interface Admin > Utilisateurs bloqués > Débloquer
```

### 3. Test paramètres personnalisés

```bash
# Interface Admin > Utilisateurs Firebase
# Cliquer sur "Modifier" pour un utilisateur
# Définir 5 tentatives au lieu de 3
# Tester avec ce compte (Interface Utilisateur)
# Vérifier qu'on a bien 5 tentatives
```

### 4. Test expiration session

```bash
# Interface Admin > Paramètres > Durée session = 1 minute
# Interface Utilisateur > Se connecter
# Attendre 1 minute
# Essayer de faire une action
# Vérifier la déconnexion automatique
```

## 📝 Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart api

# Se connecter à PostgreSQL
docker exec -it postgres_postgis psql -U admin -d routes_db

# Voir les employés
SELECT * FROM employees;

# Voir les rôles
SELECT * FROM roles;

# Supprimer tout et recommencer
docker-compose down -v
docker-compose up --build
```

## 🔒 Sécurité

### Employés
-  Mot de passe hashé avec bcrypt
-  JWT avec expiration (24h)
-  Vérification du rôle sur chaque requête
-  Pas de Firebase, 100% local

### Utilisateurs
-  Firebase gère la sécurité
-  Tokens vérifiés à chaque requête
-  Blocage automatique
-  Paramètres dans Firestore (serveur uniquement)

## ⚠️ Important

1. **Ne commitez JAMAIS** :
   - `.env`
   - `api/firebase-credentials.json`
   - `node_modules/`

2. **En production** :
   - Changez `JWT_SECRET` dans les variables d'environnement
   - Utilisez des mots de passe forts
   - Configurez les règles Firestore
   - Activez HTTPS

3. **Firebase** :
   - Nécessaire UNIQUEMENT pour les utilisateurs
   - Les employés n'en ont PAS besoin
   - Firestore stocke les paramètres de sécurité

## 🎉 Avantages de cette architecture

 **Employés** : 100% hors ligne, rapide, sécurisé
 **Utilisateurs** : Firebase gère tout (scaling, sécurité, récup password)
 **Paramètres** : Centralisés dans Firestore, faciles à modifier
 **Séparation** : Admin et users complètement indépendants
 **Scalabilité** : Firebase scale automatiquement pour les users

## 🐛 Dépannage

**Employé ne peut pas se connecter**
```bash
# Vérifier que l'employé existe
docker exec -it postgres_postgis psql -U admin -d routes_db
SELECT * FROM employees WHERE username = 'admin';

# Recréer l'employé
cd scripts
node create-employee.js admin admin@example.com NewPassword123!
```

**Utilisateur ne peut pas se connecter**
```bash
# Vérifier Firebase Console > Authentication
# Vérifier Firestore > Collections (doivent exister)
# Vérifier les credentials dans .env
```

**Erreur Firestore**
```bash
# Vérifier que Firestore est activé dans Firebase Console
# Vérifier que firebase-credentials.json existe
# Redémarrer l'API : docker-compose restart api
```