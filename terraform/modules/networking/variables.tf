variable "project_name" {
  type    = string
  default = "cloudledger"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "tags" {
  type    = map(string)
  default = {}
}
