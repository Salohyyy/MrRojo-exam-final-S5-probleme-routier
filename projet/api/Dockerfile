FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# On installe tout pour le build, ou seulement production
RUN npm install 
COPY . .
EXPOSE 4000
# Vérifiez si votre fichier est dans src/index.js ou api/index.js
CMD ["node", "src/index.js"]