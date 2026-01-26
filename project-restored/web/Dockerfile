FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier tout le reste
COPY . .

# Exposer le port
EXPOSE 3000

# Variables d'environnement pour React
ENV CHOKIDAR_USEPOLLING=true
ENV WDS_SOCKET_PORT=0

# Démarrer l'application
CMD ["npm", "start"]