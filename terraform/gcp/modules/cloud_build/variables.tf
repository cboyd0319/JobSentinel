variable "project_id" {
  description = "The GCP project ID."
  type        = string
}

variable "region" {
  description = "The GCP region."
  type        = string
}

variable "image_name" {
  description = "The name of the Docker image to build."
  type        = string
}

variable "source_repo" {
  description = "The URL of the source repository (e.g., GitHub, Cloud Source Repositories)."
  type        = string
}

variable "branch_name" {
  description = "The branch name to trigger builds on."
  type        = string
  default     = "main"
}

variable "artifact_registry_repo_name" {
  description = "The name of the Artifact Registry repository to push images to."
  type        = string
}
