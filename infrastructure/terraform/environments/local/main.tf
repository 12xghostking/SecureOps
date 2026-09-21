# Local / Development Reference Orchestration Root

module "networking" {
  source = "../../modules/networking"

  environment        = var.environment
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
  enable_nat_gateway = false # Cost-optimized for local/dev

  tags = {
    Environment = var.environment
    Component   = "Networking"
  }
}

module "compute" {
  source = "../../modules/compute"

  environment        = var.environment
  kubernetes_version = "1.30"
  subnet_ids         = module.networking.private_app_subnet_ids
  node_instance_type = "t3.medium"
  desired_node_count = 2
  min_node_count     = 1
  max_node_count     = 3

  tags = {
    Environment = var.environment
    Component   = "Compute"
  }
}

module "database" {
  source = "../../modules/database"

  environment             = var.environment
  vpc_id                  = module.networking.vpc_id
  subnet_ids              = module.networking.private_db_subnet_ids
  allowed_app_cidrs       = ["10.0.11.0/24", "10.0.12.0/24"]
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  multi_az                = false
  deletion_protection     = false
  backup_retention_period = 1
  skip_final_snapshot     = true

  tags = {
    Environment = var.environment
    Component   = "Database"
  }
}
