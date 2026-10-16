variable "project_name" {
  type        = string
  description = "Project name prefix"
  default     = "cloudledger"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "dev"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
