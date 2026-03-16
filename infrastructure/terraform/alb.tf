# infrastructure/terraform/alb.tf
# Application Load Balancer — Free tier: 750 hrs/month (12 months)
#
# Routing strategy — default to backend so /:shortCode redirects work:
#   Priority 10: /assets/*   → frontend (Vite-generated JS/CSS bundles)
#   Priority 20: /index.html → frontend
#   Priority 30: /api/*      → backend (explicit, also caught by default)
#   Default:     /*          → backend  (catches /:shortCode redirects)
#
# HTTPS: add an aws_lb_listener on port 443 + ACM cert when you have a domain.

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-alb"
  }
}


# ==========================================
# TARGET GROUPS
# ==========================================

# Frontend — Nginx serving React build on port 80
resource "aws_lb_target_group" "frontend" {
  name        = "${var.project_name}-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance" # EC2 launch type uses "instance", not "ip" (Fargate)

  health_check {
    path                = "/index.html"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-frontend-tg"
  }
}

# Backend — Express API on port 8000
resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-backend-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    path                = "/health" # Defined in server.js
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-backend-tg"
  }
}


# ==========================================
# HTTP LISTENER + ROUTING RULES
# ==========================================

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Default: all unmatched paths (including /:shortCode) go to backend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Vite static assets (JS/CSS bundles, hashed filenames)
resource "aws_lb_listener_rule" "frontend_assets" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  condition {
    path_pattern {
      values = ["/assets/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# React app entry point
resource "aws_lb_listener_rule" "frontend_index" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  condition {
    path_pattern {
      values = ["/", "/index.html"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# API routes (explicit, also covered by default but listed for clarity)
resource "aws_lb_listener_rule" "backend_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
