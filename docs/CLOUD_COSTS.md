# Cloud Costs

I keep the cloud workflow cheap by default because this project started as a budget-friendly weekend build. Here’s what I’ve seen in practice.

## Guardrails I always set up

- Billing alerts at $5, $10, and $15 before the bootstrapper even runs
- Single instance, 0.5 vCPU, 256Mi memory, 15-minute timeout
- Weekend pause and failure cutoffs baked into the scheduler

## What it actually costs me

- **Cloud Run (recommended)**: under $1/month with the hourly business-hours schedule
- **Cloud Run, aggressive (15 min 24/7)**: roughly $5–8/month
- **AWS Lambda**: still within the generous free tier for my workload; maybe $2–4/month if you crank it up
- **Azure Container Instances**: workable but tends to be a couple bucks more than GCP for the same job

If you want a totally free option, Oracle Cloud’s always-free tier or a small VPS both work fine; I just don’t keep dedicated scripts for them yet.

## How the bootstrapper keeps spending in check

1. Narrows the VPC connector to a /28 subnet and e2-micro nodes
2. Orders region prompts by price so `us-central1` is the default
3. Prints the per-schedule cost hints before you confirm anything
4. Drops budget alerts so you hear about surprises early

If you discover a cheaper profile or a better schedule, let me know in an issue and I’ll test it.
