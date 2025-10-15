resource "google_cloud_run_v2_job" "default" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    template {
      service_account = var.service_account_email

      vpc_access {
        connector = var.vpc_connector
        egress    = upper(replace(var.vpc_egress, "-", "_"))
      }

      max_retries = 1
      timeout     = "${var.timeout_seconds}s"

      containers {
        image = var.image

        resources {
          limits = {
            cpu    = tostring(var.cpu)
            memory = var.memory
          }
        }

        dynamic "env" {
          for_each = var.env_vars
          content {
            name  = env.key
            value = env.value
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      launch_stage,
    ]
  }
}
