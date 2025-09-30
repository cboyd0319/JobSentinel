output "cloud_run_service_url" {
  description = "The URL of the deployed Cloud Run service."
  value       = module.cloud_run.service_url
}

output "project_id" {
  description = "The ID of the GCP project."
  value       = var.project_id
}

output "project_number" {
  description = "The number of the GCP project."
  value       = data.google_project.project.number
}

output "artifact_registry_repo_name" {
  description = "The name of the Artifact Registry Docker repository."
  value       = google_artifact_registry_repository.docker_repo.repository_id
}

output "cloud_run_job_name" {
  description = "The name of the deployed Cloud Run job."
  value       = module.cloud_run.service_name
}

output "cloud_build_image_name_with_tag" {
  description = "The full image name with tag from Cloud Build."
  value       = module.cloud_build.image_name_with_tag
}

output "budget_id" {
  description = "The ID of the created billing budget."
  value       = google_billing_budget.job_scraper_budget.budget_id
}

output "budget_pubsub_topic" {
  description = "The full resource name of the Pub/Sub topic for budget alerts."
  value       = google_pubsub_topic.budget_alerts.id
}

output "vpc_network_name" {
  description = "The name of the VPC network."
  value       = google_compute_network.vpc_network.name
}

output "vpc_subnet_name" {
  description = "The name of the VPC subnet."
  value       = google_compute_subnetwork.vpc_subnet.name
}

output "vpc_connector_id" {
  description = "The ID of the Serverless VPC Access connector."
  value       = google_vpc_access_connector.vpc_connector.id
}

output "storage_bucket_full_name" {
  description = "The full name of the Cloud Storage bucket."
  value       = google_storage_bucket.job_data_bucket.name
}

output "runtime_service_account_email" {
  description = "The email of the Cloud Run job runtime service account."
  value       = google_service_account.runtime_sa.email
}

output "scheduler_service_account_email" {
  description = "The email of the Cloud Scheduler job service account."
  value       = google_service_account.scheduler_sa.email
}

output "user_prefs_secret_id" {
  description = "The ID of the Secret Manager secret for user preferences."
  value       = google_secret_manager_secret.user_prefs_secret.secret_id
}

output "slack_webhook_secret_id" {
  description = "The ID of the Secret Manager secret for the Slack webhook URL."
  value       = google_secret_manager_secret.slack_webhook_secret.secret_id
}

data "google_project" "project" {
  project_id = var.project_id
}