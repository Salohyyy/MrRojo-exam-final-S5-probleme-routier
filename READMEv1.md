# Guide d'installation et de configuration

## 📋 Prérequis

- Docker et Docker Compose installés
- Un projet Firebase créé
- Node.js (pour le développement local uniquement)

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

### 2. Créer un utilisateur admin

Pour tester, créez un utilisateur dans Firebase Console et donnez-lui le rôle admin via Firebase CLI ou avec ce script Node.js :

```javascript
// scripts/set-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('../api/firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'admin@example.com'; // Remplacez par votre email

admin.auth().getUserByEmail(email)
  .then(user => {
    return admin.auth().setCustomUserClaims(user.uid, { admin: true });
  })
  .then(() => {
    console.log(`✓ Rôle admin attribué à ${email}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
  });
```

## 🚀 Installation

### 1. Configuration des variables d'environnement

**Backend (déjà configuré dans docker-compose.yml)**
Les credentials Firebase sont chargés depuis `api/firebase-credentials.json`

**Frontend - Créer `web/.env`:**
```env
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet-id
```

### 2. Structure des fichiers

Assurez-vous d'avoir cette structure :
```
projet/
├── docker-compose.yml
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql
│   ├── firebase-credentials.json   ← À créer
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
│   ├── .env                        ← À créer
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── config/
│       ├── components/
│       └── services/
└── maps/
    └── osm-2020-02-10-v3.11_madagascar_antananarivo.mbtiles
```
<<<<<<< HEAD

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

### 4. Accès aux services

- **Frontend**: http://localhost
- **API**: http://localhost:4000
- **Tileserver**: http://localhost:8080
- **PostgreSQL**: localhost:5432

## 🔧 API Endpoints

### Authentification (Public)

```bash
# Vérifier les tentatives avant connexion
POST /api/auth/check-attempts
Body: { "email": "user@example.com" }

# Enregistrer une tentative échouée
POST /api/auth/failed-attempt
Body: { "email": "user@example.com" }

# Enregistrer une connexion réussie (nécessite token)
POST /api/auth/successful-login
Headers: { "Authorization": "Bearer <firebase_token>" }
```

### Administration (Nécessite token + rôle admin)

```bash
# Obtenir les paramètres
GET /api/admin/settings
Headers: { "Authorization": "Bearer <firebase_token>" }

# Modifier la durée des sessions
PUT /api/admin/settings/session-duration
Headers: { "Authorization": "Bearer <firebase_token>" }
Body: { "hours": 24 }

# Modifier le nombre de tentatives
PUT /api/admin/settings/max-attempts
Headers: { "Authorization": "Bearer <firebase_token>" }
Body: { "attempts": 3 }

# Liste des utilisateurs bloqués
GET /api/admin/users/blocked
Headers: { "Authorization": "Bearer <firebase_token>" }

# Débloquer un utilisateur
POST /api/admin/users/:uid/unblock
Headers: { "Authorization": "Bearer <firebase_token>" }
```

## 🗄️ Base de données PostgreSQL

Les tables sont automatiquement créées au démarrage via `init.sql`:

- `session_settings` - Paramètres globaux
- `user_auth_tracking` - Suivi des utilisateurs et blocages
- `user_sessions` - Sessions actives

Pour accéder à PostgreSQL :
```bash
docker exec -it postgres_postgis psql -U admin -d routes_db
```

## 🧪 Tests

### Test de connexion normale
1. Ouvrez http://localhost
2. Connectez-vous avec un utilisateur Firebase
3. Vérifiez que la session est créée

### Test de blocage
1. Tentez de vous connecter 3 fois avec un mauvais mot de passe
2. Le compte devrait être bloqué
3. Connectez-vous en tant qu'admin
4. Allez dans "Utilisateurs bloqués"
5. Débloquez l'utilisateur

### Test des paramètres
1. Connectez-vous en tant qu'admin
2. Modifiez la durée des sessions
3. Modifiez le nombre de tentatives autorisées
4. Vérifiez que les changements sont appliqués

## 🐛 Dépannage

### Le backend ne démarre pas
- Vérifiez que `firebase-credentials.json` existe
- Vérifiez les logs : `docker-compose logs api`

### Erreur de connexion à PostgreSQL
- Attendez que PostgreSQL soit complètement démarré
- Le healthcheck devrait gérer cela automatiquement

### Problème d'authentification
- Vérifiez que les credentials Firebase sont corrects
- Vérifiez que l'utilisateur a le rôle admin pour accéder aux routes admin

### CORS errors
- Vérifiez que l'URL de l'API dans le frontend correspond
- L'API autorise déjà tous les origins en développement

## 📝 Notes importantes

1. **Sécurité** : En production, utilisez des variables d'environnement pour tous les secrets
2. **Firebase credentials** : Ne commitez JAMAIS `firebase-credentials.json`
3. **Admin role** : Seuls les utilisateurs avec `customClaims.admin = true` peuvent accéder aux routes admin
4. **Sessions** : Les sessions sont gérées côté backend avec expiration personnalisable
5. **Blocages** : Les comptes bloqués ne peuvent pas se connecter même avec le bon mot de passe

## 🔄 Développement local (sans Docker)

```bash
# Backend
cd api
npm install
npm run dev

# Frontend
cd web
npm install
npm run dev
```

Modifiez `VITE_API_URL` dans `.env` pour pointer vers `http://localhost:4000`
=======
>>>>>>> parent of bdc14c1 (miaraka amin'ilay an tsiory(naverina)- API)
