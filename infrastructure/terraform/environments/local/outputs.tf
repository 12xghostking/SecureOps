output "vpc_id" {
  description = "Provisioned VPC ID"
  value       = module.networking.vpc_id
}

output "kubernetes_cluster_endpoint" {
  description = "EKS Cluster Control Plane API endpoint"
  value       = module.compute.cluster_endpoint
}

output "database_endpoint" {
  description = "PostgreSQL DB instance connection endpoint"
  value       = module.database.endpoint
}
