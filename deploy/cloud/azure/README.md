# Microsoft Azure Deployment

Deploy JobSentinel to Microsoft Azure using Container Instances, Functions, or Virtual Machines.

## Deployment Options

### Option 1: Azure Container Instances (ACI) - Recommended

**Best for:** Quick deployment, serverless containers, scheduled jobs

**Cost:** ~$10-20/month

### Option 2: Azure Functions

**Best for:** Event-driven, pay-per-execution, serverless

**Cost:** ~$5-15/month

### Option 3: Azure Virtual Machines

**Best for:** Full control, persistent instance

**Cost:** ~$15-30/month (B1s/B2s)

## Prerequisites

1. **Azure Account**: https://azure.microsoft.com/
2. **Azure CLI**:
   ```bash
   # macOS
   brew install azure-cli
   
   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   
   # Windows
   # Download from: https://aka.ms/installazurecliwindows
   
   # Login
   az login
   ```

3. **Docker** (for container deployments)
4. **Terraform** (optional)

## Azure Container Instances Deployment

### 1. Create Resource Group

```bash
# Create resource group
az group create \
  --name jobsentinel-rg \
  --location eastus

# Verify
az group show --name jobsentinel-rg
```

### 2. Build and Push Container

```bash
# Create Azure Container Registry
az acr create \
  --resource-group jobsentinel-rg \
  --name jobsentinelacr \
  --sku Basic

# Login to ACR
az acr login --name jobsentinelacr

# Build and push
cd /path/to/JobSentinel
docker build -f deploy/cloud/docker/Dockerfile -t jobsentinel:latest .
docker tag jobsentinel:latest jobsentinelacr.azurecr.io/jobsentinel:latest
docker push jobsentinelacr.azurecr.io/jobsentinel:latest
```

### 3. Deploy Container Instance

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show \
  --name jobsentinelacr \
  --query username \
  --output tsv)

ACR_PASSWORD=$(az acr credential show \
  --name jobsentinelacr \
  --query passwords[0].value \
  --output tsv)

# Create container instance
az container create \
  --resource-group jobsentinel-rg \
  --name jobsentinel \
  --image jobsentinelacr.azurecr.io/jobsentinel:latest \
  --registry-login-server jobsentinelacr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --cpu 1 \
  --memory 1 \
  --restart-policy OnFailure \
  --environment-variables \
    LOG_LEVEL=INFO \
  --secure-environment-variables \
    SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL}"
```

### 4. Schedule with Logic Apps

```bash
# Create Logic App for scheduling
az logic workflow create \
  --resource-group jobsentinel-rg \
  --location eastus \
  --name jobsentinel-scheduler \
  --definition '{
    "triggers": {
      "recurrence": {
        "type": "Recurrence",
        "recurrence": {
          "frequency": "Hour",
          "interval": 2
        }
      }
    },
    "actions": {
      "restart_container": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters(\"$connections\")[\"aci\"][\"connectionId\"]"
            }
          },
          "method": "post",
          "path": "/subscriptions/SUBSCRIPTION_ID/resourceGroups/jobsentinel-rg/providers/Microsoft.ContainerInstance/containerGroups/jobsentinel/restart"
        }
      }
    }
  }'
```

## Azure Functions Deployment

### 1. Create Function App

```bash
# Create storage account
az storage account create \
  --name jobsentinelstorage \
  --location eastus \
  --resource-group jobsentinel-rg \
  --sku Standard_LRS

# Create function app
az functionapp create \
  --resource-group jobsentinel-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --name jobsentinel-func \
  --storage-account jobsentinelstorage \
  --os-type Linux
```

### 2. Deploy Code

```bash
cd /path/to/JobSentinel

# Install Azure Functions Core Tools
# macOS
brew install azure-functions-core-tools@4

# Create function
func init --worker-runtime python
func new --name JobScraper --template "Timer trigger"

# Deploy
func azure functionapp publish jobsentinel-func
```

### 3. Configure Schedule

```bash
# Update function.json for schedule
cat > JobScraper/function.json <<EOF
{
  "scriptFile": "__init__.py",
  "bindings": [
    {
      "name": "mytimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 */2 * * *"
    }
  ]
}
EOF
```

## Azure Virtual Machines Deployment

### 1. Create VM

```bash
# Create VM
az vm create \
  --resource-group jobsentinel-rg \
  --name jobsentinel-vm \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

# Get public IP
az vm show \
  --resource-group jobsentinel-rg \
  --name jobsentinel-vm \
  --show-details \
  --query publicIps \
  --output tsv
```

### 2. Setup on VM

```bash
# SSH to VM
ssh azureuser@PUBLIC_IP

