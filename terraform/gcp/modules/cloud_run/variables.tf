variable "project_id" {
  description = "The GCP project ID."
  type        = string
}

variable "region" {
  description = "The GCP region to deploy resources into."
  type        = string
}

variable "service_name" {
  description = "The name of the Cloud Run service."
  type        = string
}

variable "image" {
  description = "The Docker image to deploy to Cloud Run."
  type        = string
}

variable "cpu" {
  description = "CPU allocated to the Cloud Run service."
  type        = number
}

variable "memory" {
  description = "Memory allocated to the Cloud Run service."
  type        = string
}

variable "max_instances" {
  description = "Maximum number of instances for the Cloud Run service."
  type        = number
}

variable "timeout_seconds" {
  description = "Timeout for the Cloud Run service in seconds."
  type        = number
}

variable "concurrency" {
  description = "Maximum number of concurrent requests per instance."
  type        = number
}

variable "env_vars" {
  description = "Environment variables to pass to the Cloud Run service."
  type        = map(string)
  default     = {}
}
