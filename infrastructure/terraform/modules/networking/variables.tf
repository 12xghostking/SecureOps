variable "environment" {
  type        = string
  description = "Target deployment environment (e.g., dev, stg, prod)"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for multi-AZ resiliency"
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public ingress subnets"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private application/kubernetes subnets"
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "private_db_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for isolated database subnets"
  default     = ["10.0.21.0/24", "10.0.22.0/24"]
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT gateway for private subnet outbound internet access"
  default     = true
}

variable "flow_log_destination_arn" {
  type        = string
  description = "ARN of CloudWatch Log Group for VPC Flow Logs"
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
