# 1. Créer ET promouvoir admin en une commande
cd scripts
npm install
node create-admin-user.js admin@example.com VotreMotDePasse123!

# 2. Se connecter sur http://localhost avec ces identifiants

# Si l'utilisateur existe déjà dans Firebase
cd scripts
npm install
node set-admin.js admin@example.com