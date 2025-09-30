output "service_name" {
  description = "The name of the deployed Cloud Run job."
  value       = google_cloud_run_v2_job.default.name
}

output "job_id" {
  description = "The full resource ID of the Cloud Run job."
  value       = google_cloud_run_v2_job.default.id
}
