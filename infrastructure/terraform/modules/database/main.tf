# SecureOps Database Module (Hardened PostgreSQL)

# KMS Key for Database Storage Encryption at Rest
resource "aws_kms_key" "rds" {
  description             = "KMS Key for PostgreSQL Storage Encryption in ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${var.environment}-rds-kms-key"
  })
}

# DB Subnet Group (Strict Private Subnets Only)
resource "aws_db_subnet_group" "main" {
  name        = "${var.environment}-secureops-db-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Isolated database subnets with no internet route"

  tags = merge(var.tags, {
    Name = "${var.environment}-db-subnet-group"
  })
}

# Security Group for Database (Allows ingress ONLY from Application Subnets)
resource "aws_security_group" "db" {
  name_prefix = "${var.environment}-secureops-db-sg-"
  vpc_id      = var.vpc_id
  description = "Controls access to PostgreSQL database from Kubernetes workers"

  ingress {
    description = "PostgreSQL ingress from application subnets"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_app_cidrs
  }

  egress {
    description = "No outbound internet egress from database"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["127.0.0.1/32"] # Restricted loopback only
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-db-sg"
  })
}

# Parameter Group Enforcing TLS / SSL
resource "aws_db_parameter_group" "main" {
  name_prefix = "${var.environment}-secureops-pg16-"
  family      = "postgres16"
  description = "PostgreSQL 16 parameter group enforcing TLS and security defaults"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = var.tags
}

# Random Password Generator for RDS Root
resource "random_password" "db_password" {
  length  = 32
  special = false
}

# PostgreSQL DB Instance
resource "aws_db_instance" "main" {
  identifier_prefix = "${var.environment}-secureops-pg-"
  engine            = "postgres"
  engine_version    = "16.3"
  instance_class    = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = var.database_name
  username = var.admin_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  publicly_accessible = false # Hardened: No public IP
  multi_az            = var.multi_az
  deletion_protection = var.deletion_protection

  backup_retention_period    = var.backup_retention_period
  backup_window              = "03:00-04:00"
  maintenance_window         = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade = true
  skip_final_snapshot        = var.skip_final_snapshot
  final_snapshot_identifier  = "${var.environment}-secureops-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(var.tags, {
    Name = "${var.environment}-secureops-db"
  })
}
