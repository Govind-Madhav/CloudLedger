variable "project_name" {
  type        = string
  description = "Project name prefix"
  default     = "cloudledger"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  default     = "dev"
}

variable "aws_region" {
  type        = string
  description = "Target AWS Region"
  default     = "us-east-1"
}

variable "aws_account_id" {
  type        = string
  description = "AWS Account ID for S3 naming uniqueness"
  default     = "123456789012"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance size"
  default     = "db.t4g.micro"
}

variable "db_username" {
  type        = string
  description = "Database master username"
  default     = "cloudledger_admin"
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
  default     = "ChangeMeInProduction123!"
}

variable "enable_cur_bucket" {
  type        = bool
  description = "Whether to provision an S3 bucket for CUR 2.0 billing exports"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all provisioned resources"
  default = {
    Project     = "CloudLedger"
    ManagedBy   = "Terraform"
    Environment = "AcademicLab"
  }
}
