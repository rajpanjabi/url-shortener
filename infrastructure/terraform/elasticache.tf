# infrastructure/terraform/elasticache.tf
# ElastiCache Redis — Free tier: cache.t3.micro, single node, 750 hrs/month (12 months)

# Subnet group for ElastiCache (uses private subnets)
resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project_name}-redis-subnet-group"
  description = "Subnet group for ElastiCache Redis (private subnets)"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-redis-subnet-group"
  }
}

# Single-node Redis cluster — no replication group needed for free tier
resource "aws_elasticache_cluster" "redis" {
  cluster_id        = "${var.project_name}-redis"
  engine            = "redis"
  engine_version    = "7.1"
  node_type         = "cache.t3.micro" # Free tier eligible (t2.micro is deprecated in newer accounts)
  num_cache_nodes   = 1                # Single node — multi-node is not free tier
  port              = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Maintenance window during low-traffic hours
  maintenance_window = "sun:05:00-sun:06:00"

  # Disable automatic failover — requires replication group, not available on single node
  # No snapshot/backup needed for cache (data is ephemeral by design)
  snapshot_retention_limit = 0

  tags = {
    Name = "${var.project_name}-redis"
  }
}
