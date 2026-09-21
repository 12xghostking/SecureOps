variable "environment" {
  type        = string
  description = "Target deployment environment"
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes control plane version"
  default     = "1.30"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for EKS control plane and worker nodes"
}

variable "endpoint_public_access" {
  type        = bool
  description = "Enable public API endpoint (restricted via CIDRs)"
  default     = false
}

variable "allowed_management_cidrs" {
  type        = list(string)
  description = "Allowed CIDRs for management access if public endpoint enabled"
  default     = []
}

variable "node_instance_type" {
  type        = string
  description = "EC2 instance type for worker nodes"
  default     = "t3.medium"
}

variable "desired_node_count" {
  type        = number
  description = "Desired number of worker nodes"
  default     = 2
}

variable "min_node_count" {
  type        = number
  description = "Minimum number of worker nodes"
  default     = 1
}

variable "max_node_count" {
  type        = number
  description = "Maximum number of worker nodes"
  default     = 5
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
