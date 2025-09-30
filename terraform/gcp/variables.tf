variable "project_id" {
  description = "The GCP project ID."
  type        = string
}

variable "region" {
  description = "The GCP region to deploy resources into."
  type        = string
  default     = "us-central1"
}

variable "deployment_env" {
  description = "The deployment environment (e.g., dev, staging, production)."
  type        = string
  default     = "dev"
}

variable "service_name_prefix" {
  description = "Prefix for the Cloud Run service name."
  type        = string
  default     = "job-scraper"
}

variable "cloud_run_cpu" {
  description = "CPU allocated to the Cloud Run service (e.g., 1, 2)."
  type        = number
  default     = 1
}

variable "cloud_run_memory" {
  description = "Memory allocated to the Cloud Run service (e.g., 512Mi, 1Gi)."
  type        = string
  default     = "512Mi"
}

variable "cloud_run_max_instances" {
  description = "Maximum number of instances for the Cloud Run service."
  type        = number
  default     = 1
}

variable "cloud_run_timeout_seconds" {
  description = "Timeout for the Cloud Run service in seconds."
  type        = number
  default     = 900
}

variable "cloud_run_concurrency" {
  description = "Maximum number of concurrent requests per instance."
  type        = number
  default     = 1
}

variable "source_repo" {
  description = "The URL of the source repository (e.g., 'owner/repo' for GitHub)."
  type        = string
}

variable "alert_email_address" {
  description = "Email address to send monitoring alerts to."
  type        = string
}

variable "billing_account_id" {
  description = "The ID of the Google Cloud Billing Account (e.g., '012345-678901-ABCDEF')."
  type        = string
}

variable "budget_amount_usd" {
  description = "The monthly budget amount in USD for cost alerts."
  type        = number
  default     = 5.0
}

variable "budget_alert_threshold_percent" {
  description = "The percentage of the budget amount at which to trigger a cost alert."
  type        = number
  default     = 0.9 # 90% of the budget
}

variable "vpc_name" {
  description = "Name for the VPC network."
  type        = string
  default     = "job-scraper-vpc"
}

variable "subnet_name" {
  description = "Name for the VPC subnet."
  type        = string
  default     = "job-scraper-subnet"
}

variable "connector_name" {
  description = "Name for the Serverless VPC Access connector."
  type        = string
  default     = "job-scraper-connector"
}

variable "storage_bucket_name" {
  description = "Name for the Cloud Storage bucket for job data."
  type        = string
  default     = "job-scraper-data" # Will be suffixed with project ID
}

variable "runtime_sa_name" {
  description = "Name for the Cloud Run job runtime service account."
  type        = string
  default     = "job-scraper-runner"
}

variable "scheduler_sa_name" {
  description = "Name for the Cloud Scheduler job service account."
  type        = string
  default     = "job-scraper-scheduler"
}

variable "prefs_secret_name" {
  description = "Name for the Secret Manager secret storing user preferences."
  type        = string
  default     = "job-scraper-prefs"
}

variable "slack_webhook_secret_name" {
  description = "Name for the Secret Manager secret storing the Slack webhook URL."
  type        = string
  default     = "job-scraper-slack-webhook-url"
}
