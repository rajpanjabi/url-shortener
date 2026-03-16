# infrastructure/terraform/iam.tf
# IAM roles for ECS (EC2 launch type)
#
# Three roles are needed:
#   1. ec2_instance_role   — assumed by the EC2 host; lets the ECS agent register with the cluster
#   2. ecs_task_execution  — assumed by ECS to pull images from ECR and push logs to CloudWatch
#   3. ecs_task_role       — assumed by the running container (app-level AWS calls, if any)

# ==========================================
# 1. EC2 INSTANCE ROLE (for the ECS host)
# ==========================================

resource "aws_iam_role" "ec2_instance_role" {
  name = "${var.project_name}-ec2-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# Allows the ECS agent on the EC2 instance to register with ECS and manage tasks
resource "aws_iam_role_policy_attachment" "ec2_ecs_policy" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# Allows SSM Session Manager access — lets you shell into the instance without opening SSH port
resource "aws_iam_role_policy_attachment" "ec2_ssm_policy" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance profile wraps the role so it can be attached to an EC2 instance
resource "aws_iam_instance_profile" "ec2_instance_profile" {
  name = "${var.project_name}-ec2-instance-profile"
  role = aws_iam_role.ec2_instance_role.name
}


# ==========================================
# 2. ECS TASK EXECUTION ROLE
# ==========================================
# ECS uses this role (not the container) to:
#   - Pull the Docker image from ECR
#   - Create CloudWatch log groups and push container logs

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}


# ==========================================
# 3. ECS TASK ROLE
# ==========================================
# Assumed by the running container itself.
# This app doesn't need to call AWS APIs, so no policies are attached —
# add them here if you later need S3 access, SES, etc.

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}