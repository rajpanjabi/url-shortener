# infrastructure/terraform/vpc.tf

# ==========================================
# 1. CREATE VPC (Your Private Network)
# ==========================================
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}


# ==========================================
# 2. CREATE INTERNET GATEWAY (Door to Internet)
# ==========================================
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# ==========================================
# 3. CREATE PUBLIC SUBNETS (For Load Balancer)
# ==========================================
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}


# ==========================================
# 4. CREATE PRIVATE SUBNETS (For Backend, RDS, Redis)
# ==========================================
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

# ==========================================
# 5. PUBLIC ROUTE TABLE (How to reach internet)
# ==========================================
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}


# ==========================================
# 6. PRIVATE ROUTE TABLE (No internet access)
# ==========================================
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  # NO ROUTES - Private subnets can't reach internet
  # This saves us the NAT Gateway cost!

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}



# ==========================================
# 7. ASSOCIATE PUBLIC ROUTE TABLE WITH PUBLIC SUBNETS
# ==========================================
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ==========================================
# 8. ASSOCIATE PRIVATE ROUTE TABLE WITH PRIVATE SUBNETS
# ==========================================
resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}