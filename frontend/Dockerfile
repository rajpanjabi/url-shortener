# frontend/Dockerfile

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files (Copies the built React app from the build stage into Nginx’s default web root.)
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration (Replaces Nginx’s default config with our custom one (the nginx config file).
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Runs Nginx in the foreground (daemon off) — this is required for Docker containers to stay alive.
CMD ["nginx", "-g", "daemon off;"]