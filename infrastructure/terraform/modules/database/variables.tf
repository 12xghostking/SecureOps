variable "environment" {
  type        = string
  description = "Target deployment environment"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where database security group resides"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Isolated database subnet IDs"
}

variable "allowed_app_cidrs" {
  type        = list(string)
  description = "CIDR blocks allowed to connect on port 5432"
}

variable "database_name" {
  type        = string
  description = "Initial PostgreSQL database name"
  default     = "secureops"
}

variable "admin_username" {
  type        = string
  description = "Database administrator username"
  default     = "secureops_admin"
}

variable "instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t4g.medium"
}

variable "allocated_storage" {
  type        = number
  description = "Initial allocated storage in GB"
  default     = 20
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage auto-scaling limit in GB"
  default     = 100
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ high availability failover"
  default     = false
}

variable "deletion_protection" {
  type        = bool
  description = "Enable termination protection"
  default     = false
}

variable "backup_retention_period" {
  type        = number
  description = "Backup retention period in days"
  default     = 7
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on destroy (true for local/dev)"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
