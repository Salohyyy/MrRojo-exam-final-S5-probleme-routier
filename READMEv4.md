# Guide d'installation - Version simplifiée

## 🏗️ Architecture

### Deux systèmes d'authentification séparés :

1. **Employés (Admin)** 
   - ✅ Authentification 100% locale (PostgreSQL)
   - ✅ **Mot de passe en clair** (pas de hash)
   - ✅ Pas besoin de Firebase pour se connecter
   - ✅ Fonctionne hors ligne
   - ✅ Utilisent JWT pour les sessions
   - ✅ **Employé admin créé automatiquement au démarrage**

2. **Utilisateurs normaux**
   - ✅ Authentification 100% Firebase
   - ✅ Pas de base locale
   - ✅ Paramètres stockés dans Firebase Firestore
   - ✅ Gérés par les employés via l'interface admin

## 📋 Prérequis

- Docker et Docker Compose
- Un projet Firebase (uniquement pour les utilisateurs, pas pour les admin)

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

### 2. Règles Firestore (optionnel)

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
│   ├── init.sql                      ← Crée l'admin automatiquement
│   ├── firebase-credentials.json     ← À créer
│   └── src/
├── web/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
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

# L'employé admin est créé automatiquement !
```

### 4. Se connecter

**Identifiants par défaut :**
- 🌐 URL : http://localhost
- 👤 Username : `admin`
- 🔑 Password : `admin123`

**C'est tout ! Pas de script à exécuter.**

## 🎯 Utilisation

### Interface Admin (Employés)

1. Ouvrir http://localhost
2. Se connecter avec `admin` / `admin123`
3. Accéder aux 3 onglets :
   - **Paramètres globaux** : Durée session, tentatives par défaut
   - **Utilisateurs Firebase** : Voir tous les users, personnaliser les tentatives
   - **Utilisateurs bloqués** : Débloquer les comptes

### Interface Utilisateur (Test Firebase)

1. Sur http://localhost, cliquer sur "Interface Utilisateur (Test)"
2. Créer un utilisateur dans Firebase Console
3. Se connecter avec cet utilisateur
4. Tester les fonctionnalités

## 👥 Ajouter des employés manuellement

Vous pouvez ajouter des employés directement dans PostgreSQL :

```bash
# Se connecter à PostgreSQL
docker exec -it postgres_postgis psql -U admin -d routes_db

# Créer un employé simple
INSERT INTO employees (username, email, password, role_id)
VALUES ('employe1', 'employe1@example.com', 'password123', 
        (SELECT id FROM roles WHERE name = 'employee'));

# Créer un autre admin
INSERT INTO employees (username, email, password, role_id)
VALUES ('superadmin', 'super@example.com', 'super123', 
        (SELECT id FROM roles WHERE name = 'admin'));

# Voir tous les employés
SELECT id, username, email, password, 
       (SELECT name FROM roles WHERE id = employees.role_id) as role
FROM employees;
```

**Ou modifiez directement `api/init.sql`** à la fin du fichier (section commentée).

## 📊 Stockage des données

### PostgreSQL (Local)
```sql
-- Table employees (mot de passe en clair)
employees:
  - id, username, email, password, role_id

-- Employé par défaut (créé automatiquement)
username: admin
email: admin@example.com
password: admin123
role: admin
```

### Firebase Firestore
```
Collections créées automatiquement au premier usage :

✅ auth_settings/global 
   - session_duration_minutes (30 par défaut)
   - default_max_login_attempts (3 par défaut)

✅ user_settings/{uid}
   - max_login_attempts (personnalisé ou null)

✅ login_attempts/{uid}
   - failed_attempts, is_blocked, blocked_at
```

## 🔧 API Endpoints

### Employés (Admin)

```bash
# Login employé (local, mot de passe en clair)
POST /api/employee-auth/login
Body: { "username": "admin", "password": "admin123" }
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

GET /api/admin/settings
PUT /api/admin/settings/session-duration
PUT /api/admin/settings/max-attempts
GET /api/admin/firebase-users
PUT /api/admin/users/:uid/max-attempts
GET /api/admin/users/blocked
POST /api/admin/users/:uid/unblock
```

## 🧪 Tests rapides

### 1. Test employé admin

```bash
# Ouvrir http://localhost
# Login : admin / admin123
# ✅ Accès direct sans script !
```

### 2. Test utilisateur Firebase

```bash
# Firebase Console > Authentication > Add user
# Email: test@example.com, Password: test123

# Interface Utilisateur (Test)
# Se connecter avec test@example.com / test123
# ✅ Ça marche !
```

### 3. Test blocage

```bash
# Interface Utilisateur
# Se tromper 3 fois de mot de passe
# ✅ Compte bloqué

# Interface Admin > Utilisateurs bloqués
# Cliquer "Débloquer"
# ✅ Compte débloqué
```

## 📝 Commandes utiles

```bash
# Voir les logs
docker-compose logs -f api

# Redémarrer
docker-compose restart

# PostgreSQL : voir les employés
docker exec -it postgres_postgis psql -U admin -d routes_db
SELECT * FROM employees;

# PostgreSQL : créer un employé
INSERT INTO employees (username, email, password, role_id)
VALUES ('nouvel_admin', 'new@example.com', 'password', 
        (SELECT id FROM roles WHERE name = 'admin'));

# Tout supprimer et recommencer
docker-compose down -v
docker-compose up --build
```

## 🔒 Sécurité

### ⚠️ Important

**Mot de passe en clair** : 
- ✅ Simple pour le développement
- ✅ Facile d'ajouter des employés via SQL
- ❌ **NE PAS utiliser en production !**
- ❌ Pour la production, utilisez bcrypt

**Pour la production** :
1. Changez `JWT_SECRET` dans les variables d'environnement
2. Hashéz les mots de passe avec bcrypt
3. Utilisez HTTPS
4. Configurez les règles Firestore

## 🎉 Avantages

✅ **Pas de script séparé** - Tout dans init.sql
✅ **Employé admin créé automatiquement** - Prêt à l'emploi
✅ **Mot de passe en clair** - Facile à gérer en dev
✅ **Insertion SQL directe** - Ajouter des employés facilement
✅ **100% hors ligne pour admin** - Pas besoin d'internet

## 🐛 Dépannage

**L'employé admin n'existe pas**
```bash
# Vérifier les logs au démarrage
docker-compose logs postgres

# Devrait afficher :
# NOTICE: ✅ Employé admin créé : username=admin, password=admin123

# Si absent, recréer :
docker-compose down -v
docker-compose up --build
```

**Mot de passe refusé**
```bash
# Vérifier le mot de passe en base
docker exec -it postgres_postgis psql -U admin -d routes_db
SELECT username, password FROM employees WHERE username = 'admin';

# Devrait afficher : admin | admin123
```

**Changer le mot de passe**
```bash
docker exec -it postgres_postgis psql -U admin -d routes_db
UPDATE employees SET password = 'nouveau_password' WHERE username = 'admin';
```

## 📌 Résumé

1. `docker-compose up --build`
2. Ouvrir http://localhost
3. Login : `admin` / `admin123`
4. C'est tout ! 🎉