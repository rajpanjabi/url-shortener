# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack URL shortener with React frontend, Express.js backend, PostgreSQL persistence, and Redis caching. Local development uses Docker Compose; production targets AWS via Terraform.

## Development Commands

### Backend (`backend/`)
```bash
npm run dev     # Start with nodemon (auto-reload)
npm start       # Start production server
```

### Frontend (`frontend/`)
```bash
npm run dev     # Start Vite dev server (port 5173)
npm run build   # Production build
npm run lint    # ESLint check
```

### Docker (from `infrastructure/`)
```bash
docker compose up --build   # Start all services (postgres, redis, backend, frontend)
docker compose down         # Stop all services
```

### Terraform (from `infrastructure/terraform/`)
```bash
terraform init
terraform plan
terraform apply
```

## Architecture

### Request Flow

**URL Shortening**: Frontend form → Redux action (`createShortUrl`) → `POST /api/urls` → validation → nanoid short code generation → PostgreSQL insert + Redis cache → response

**Redirect**: `GET /:shortCode` → Redis lookup → PostgreSQL fallback → expiration check → async click increment (both stores) → 301 redirect

### Backend Structure

- `src/server.js` — App entry, middleware registration, DB init
- `src/routes/urlRoutes.js` — Route definitions
- `src/controllers/urlController.js` — Request handlers
- `src/services/dbService.js` — All PostgreSQL queries
- `src/services/redisService.js` — Redis cache operations (TTL: 24h default)
- `src/services/shortCodeGenerator.js` — nanoid Base62, 7-char codes
- `src/config/database.js` — PG pool (max 20), auto-creates `urls` table on startup
- `src/config/redis.js` — Redis client setup
- `src/middleware/errorHandler.js` — Global error + 404 handlers

### Frontend Structure

- `src/redux/store.js` — Redux Toolkit store
- `src/redux/actions/urlActions.js` — Async thunks (createShortUrl, fetchUrls, deleteUrl, fetchAnalytics)
- `src/redux/reducers/urlReducer.js` — URL list, loading, error state
- `src/services/api.js` — Axios instance with interceptors
- `src/components/UrlForm.jsx` — Create form (custom codes, expiration in days)
- `src/components/UrlList.jsx` — Paginated list (50/page), copy, delete
- `src/components/Analytics.jsx` — Analytics dashboard (currently commented out in App.jsx)

### Key Design Decisions

- **Dual storage**: Redis for hot-path performance, PostgreSQL for durability
- **Click tracking is async** — non-blocking on redirect to minimize latency
- **Rate limiting**: 100 req / 15 min on `/api` routes
- **CORS**: Restricted to `FRONTEND_URL` env var
- **Short codes**: 6–10 chars accepted for custom; 7-char auto-generated (Base62)

### Infrastructure

- `infrastructure/docker-compose.yml` — Local: postgres, redis, backend (port 8000), frontend (port 5173)
- `infrastructure/terraform/` — AWS VPC with public subnets (ALB/frontend) and private subnets (backend, RDS, Redis); `rds.tf` is a stub yet to be implemented

## Environment Variables

Backend `.env`:
```
PORT=8000
BASE_URL=http://localhost:8000
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
REDIS_HOST / REDIS_PORT / REDIS_PASSWORD / REDIS_TTL
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX_REQUESTS
```

Frontend `.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```
