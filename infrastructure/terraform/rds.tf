# infrastructure/terraform/rds.tf
# RDS PostgreSQL: db.t3.micro, Single-AZ, 20 GB gp2 

# Subnet group: RDS must span >= 2 AZs even for Single-AZ deployments
resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-db-subnet-group"
  description = "Subnet group for RDS PostgreSQL (private subnets)"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-postgres"

  # Engine
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = "db.t3.micro" # Free tier eligible

  # Storage — 20 GB is the free tier max; disable autoscaling to avoid surprise charges
  allocated_storage     = 20
  max_allocated_storage = 20
  storage_type          = "gp2"
  storage_encrypted     = false # Encryption requires db.t3.small+ on some regions

  # Database
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false # Private — only reachable from ECS tasks

  # Free tier requires Single-AZ
  multi_az = false

  # Backups — 7-day retention, no cost on free tier
  backup_retention_period = 7
  backup_window           = "03:00-04:00" # UTC, low-traffic window
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Final snapshot on destroy to protect data; set skip_final_snapshot=true for dev teardowns
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-postgres-final-snapshot"
  deletion_protection       = false # Set true once live with real data

  tags = {
    Name = "${var.project_name}-postgres"
  }
}