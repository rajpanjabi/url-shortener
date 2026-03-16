# infrastructure/terraform/outputs.tf
# Values printed after `terraform apply` — used by CI/CD and for manual reference

# ==========================================
# APPLICATION URL
# ==========================================

output "app_url" {
  description = "Public URL of the application (ALB DNS name)"
  value       = "http://${aws_lb.main.dns_name}"
}


# ==========================================
# ECR REPOSITORY URLS
# ==========================================
# Used in CI/CD workflows to tag and push Docker images

output "ecr_backend_url" {
  description = "ECR repository URL for the backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for the frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}


# ==========================================
# ECS
# ==========================================

output "ecs_cluster_name" {
  description = "ECS cluster name — used in CI/CD deploy step"
  value       = aws_ecs_cluster.main.name
}

output "ecs_backend_service_name" {
  description = "ECS backend service name — used in CI/CD deploy step"
  value       = aws_ecs_service.backend.name
}

output "ecs_frontend_service_name" {
  description = "ECS frontend service name — used in CI/CD deploy step"
  value       = aws_ecs_service.frontend.name
}


# ==========================================
# DATABASE
# ==========================================

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = "${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}"
  sensitive   = true # Hide from logs; contains internal hostname
}


# ==========================================
# REDIS
# ==========================================

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
  sensitive   = true
}
