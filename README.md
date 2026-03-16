# URL Shortener

A full-stack URL shortener built with React, Express.js, PostgreSQL, and Redis. Containerised with Docker, deployed to AWS via Terraform, and continuously delivered through GitHub Actions.

## Architecture

```
Internet
    |
    v
ALB (port 80)
    |-- /assets/*      --> frontend container (Nginx, port 80)
    |-- /index.html    --> frontend container
    |-- /api/*         --> backend container (Node.js, port 8000)
    `-- /:shortCode    --> backend container  [default]

EC2 t2.micro  (ECS host, public subnet)
    |-- backend  container --> RDS PostgreSQL  (private subnet)
    |                      --> ElastiCache Redis (private subnet)
    `-- frontend container

CloudWatch <-- logs from both containers
```

Short codes at `/:shortCode` route to the backend by default. Only known frontend paths (`/`, `/index.html`, `/assets/*`) are forwarded to the React app. This avoids conflicts between SPA routes and redirect handling.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Redux Toolkit, Vite, Axios |
| Backend | Node.js 18, Express 5, ESM modules |
| Database | PostgreSQL 16 (AWS RDS) |
| Cache | Redis 7 (AWS ElastiCache) |
| Containerisation | Docker (multi-stage builds, Alpine base) |
| Infrastructure | Terraform, AWS (ECS EC2, ALB, RDS, ElastiCache, ECR) |
| CI/CD | GitHub Actions |

## Local Development

All services run via Docker Compose from the `infrastructure/` directory.

```bash
cd infrastructure
docker compose up --build
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend on port 8000
- Frontend dev server on port 5173

To stop everything:

```bash
docker compose down
```

To run services individually without Docker:

**Backend** (from `backend/`):
```bash
npm install
npm run dev   # nodemon with auto-reload
```

**Frontend** (from `frontend/`):
```bash
npm install
npm run dev   # Vite dev server
```

## Environment Variables

Create a `.env` file in `backend/`:

```env
PORT=8000
BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=urlshortener
DB_USER=postgres
DB_PASSWORD=your_password

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=86400

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Create a `.env` file in `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

In production, `VITE_API_BASE_URL` defaults to `/api` (relative path) so requests route through the ALB without hardcoding a domain. This is injected at Docker build time as a build argument.

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/urls` | Create a short URL |
| `GET` | `/api/urls` | List all URLs (paginated) |
| `GET` | `/api/urls/:shortCode/analytics` | Click analytics for a short URL |
| `DELETE` | `/api/urls/:shortCode` | Delete a short URL |
| `GET` | `/:shortCode` | Redirect to the original URL |

**Create a short URL**

```bash
curl -X POST http://localhost:8000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com", "customCode": "mylink", "expiresIn": 7}'
```

`customCode` and `expiresIn` (days) are optional. Auto-generated codes are 7 characters, Base62.

## Infrastructure

Infrastructure is defined with Terraform in `infrastructure/terraform/`. 
### AWS Resources

| Resource | Type | 
|---|---|
| ECS Host | EC2 t2.micro |
| Database | RDS db.t3.micro, Single-AZ, 20GB gp2 |
| Cache | ElastiCache cache.t3.micro | 
| Load Balancer | ALB | 
| Container Registry | ECR | 

The EC2 instance runs in a public subnet so it can pull images from ECR directly . RDS and ElastiCache sit in private subnets and are only reachable from within the VPC.

### Provisioning

```bash
cd infrastructure/terraform

terraform init
terraform plan
terraform apply
```

After a successful apply, `terraform output` prints the ALB URL, ECR repository URLs, and ECS cluster/service names.

### First-time image push

Before ECS can run the containers, you need to push images to ECR:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=<your_account_id>

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS \
  --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Backend
docker build --platform linux/amd64 \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/url-shortener-backend:latest \
  ./backend
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/url-shortener-backend:latest

# Frontend
docker build --platform linux/amd64 \
  --build-arg VITE_API_BASE_URL=/api \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/url-shortener-frontend:latest \
  ./frontend
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/url-shortener-frontend:latest
```

The `--platform linux/amd64` flag is required when building on Apple Silicon. The EC2 host runs x86_64.

## CI/CD

Two GitHub Actions workflows run on push to `main`:

**CI** (`.github/workflows/ci.yml`) — runs on every push and pull request:
- Lints the frontend with ESLint
- Installs backend dependencies
- Builds both Docker images to validate the Dockerfiles

**Deploy** (`.github/workflows/deploy.yml`) — runs on push to `main` only:
1. Builds and pushes the backend image to ECR (tagged with the commit SHA)
2. Downloads the current ECS task definition, swaps the image tag, and deploys to ECS
3. Waits for the backend service to stabilise
4. Repeats steps 1-3 for the frontend

### Required GitHub Secrets

Go to Settings > Secrets and variables > Actions and add:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID |

The IAM user needs permissions to push to ECR and update ECS services. The minimum required policies are `AmazonEC2ContainerRegistryPowerUser` and `AmazonECS_FullAccess`.

## Project Structure

```
url-shortener/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js        # PostgreSQL pool, table initialisation
│   │   │   └── redis.js           # Redis client setup
│   │   ├── controllers/
│   │   │   └── urlController.js   # Request handlers
│   │   ├── middleware/
│   │   │   └── errorHandler.js    # Global error and 404 handlers
│   │   ├── routes/
│   │   │   └── urlRoutes.js       # Route definitions
│   │   ├── services/
│   │   │   ├── dbService.js       # All PostgreSQL queries
│   │   │   ├── redisService.js    # Cache operations (default TTL: 24h)
│   │   │   └── shortCodeGenerator.js  # nanoid Base62, 7-char codes
│   │   └── server.js              # Entry point, middleware registration
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UrlForm.jsx        # Create form (custom codes, expiry)
│   │   │   ├── UrlList.jsx        # Paginated list with copy and delete
│   │   │   └── Analytics.jsx      # Analytics dashboard
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   ├── actions/urlActions.js
│   │   │   └── reducers/urlReducer.js
│   │   └── services/api.js        # Axios instance with interceptors
│   ├── nginx.conf                 # Nginx config for the production container
│   └── Dockerfile
└── infrastructure/
    ├── docker-compose.yml         # Local development
    └── terraform/
        ├── vpc.tf                 # VPC, subnets, route tables
        ├── security-groups.tf     # ALB, ECS, RDS, Redis SGs
        ├── alb.tf                 # Load balancer and routing rules
        ├── ecs.tf                 # Cluster, task definitions, services, EC2 host
        ├── rds.tf                 # PostgreSQL instance
        ├── elasticache.tf         # Redis cluster
        ├── ecr.tf                 # Container registries with lifecycle policies
        ├── iam.tf                 # EC2 instance role, ECS execution and task roles
        ├── outputs.tf             # ALB URL, ECR URLs, service names
        ├── variables.tf
        └── terraform.tfvars
```

## How Redirects Work

1. A request for `/:shortCode` hits the ALB and routes to the backend by default.
2. The backend checks Redis first. On a cache hit, it redirects immediately (301).
3. On a cache miss, it queries PostgreSQL, checks expiration, then redirects.
4. Click count is incremented asynchronously in both stores so the redirect is not blocked.

## Rate Limiting

API routes (`/api/*`) are limited to 100 requests per 15 minutes per IP. This is configured via `express-rate-limit` and controlled by the `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` environment variables.
