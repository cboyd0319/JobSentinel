provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable Google Cloud Run API
resource "google_project_service" "run_api" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# Enable Google Cloud Build API
resource "google_project_service" "cloudbuild_api" {
  project            = var.project_id
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# Enable Google Artifact Registry API
resource "google_project_service" "artifactregistry_api" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Enable Secret Manager API
resource "google_project_service" "secretmanager_api" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# VPC Network
resource "google_compute_network" "vpc_network" {
  project                 = var.project_id
  name                    = var.vpc_name
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

# Subnet for VPC Access Connector
resource "google_compute_subnetwork" "vpc_subnet" {
  project       = var.project_id
  name          = var.subnet_name
  ip_cidr_range = "10.0.0.0/28" # Small range for cost optimization
  region        = var.region
  network       = google_compute_network.vpc_network.self_link
}

# Enable Serverless VPC Access API
resource "google_project_service" "vpcaccess_api" {
  project            = var.project_id
  service            = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

# Serverless VPC Access Connector
resource "google_vpc_access_connector" "vpc_connector" {
  project        = var.project_id
  name           = var.connector_name
  region         = var.region
  network        = google_compute_network.vpc_network.name
  ip_cidr_range  = "10.8.0.0/28"
  min_throughput = 200
  max_throughput = 300
  min_instances  = 2
  max_instances  = 3

  depends_on = [
    google_compute_network.vpc_network,
    google_compute_subnetwork.vpc_subnet,
    google_project_service.vpcaccess_api,
  ]
}

# Cloud Storage Bucket for job data
resource "google_storage_bucket" "job_data_bucket" {
  project                     = var.project_id
  name                        = "${var.storage_bucket_name}-${var.project_id}"
  location                    = var.region
  uniform_bucket_level_access = true
  storage_class               = "STANDARD"

  autoclass {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age            = 90
      matches_prefix = ["backup/"]
    }
  }

  depends_on = [
    google_project_service.run_api
  ]
}

# Service Accounts
resource "google_service_account" "runtime_sa" {
  project      = var.project_id
  account_id   = var.runtime_sa_name
  display_name = "Cloud Run Job Runtime Service Account"
}

resource "google_service_account" "scheduler_sa" {
  project      = var.project_id
  account_id   = var.scheduler_sa_name
  display_name = "Cloud Scheduler Job Service Account"
}

# IAM Bindings for Runtime Service Account
resource "google_project_iam_member" "runtime_sa_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.runtime_sa.email}"
}

resource "google_project_iam_member" "runtime_sa_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.runtime_sa.email}"
}

resource "google_project_iam_member" "runtime_sa_storage_object_user" {
  project = var.project_id
  role    = "roles/storage.objectUser"
  member  = "serviceAccount:${google_service_account.runtime_sa.email}"
}

# IAM Bindings for Scheduler Service Account
resource "google_project_iam_member" "scheduler_sa_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

resource "google_project_iam_member" "scheduler_sa_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

# Secret Manager Secrets
resource "google_secret_manager_secret" "user_prefs_secret" {
  project   = var.project_id
  secret_id = var.prefs_secret_name

  replication {
    auto {}
  }

  depends_on = [
    google_project_service.secretmanager_api
  ]
}

resource "google_secret_manager_secret" "slack_webhook_secret" {
  project   = var.project_id
  secret_id = var.slack_webhook_secret_name

  replication {
    auto {}
  }

  depends_on = [
    google_project_service.secretmanager_api
  ]
}

# IAM for Secret Manager secrets (grant runtime SA access)
resource "google_secret_manager_secret_iam_member" "user_prefs_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.user_prefs_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "slack_webhook_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.slack_webhook_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime_sa.email}"
}

# Create an Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "${var.service_name_prefix}-${var.deployment_env}-repo"
  description   = "Docker repository for ${var.service_name_prefix} application in ${var.deployment_env} environment."
  format        = "DOCKER"
  project       = var.project_id

  depends_on = [
    google_project_service.artifactregistry_api
  ]
}

module "cloud_run" {
  source = "./modules/cloud_run"

  project_id            = var.project_id
  region                = var.region
  service_name          = "${var.service_name_prefix}-${var.deployment_env}"
  image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/${var.service_name_prefix}:latest"
  cpu                   = var.cloud_run_cpu
  memory                = var.cloud_run_memory
  max_instances         = var.cloud_run_max_instances
  timeout_seconds       = var.cloud_run_timeout_seconds
  concurrency           = var.cloud_run_concurrency
  service_account_email = google_service_account.runtime_sa.email
  vpc_connector         = google_vpc_access_connector.vpc_connector.id
  vpc_egress            = "all-traffic"
  env_vars = {
    DEPLOYMENT_ENV = var.deployment_env
    CLOUD_PROVIDER = "gcp"
    STORAGE_BUCKET = google_storage_bucket.job_data_bucket.name
  }

  depends_on = [
    google_artifact_registry_repository.docker_repo,
    google_vpc_access_connector.vpc_connector,
    google_project_service.vpcaccess_api,
    google_service_account.runtime_sa,
    google_project_iam_member.runtime_sa_invoker,
    google_project_iam_member.runtime_sa_logging,
    google_project_iam_member.runtime_sa_storage_object_user,
  ]
}

# Notification Channel for Alerts
resource "google_monitoring_notification_channel" "email_channel" {
  display_name = "Email Alert Channel"
  type         = "email"
  labels = {
    email_address = var.alert_email_address
  }
  project = var.project_id
}

# Alert Policy for Cloud Run Job Failures
resource "google_monitoring_alert_policy" "cloud_run_job_failures" {
  display_name = "Cloud Run Job Failures - ${var.service_name_prefix}-${var.deployment_env}"
  project      = var.project_id

  combiner = "OR"

  conditions {
    display_name = "Failed Cloud Run Job Executions"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_job\" AND resource.labels.job_name = \"${module.cloud_run.service_name}\" AND metric.type = \"run.googleapis.com/job/execution_count\" AND metric.labels.state = \"FAILED\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  alert_strategy {
    auto_close = "604800s"
  }

  notification_channels = [
    google_monitoring_notification_channel.email_channel.id
  ]

  documentation {
    content   = "This alert fires when a Cloud Run job execution fails. Investigate the Cloud Run job logs for details."
    mime_type = "text/markdown"
  }
}

# Billing Budget for Cost Tracking
resource "google_billing_budget" "job_scraper_budget" {
  billing_account = data.google_billing_account.account.id
  display_name    = "${var.service_name_prefix}-${var.deployment_env}-budget"

  amount {
    specified_amount {
      currency_code = "USD"
      units         = format("%d", var.budget_amount_usd)
    }
  }

  all_updates_rule {
    pubsub_topic   = google_pubsub_topic.budget_alerts.id
    schema_version = "1.0"
  }

  threshold_rules {
    threshold_percent = var.budget_alert_threshold_percent
    spend_basis       = "CURRENT_SPEND"
  }

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }
}

# Pub/Sub Topic for Budget Alerts
resource "google_pubsub_topic" "budget_alerts" {
  name    = "${var.service_name_prefix}-${var.deployment_env}-budget-alerts"
  project = var.project_id
}

# Note: Budget alerts are handled via Pub/Sub topic and Cloud Function
# The budget resource above will publish to the Pub/Sub topic when thresholds are exceeded
# The Cloud Function (deployed by Python bootstrap) will handle the alert and take action

# Data source for billing account ID
data "google_billing_account" "account" {
  billing_account = var.billing_account_id
  open            = true
}