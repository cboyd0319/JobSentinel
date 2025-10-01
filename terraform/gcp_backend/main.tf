# Terraform configuration for creating the remote state backend.

provider "google" {}

variable "project_id" {
  description = "The GCP project ID where the state bucket will be created."
  type        = string
}

variable "state_bucket_name" {
  description = "The unique name for the GCS bucket that will store Terraform state."
  type        = string
}

# Create the GCS bucket for Terraform remote state.
resource "google_storage_bucket" "tf_state" {
  project                     = var.project_id
  name                        = var.state_bucket_name
  location                    = "US" # Multi-regional for high availability
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  # Enable versioning to keep history of state files and prevent accidental data loss.
  versioning {
    enabled = true
  }

  # Encrypt the bucket with Google-managed keys.
  encryption {
    default_kms_key_name = ""
  }

  # Prevent accidental deletion of the state bucket.
  lifecycle {
    prevent_destroy = true
  }
}
