"""Cloud Function to disable the job scheduler when a budget alert is received."""

import base64
import json
import os

from google.cloud import scheduler_v1


def budget_alert_handler(event, context):
    """Entry point for the budget alert Cloud Function."""
    print(f"Processing budget alert event: {context.event_id}")

    try:
        # The budget notification is in the 'data' field, base64-encoded.
        pubsub_message = base64.b64decode(event['data']).decode('utf-8')
        message_data = json.loads(pubsub_message)
        cost_amount = message_data.get('costAmount', 0)
        budget_amount = message_data.get('budgetAmount', 0)

        print(f"Budget alert details: Cost={cost_amount}, Budget={budget_amount}")

        # Check if the cost has exceeded the budget
        if cost_amount >= budget_amount:
            print("Cost has exceeded budget. Pausing scheduler job.")
            _pause_scheduler_job()
        else:
            print("Cost is within budget. No action taken.")

    except KeyError as e:
        print(f"Error: Missing expected key in budget alert data: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def _pause_scheduler_job():
    """Pauses the Cloud Scheduler job."""
    project_id = os.environ.get('GCP_PROJECT')
    location = os.environ.get('SCHEDULER_LOCATION')
    job_id = os.environ.get('SCHEDULER_JOB_ID')

    if not all([project_id, location, job_id]):
        print("Error: Missing required environment variables for scheduler job.")
        return

    try:
        client = scheduler_v1.CloudSchedulerClient()
        job_name = f"projects/{project_id}/locations/{location}/jobs/{job_id}"

        # Pause the job
        client.pause_job(name=job_name)
        print(f"Successfully paused scheduler job: {job_name}")

    except Exception as e:
        print(f"Error pausing scheduler job: {e}")
