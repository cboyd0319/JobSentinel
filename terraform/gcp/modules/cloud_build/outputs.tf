output "image_name_with_tag" {
  description = "The full image name with tag that Cloud Build will produce."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo_name}/${var.image_name}:latest"
}
