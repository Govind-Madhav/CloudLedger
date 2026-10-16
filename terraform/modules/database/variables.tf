variable "project_name" {
  type    = string
  default = "cloudledger"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for DB Subnet Group"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID for RDS"
}

variable "db_instance_class" {
  type        = string
  default     = "db.t4g.micro"
  description = "RDS PostgreSQL instance class"
}

variable "db_username" {
  type        = string
  default     = "cloudledger"
  description = "Database master username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Database master password"
}

variable "tags" {
  type    = map(string)
  default = {}
}