# Install dependencies and setup
curl -o- https://raw.githubusercontent.com/cboyd0319/JobSentinel/main/deploy/local/linux/setup.sh | bash
```

### 3. Configure Auto-Shutdown (Cost Saving)

```bash
# Enable auto-shutdown at 10 PM
az vm auto-shutdown \
  --resource-group jobsentinel-rg \
  --name jobsentinel-vm \
  --time 2200
```

## Secrets Management (Key Vault)

### Create Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name jobsentinel-vault \
  --resource-group jobsentinel-rg \
  --location eastus

# Store secrets
az keyvault secret set \
  --vault-name jobsentinel-vault \
  --name slack-webhook \
  --value "${SLACK_WEBHOOK_URL}"

az keyvault secret set \
  --vault-name jobsentinel-vault \
  --name reed-api-key \
  --value "${REED_API_KEY}"

# Grant access to container/function
az keyvault set-policy \
  --name jobsentinel-vault \
  --object-id IDENTITY_OBJECT_ID \
  --secret-permissions get list
```

### Access in Application

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://jobsentinel-vault.vault.azure.net/", credential=credential)

slack_webhook = client.get_secret("slack-webhook").value
```

## Monitoring

### Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app jobsentinel-insights \
  --location eastus \
  --resource-group jobsentinel-rg \
  --application-type web

# Get instrumentation key
az monitor app-insights component show \
  --app jobsentinel-insights \
  --resource-group jobsentinel-rg \
  --query instrumentationKey
```

### Log Analytics

```bash
# View container logs
az container logs \
  --resource-group jobsentinel-rg \
  --name jobsentinel

# Stream logs
az container attach \
  --resource-group jobsentinel-rg \
  --name jobsentinel
```

### Alerts

```bash
# Create alert for failures
az monitor metrics alert create \
  --name jobsentinel-failures \
  --resource-group jobsentinel-rg \
  --scopes /subscriptions/SUBSCRIPTION_ID/resourceGroups/jobsentinel-rg/providers/Microsoft.ContainerInstance/containerGroups/jobsentinel \
  --condition "count restartCount > 3" \
  --description "Alert when container restarts exceed 3"
```

## Cost Optimization

### 1. Use Spot VMs
```bash
# Deploy spot VM (60-80% discount)
az vm create \
  --resource-group jobsentinel-rg \
  --name jobsentinel-spot \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --priority Spot \
  --max-price -1
```

### 2. Schedule Container Instances
- Only run when needed
- Use Logic Apps for scheduling
- Delete when not in use

### 3. Use Consumption Plan
- Azure Functions: Pay per execution
- First 1M executions free

### 4. Enable Auto-Shutdown
```bash
az vm auto-shutdown --resource-group jobsentinel-rg --name jobsentinel-vm --time 2200
```

## Cost Breakdown

### Azure Container Instances
- **vCPU:** $0.0000125/second = ~$32/month (always on)
- **Memory:** $0.0000014/GB-second = ~$3.6/GB/month
- **Scheduled (4 hours/day):** ~$5-7/month
- **Estimated:** $10-20/month

### Azure Functions (Consumption)
- **Executions:** 1M free/month, then $0.20/M
- **Compute:** $0.000016/GB-s
- **Estimated:** $5-15/month

### Azure VM (B1s)
- **VM:** $0.0104/hour = ~$7.60/month
- **Storage:** $0.05/GB/month
- **Spot Instance:** ~$2-3/month
- **Estimated:** $10-30/month

## Security Best Practices

1. **Managed Identity**: Use for authentication
2. **Key Vault**: Store all secrets
3. **Network Security Groups**: Restrict inbound traffic
4. **Private Endpoints**: For Key Vault and ACR
5. **Azure Security Center**: Enable recommendations
6. **RBAC**: Least privilege access

## Troubleshooting

### Container won't start
```bash
# Check container events
az container show \
  --resource-group jobsentinel-rg \
  --name jobsentinel \
  --query instanceView.events

# Check logs
az container logs --resource-group jobsentinel-rg --name jobsentinel
```

### Function timeout
```bash
# Update timeout (max 10 minutes for consumption plan)
az functionapp config appsettings set \
  --resource-group jobsentinel-rg \
  --name jobsentinel-func \
  --settings "AzureWebJobsHostConfiguration__functionTimeout=00:10:00"
```

### Permission errors
```bash
# Check role assignments
az role assignment list \
  --assignee IDENTITY_OBJECT_ID \
  --resource-group jobsentinel-rg
```

## Cleanup

```bash
# Delete everything (when done testing)
az group delete --name jobsentinel-rg --yes --no-wait
```

## Support

- [Azure Documentation](https://docs.microsoft.com/azure/)
- [Deployment Guide](../../../../docs/DEPLOYMENT_GUIDE.md)
- [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)

---

**Provider:** Microsoft Azure  
**Last Updated:** October 14, 2025  
**Estimated Cost:** $5-30/month depending on option  
**Status:** Ready for deployment
