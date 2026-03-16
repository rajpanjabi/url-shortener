# infrastructure/terraform/ecs.tf
# ECS cluster using EC2 launch type (free tier: t2.micro, 750 hrs/month)
#
# Architecture:
#   - Single t2.micro EC2 instance in a PUBLIC subnet (needs internet to pull from ECR;
#     no NAT gateway required this way)
#   - Both backend and frontend containers run on the same instance
#   - ALB routes traffic to the correct container via target groups defined in alb.tf
#
# Memory budget on t2.micro (1024 MB total):
#   OS + ECS agent : ~300 MB
#   backend task   : 400 MB
#   frontend task  : 200 MB
#   headroom       : ~124 MB


# ==========================================
# ECS CLUSTER
# ==========================================

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  tags = {
    Name = "${var.project_name}-cluster"
  }
}


# ==========================================
# CLOUDWATCH LOG GROUPS
# ==========================================

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}/backend"
  retention_in_days = 7 # Minimise storage cost; adjust as needed

  tags = {
    Name = "${var.project_name}-backend-logs"
  }
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}/frontend"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-frontend-logs"
  }
}


# ==========================================
# EC2 CONTAINER INSTANCE
# ==========================================

# Latest ECS-optimised Amazon Linux 2 AMI (managed by AWS via SSM)
data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id"
}

resource "aws_instance" "ecs_host" {
  ami                         = data.aws_ssm_parameter.ecs_ami.value
  instance_type               = "t2.micro" # Free tier eligible
  subnet_id                   = aws_subnet.public[0].id # Public subnet — internet access for ECR pulls
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2_instance_profile.name
  vpc_security_group_ids      = [aws_security_group.ecs_tasks.id]

  # Registers this EC2 instance with the ECS cluster on boot
  user_data = <<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
  EOF

  tags = {
    Name = "${var.project_name}-ecs-host"
  }
}


# ==========================================
# TASK DEFINITION: BACKEND
# ==========================================

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = "backend"
    image     = "${aws_ecr_repository.backend.repository_url}:latest"
    essential = true
    memory    = 400
    cpu       = 256

    portMappings = [{
      containerPort = 8000
      hostPort      = 8000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV",    value = "production" },
      { name = "PORT",        value = "8000" },
      { name = "BASE_URL",    value = "http://${aws_lb.main.dns_name}" },
      { name = "FRONTEND_URL", value = "http://${aws_lb.main.dns_name}" },

      # Database
      { name = "DB_HOST", value = aws_db_instance.postgres.address },
      { name = "DB_PORT", value = tostring(aws_db_instance.postgres.port) },
      { name = "DB_NAME", value = var.db_name },
      { name = "DB_USER", value = var.db_username },
      # TODO: move DB_PASSWORD to SSM Parameter Store (free) or Secrets Manager
      #       to avoid storing it in the task definition in plaintext.
      { name = "DB_PASSWORD", value = var.db_password },

      # Redis
      { name = "REDIS_HOST", value = aws_elasticache_cluster.redis.cache_nodes[0].address },
      { name = "REDIS_PORT", value = tostring(aws_elasticache_cluster.redis.port) },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backend"
      }
    }
  }])

  tags = {
    Name = "${var.project_name}-backend-task"
  }
}


# ==========================================
# TASK DEFINITION: FRONTEND
# ==========================================

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = "frontend"
    image     = "${aws_ecr_repository.frontend.repository_url}:latest"
    essential = true
    memory    = 200
    cpu       = 128

    portMappings = [{
      containerPort = 80
      hostPort      = 80
      protocol      = "tcp"
    }]

    # The frontend container is a static Nginx build; no secrets needed
    environment = []

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "frontend"
      }
    }
  }])

  tags = {
    Name = "${var.project_name}-frontend-task"
  }
}


# ==========================================
# ECS SERVICES
# ==========================================

resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "EC2"

  # Register tasks with the ALB backend target group
  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  # Wait for the EC2 instance to be ready before placing tasks
  depends_on = [aws_instance.ecs_host, aws_lb_listener.http]

  tags = {
    Name = "${var.project_name}-backend-service"
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "EC2"

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_instance.ecs_host, aws_lb_listener.http]

  tags = {
    Name = "${var.project_name}-frontend-service"
  }
}
