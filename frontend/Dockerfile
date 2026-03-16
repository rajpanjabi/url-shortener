# frontend/Dockerfile

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Inject API base URL at build time (Vite bakes env vars into the JS bundle)
# Default is /api so it works behind the ALB without a hardcoded domain
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Production stage
FROM nginx:alpine

# Apply latest Alpine security patches (fixes openssl CVEs from ECR scanning)
RUN apk upgrade --no-cache

# Copy built files (Copies the built React app from the build stage into Nginx’s default web root.)
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration (Replaces Nginx’s default config with our custom one (the nginx config file).
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Runs Nginx in the foreground (daemon off) — this is required for Docker containers to stay alive.
CMD ["nginx", "-g", "daemon off;"]