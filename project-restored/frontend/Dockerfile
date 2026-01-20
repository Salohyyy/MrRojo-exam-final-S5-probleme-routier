FROM node:20-alpine AS build
WORKDIR /app

# Copier les fichiers package
COPY package*.json ./
RUN npm install

# Copier le code source
COPY . .

# Build l'application
RUN npm run build

# Stage de production avec Nginx
FROM nginx:alpine

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]