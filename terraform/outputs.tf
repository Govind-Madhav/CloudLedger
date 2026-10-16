output "rds_endpoint" {
  description = "Connection endpoint for Amazon RDS PostgreSQL"
  value       = module.database.db_instance_endpoint
}

output "rds_address" {
  description = "Hostname of the Amazon RDS PostgreSQL instance"
  value       = module.database.db_instance_address
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "collector_role_arn" {
  description = "IAM Role ARN for CloudLedger Boto3 collectors"
  value       = module.iam.collector_role_arn
}

output "cur_bucket_name" {
  description = "S3 bucket created for Cost and Usage Reports (if enabled)"
  value       = length(aws_s3_bucket.cur_bucket) > 0 ? aws_s3_bucket.cur_bucket[0].bucket : "Not enabled"
}
