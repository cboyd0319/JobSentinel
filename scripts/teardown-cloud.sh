#!/bin/bash

set -euo pipefail

PROVIDER=$1

if [[ -z "$PROVIDER" ]]; then
  echo "Usage: $0 <provider>"
  exit 1
fi

case "$PROVIDER" in
  gcp)
    echo ""
    echo "⚠️  WARNING: This will DELETE all cloud resources!"
    echo ""
    echo "The following will be PERMANENTLY DELETED:"
    echo "  • Cloud Run Job (job-scraper)"
    echo "  • Storage bucket (all job data)"
    echo "  • Secrets (Slack webhook, user preferences)"
    echo "  • VPC network and connector"
    echo "  • Service accounts"
    echo "  • Budget alerts"
    echo "  • Cloud Scheduler jobs"
    echo ""
    echo "💡 NOTE: The GCP project itself will remain (just empty)."
    echo "   To delete the project too, run after this:"
    echo "   gcloud projects delete PROJECT_ID"
    echo ""
    read -p "Type 'yes delete everything' to confirm: " confirm
    echo ""

    if [[ "$confirm" != "yes delete everything" ]]; then
      echo "❌ Cancelled. Nothing was deleted."
      echo "✅ Your cloud resources are safe!"
      exit 0
    fi

    echo "🗑️  Destroying infrastructure..."
    echo ""
    cd terraform/gcp
    terraform destroy

    echo ""
    echo "✅ Teardown complete!"
    echo ""
    echo "📋 NEXT STEPS:"
    echo "1. Deleted resources will stop incurring costs immediately"
    echo "2. To fully delete the GCP project:"
    echo "   gcloud projects delete \$(gcloud config get-value project)"
    echo "3. Check remaining projects: gcloud projects list"
    ;;
  *)
    echo "Unsupported provider: $PROVIDER"
    exit 1
    ;;
esac
