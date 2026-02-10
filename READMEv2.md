# Guide d'installation et de configuration - Version finale

## 📋 Prérequis

- Docker et Docker Compose installés
- Un projet Firebase créé
- Node.js (pour les scripts d'administration)

## 🔥 Configuration Firebase

### 1. Console Firebase (https://console.firebase.google.com)

1. Créez un nouveau projet ou utilisez un projet existant
2. Activez l'authentification Email/Password dans Authentication > Sign-in method
3. Téléchargez les credentials Admin SDK :
   - Allez dans Project Settings > Service Accounts
   - Cliquez sur "Generate new private key"
   - Sauvegardez le fichier JSON dans `api/firebase-credentials.json`

4. Récupérez les credentials Web :
   - Project Settings > General
   - Dans "Your apps", sélectionnez l'icône Web (</>)
   - Copiez les valeurs de `firebaseConfig`

## 🚀 Installation

### 1. Configuration des variables d'environnement

**Créer `.env` à la RACINE du projet :**
```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet-id
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
```

### 2. Structure des fichiers

```
projet/
├── .env                          ← À créer
├── docker-compose.yml
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql                  ← Base de données modifiée
│   ├── firebase-credentials.json ← À créer
│   └── src/
│       ├── index.js
│       ├── config/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── controllers/
├── web/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── config/
│       ├── components/
│       │   ├── Login.jsx              ← Admin login
│       │   ├── UserLogin.jsx          ← User login (test)
│       │   ├── SessionSettings.jsx
│       │   ├── BlockedUsers.jsx
│       │   └── FirebaseUsers.jsx      ← NOUVEAU
│       └── services/
├── scripts/
│   ├── package.json
│   ├── create-admin-employee.js       ← NOUVEAU
│   ├── set-admin.js
│   └── check-admin.js
└── maps/
```

### 3. Démarrage

```bash
# Construire et démarrer tous les services
docker-compose up --build

# En arrière-plan
docker-compose up -d --build

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

### 4. Créer un employé admin

```bash
# Installer les dépendances du script
cd scripts
npm install

# Créer un employé admin (Firebase + Base locale)
node create-admin-employee.js admin@example.com 123456! Admin

# Ou depuis la racine
node scripts/create-admin-employee.js admin@example.com 123456! Admin
```

**Résultat attendu :**
```
🔄 Création de l'employé admin...
 Utilisateur Firebase créé
   UID: abc123...
 Rôle admin Firebase attribué
 Rôle admin créé dans la base
 Employé créé dans la base locale

🎉 Employé admin créé avec succès !

📝 Informations de connexion :
   Email: admin@example.com
   Password: MotDePasse123!
   Username: Admin
   Firebase UID: abc123...

🌐 Vous pouvez maintenant vous connecter sur http://localhost
```

### 5. Accès aux services

- **Frontend**: http://localhost
- **API**: http://localhost:4000
- **Tileserver**: http://localhost:8080
- **PostgreSQL**: localhost:5432

## 🎯 Fonctionnalités implémentées

### Interface Admin (employés avec rôle admin)

1. **Paramètres globaux**
   - Durée de vie des sessions (en minutes : 1-1440)
   - Nombre de tentatives de connexion par défaut (1-10)

2. **Gestion des utilisateurs Firebase**
   - Liste des utilisateurs Firebase
   - Synchronisation vers la base locale (un par un ou tous)
   - Paramètres personnalisés par utilisateur (nombre de tentatives)

3. **Utilisateurs bloqués**
   - Liste des comptes bloqués
   - Déblocage individuel

### Interface Utilisateur (pour test)

1. **Connexion avec gestion des tentatives**
   - Affichage des tentatives restantes
   - Blocage automatique après X tentatives
   - Message d'erreur explicite

2. **Gestion de session**
   - Affichage du temps restant
   - Déconnexion automatique à l'expiration
   - Vérification périodique de la session

## 🔧 API Endpoints

### Authentification

```bash
# Vérifier les tentatives
POST /api/auth/check-attempts
Body: { "email": "user@example.com" }

# Enregistrer tentative échouée
POST /api/auth/failed-attempt
Body: { "email": "user@example.com" }

# Enregistrer connexion réussie
POST /api/auth/successful-login
Headers: { "Authorization": "Bearer <token>" }

# Vérifier la session
GET /api/auth/check-session
Headers: { "Authorization": "Bearer <token>" }
```

### Administration (Admin uniquement)

```bash
# Paramètres globaux
GET /api/admin/settings
PUT /api/admin/settings/session-duration
Body: { "minutes": 30 }

PUT /api/admin/settings/max-attempts
Body: { "attempts": 3 }

# Utilisateurs Firebase
GET /api/admin/firebase-users
POST /api/admin/firebase-users/:uid/sync
POST /api/admin/firebase-users/sync-all

# Paramètres utilisateur spécifique
PUT /api/admin/users/:firebase_uid/max-attempts
Body: { "max_attempts": 5 }  # ou null pour défaut

# Blocages
GET /api/admin/users/blocked
POST /api/admin/users/:firebase_uid/unblock
```

## 🗄️ Base de données

### Tables principales

- **employees** : Employés avec firebase_uid et role_id
- **users** : Utilisateurs normaux avec firebase_uid
- **auth_settings** : Paramètres globaux (durée session, tentatives)
- **user_auth_settings** : Paramètres par utilisateur + statut sync
- **login_attempts** : Suivi des tentatives et blocages
- **active_sessions** : Sessions actives (pour suivi)

## 🧪 Scénarios de test

### 1. Test interface admin

```bash
1. Ouvrir http://localhost
2. Cliquer sur "Interface Admin" (bouton en haut à droite)
3. Se connecter avec l'employé admin créé
4. Tester les 3 onglets :
   - Paramètres globaux
   - Utilisateurs Firebase
   - Utilisateurs bloqués
```

### 2. Test interface utilisateur

```bash
1. Créer un utilisateur dans Firebase Console
2. Sur http://localhost, cliquer sur "Interface Utilisateur (Test)"
3. Tenter de se connecter avec un mauvais mot de passe
4. Vérifier le compteur de tentatives
5. Se connecter avec le bon mot de passe
6. Vérifier l'affichage de la session
```

### 3. Test synchronisation utilisateur

```bash
1. Créer plusieurs utilisateurs dans Firebase Console
2. Interface Admin > Utilisateurs Firebase
3. Cliquer sur "Synchroniser tout"
4. Vérifier dans PostgreSQL :
   SELECT * FROM users WHERE firebase_uid IS NOT NULL;
```

### 4. Test paramètres personnalisés

```bash
1. Interface Admin > Utilisateurs Firebase
2. Sélectionner un utilisateur synchronisé
3. Cliquer sur "Modifier tentatives"
4. Définir 5 tentatives au lieu de 3
5. Tester la connexion avec ce compte (interface utilisateur)
```

## 🐛 Dépannage

### Le build web échoue

```bash
# Générer package-lock.json
cd web
npm install
cd ..
docker-compose up --build
```

### Erreur "admin role not found"

```bash
# Recréer l'employé admin
cd scripts
npm install
node create-admin-employee.js admin@example.com Password123! Admin
```

### Session expire immédiatement

```bash
# Vérifier les paramètres
curl http://localhost:4000/api/admin/settings \
  -H "Authorization: Bearer <votre_token>"

# Augmenter la durée
# Interface Admin > Paramètres > Durée de session
```

### Utilisateur bloqué à tort

```bash
# Interface Admin > Utilisateurs bloqués > Débloquer
# Ou via API :
curl -X POST http://localhost:4000/api/admin/users/<firebase_uid>/unblock \
  -H "Authorization: Bearer <admin_token>"
```

## 📝 Notes importantes

1. **Durée de session** : En minutes (1-1440 = 24h max)
2. **Déconnexion automatique** : Quand la session expire
3. **Pas de refresh automatique** : Session fixe, pas de prolongation
4. **Admin = employé** : Seuls les employés avec role "admin" peuvent accéder à l'interface admin
5. **Synchronisation** : Les utilisateurs Firebase doivent être synchronisés pour avoir des paramètres personnalisés

## 🔒 Sécurité

- Les credentials Firebase ne sont JAMAIS commités
- Les tokens sont vérifiés à chaque requête
- Les sessions expirent automatiquement
- Les comptes sont bloqués après X tentatives
- Seuls les admins accèdent aux routes d'administration



# 1. Créer .env à la racine avec vos credentials Firebase
# 2. Créer api/firebase-credentials.json
# 3. Démarrer
docker-compose up --build

# 4. Créer un admin
cd scripts && npm install
node create-admin-employee.js admin@example.com Password123! Admin

# 5. Accéder à http://localhost