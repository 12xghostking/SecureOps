variable "aws_region" {
  type        = string
  description = "AWS region for provisioning"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Target environment name"
  default     = "local"
}
