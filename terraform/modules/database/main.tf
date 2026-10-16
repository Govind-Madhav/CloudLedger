resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "${var.project_name}-rds-subnets-${var.environment}"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-rds-subnets-${var.environment}"
  })
}

resource "aws_db_instance" "postgresql" {
  identifier        = "${var.project_name}-db-${var.environment}"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  max_allocated_storage = 50
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "cloudledger_db"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [var.security_group_id]

  publicly_accessible = false
  skip_final_snapshot = true # Suitable for dev/academic lab; set false with final_snapshot_identifier for prod
  multi_az            = false # Single-AZ to minimize AWS lab costs

  tags = var.tags
}
