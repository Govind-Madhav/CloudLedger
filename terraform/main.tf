terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = var.tags
  }
}

# 1. Networking Module (VPC & Private Subnets)
module "networking" {
  source       = "./modules/networking"
  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region
  vpc_cidr     = var.vpc_cidr
  tags         = var.tags
}

# 2. Database Module (Private Amazon RDS PostgreSQL 16)
module "database" {
  source            = "./modules/database"
  project_name      = var.project_name
  environment       = var.environment
  subnet_ids        = module.networking.private_subnet_ids
  security_group_id = module.networking.rds_security_group_id
  db_instance_class = var.db_instance_class
  db_username       = var.db_username
  db_password       = var.db_password
  tags              = var.tags
}

# 3. IAM Least-Privilege Collector Module
module "iam" {
  source       = "./modules/iam"
  project_name = var.project_name
  environment  = var.environment
  tags         = var.tags
}

# 4. Optional S3 Bucket for CUR 2.0 Reports
resource "aws_s3_bucket" "cur_bucket" {
  count         = var.enable_cur_bucket ? 1 : 0
  bucket        = "${var.project_name}-cur-${var.environment}-${var.aws_account_id}"
  force_destroy = false

  tags = merge(var.tags, {
    Purpose = "AWS Cost and Usage Reports 2.0 Export Storage"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cur_encryption" {
  count  = var.enable_cur_bucket ? 1 : 0
  bucket = aws_s3_bucket.cur_bucket[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
