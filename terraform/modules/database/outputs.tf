output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS PostgreSQL instance"
  value       = aws_db_instance.postgresql.endpoint
}

output "db_instance_address" {
  description = "The address of the RDS PostgreSQL instance"
  value       = aws_db_instance.postgresql.address
}

output "db_instance_id" {
  description = "The ID of the RDS PostgreSQL instance"
  value       = aws_db_instance.postgresql.id
}
