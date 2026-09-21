terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SecureOps"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}

module "networking" {
  source = "../../modules/networking"

  environment        = "dev"
  vpc_cidr           = "10.10.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
  enable_nat_gateway = true

  tags = {
    Environment = "dev"
  }
}

module "compute" {
  source = "../../modules/compute"

  environment        = "dev"
  kubernetes_version = "1.30"
  subnet_ids         = module.networking.private_app_subnet_ids
  node_instance_type = "t3.medium"
  desired_node_count = 2
  min_node_count     = 1
  max_node_count     = 4

  tags = {
    Environment = "dev"
  }
}

module "database" {
  source = "../../modules/database"

  environment             = "dev"
  vpc_id                  = module.networking.vpc_id
  subnet_ids              = module.networking.private_db_subnet_ids
  allowed_app_cidrs       = ["10.10.11.0/24", "10.10.12.0/24"]
  instance_class          = "db.t4g.medium"
  allocated_storage       = 30
  multi_az                = false
  deletion_protection     = false
  backup_retention_period = 7
  skip_final_snapshot     = true

  tags = {
    Environment = "dev"
  }
}

variable "aws_region" {
  type        = string
  description = "AWS deployment region"
  default     = "us-east-1"
}

output "vpc_id" {
  value = module.networking.vpc_id
}

output "kubernetes_cluster_endpoint" {
  value = module.compute.cluster_endpoint
}

output "database_endpoint" {
  value = module.database.endpoint
}
