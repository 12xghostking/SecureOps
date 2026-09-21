output "endpoint" {
  description = "The connection endpoint for the PostgreSQL database"
  value       = aws_db_instance.main.endpoint
}

output "address" {
  description = "The hostname of the PostgreSQL database"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "The database port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "The database name"
  value       = aws_db_instance.main.db_name
}

output "security_group_id" {
  description = "The security group ID of the database"
  value       = aws_security_group.db.id
}
