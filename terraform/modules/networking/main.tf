resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-vpc-${var.environment}"
  })
}

# 2 Private subnets across 2 AZs for RDS PostgreSQL
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, 1) # 10.0.16.0/20
  availability_zone = "${var.aws_region}a"

  tags = merge(var.tags, {
    Name = "${var.project_name}-private-a-${var.environment}"
  })
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, 2) # 10.0.32.0/20
  availability_zone = "${var.aws_region}b"

  tags = merge(var.tags, {
    Name = "${var.project_name}-private-b-${var.environment}"
  })
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg-${var.environment}"
  description = "Controls database ingress traffic from authorized app resources only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "PostgreSQL ingress from within VPC CIDR"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}
