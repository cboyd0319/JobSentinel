variable "project_id" {
  description = "The GCP project ID."
  type        = string
}

variable "state_bucket_name" {
  description = "Name for the GCS bucket that will store Terraform state."
  type        = string
}
