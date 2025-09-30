resource "google_cloudbuild_trigger" "github_trigger" {
  project     = var.project_id
  name        = "${var.image_name}-build-trigger"
  description = "Trigger to build and push Docker image for ${var.image_name}"

  github {
    owner = split("/", var.source_repo)[0]
    name  = split("/", var.source_repo)[1]
    push {
      branch = var.branch_name
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t",
        "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo_name}/${var.image_name}:latest",
        "."
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo_name}/${var.image_name}:latest"
      ]
    }
  }

  filename = "cloudbuild.yaml" # This is a placeholder, as we are defining steps directly
}
