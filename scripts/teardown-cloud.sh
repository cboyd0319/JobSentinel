#!/bin/bash

set -euo pipefail

PROVIDER=$1

if [[ -z "$PROVIDER" ]]; then
  echo "Usage: $0 <provider>"
  exit 1
fi

case "$PROVIDER" in
  gcp)
    echo "Deprovisioning GCP infrastructure using Terraform..."
    cd terraform/gcp
    terraform destroy
    ;;
  *)
    echo "Unsupported provider: $PROVIDER"
    exit 1
    ;;
esac
