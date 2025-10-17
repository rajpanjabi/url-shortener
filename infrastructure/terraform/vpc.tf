# 1. CREATE THE VPC (Our Private Network)

resource "aws_vpc" "main" {
    cidr_block           = var.vpc_cidr          # 10.0.0.0/16
    enable_dns_hostnames = true                  # Containers get DNS names
    enable_dns_support   = true                  # DNS resolution works

    tags = {
        Name = "${var.project_name}-vpc"           # url-shortener-vpc
    }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id                    # Attach to our VPC

  tags = {
    Name = "${var.project_name}-igw"          # url-shortener-igw
  }
}


# 3. CREATE PUBLIC SUBNETS (For ALB)
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)  # Create 2 subnets
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true              # Auto-assign public IPs

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

# 4. CREATE PRIVATE SUBNETS (For Backend, RDS, Redis)
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
    Type = "Private"
  }
}