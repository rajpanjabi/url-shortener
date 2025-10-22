# variables.tf
# This file defines all configurable parameters
# Think of these as function parameters - you can change them without changing the code

# AWS Region - Where to create resources
variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"  # North Virginia (cheapest, most services)
}

# Environment Name
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

# Project Name - Used as prefix for all resource names
variable "project_name" {
  description = "Project name - prefixed to all resources"
  type        = string
  default     = "url-shortener"
}

# VPC CIDR Block - IP address range for our network
variable "vpc_cidr" {
  description = "CIDR block for VPC (10.0.0.0/16 = 65,536 IP addresses)"
  type        = string
  default     = "10.0.0.0/16"
}

# Availability Zones - Physical data centers
variable "availability_zones" {
  description = "AWS availability zones (different physical locations for redundancy)"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]  # 2 zones for high availability
}

# Database Username
variable "db_username" {
  description = "Master username for RDS database"
  type        = string
  default     = "postgres"
  sensitive   = true  # Won't show in logs
}

# Database Password
variable "db_password" {
  description = "Master password for RDS database"
  type        = string
  sensitive   = true  # Won't show in logs
}

# Backend Container Image
variable "container_image_backend" {
  description = "Docker image URL for backend (from ECR)"
  type        = string
  # No default - must be provided in terraform.tfvars
}

# Frontend Container Image
variable "container_image_frontend" {
  description = "Docker image URL for frontend (from ECR)"
  type        = string
  # No default - must be provided in terraform.tfvars
}