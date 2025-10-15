# Amazon Web Services (AWS) Deployment

Deploy JobSentinel to AWS using Lambda, ECS, or EC2.

## Deployment Options

### Option 1: Lambda + EventBridge (Recommended)

**Best for:** Serverless, scheduled execution, minimal cost

**Architecture:**
```
EventBridge (Cron) → Lambda Function → DynamoDB/RDS
                            ↓
                      Slack Webhooks
```

**Cost:** ~$5-10/month

### Option 2: ECS Fargate

**Best for:** Containerized deployments, auto-scaling

**Cost:** ~$15-30/month

### Option 3: EC2

**Best for:** Full control, persistent instance

**Cost:** ~$10-25/month (t3.small spot instance)

## Prerequisites

1. **AWS Account**: https://aws.amazon.com/
2. **AWS CLI**:
   ```bash
   # Install
   curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
   sudo installer -pkg AWSCLIV2.pkg -target /
   
   # Configure
   aws configure
   ```

3. **Terraform** (optional, for infrastructure as code)
4. **Docker** (for ECS deployments)

## Lambda Deployment

### 1. Package Application

```bash
# Create deployment package
cd /path/to/JobSentinel

# Install dependencies to package directory
pip install -r requirements.txt -t package/
cp -r src package/

# Create ZIP
cd package && zip -r ../jobsentinel-lambda.zip . && cd ..
```

### 2. Create Lambda Function

```bash
# Create execution role
aws iam create-role \
  --role-name jobsentinel-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name jobsentinel-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create function
aws lambda create-function \
  --function-name jobsentinel \
  --runtime python3.12 \
  --handler jsa.cli.lambda_handler \
  --role arn:aws:iam::ACCOUNT_ID:role/jobsentinel-lambda-role \
  --zip-file fileb://jobsentinel-lambda.zip \
  --timeout 900 \
  --memory-size 1024 \
  --environment Variables="{
    SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL},
    DATABASE_URL=${DATABASE_URL},
    LOG_LEVEL=INFO
  }"
```

### 3. Schedule with EventBridge

```bash
# Create rule (every 2 hours)
aws events put-rule \
  --name jobsentinel-schedule \
  --schedule-expression "rate(2 hours)" \
  --state ENABLED

# Add Lambda permission
aws lambda add-permission \
  --function-name jobsentinel \
  --statement-id jobsentinel-eventbridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:REGION:ACCOUNT_ID:rule/jobsentinel-schedule

# Add target
aws events put-targets \
  --rule jobsentinel-schedule \
  --targets "Id"="1","Arn"="arn:aws:lambda:REGION:ACCOUNT_ID:function:jobsentinel"
```

## ECS Fargate Deployment

### 1. Build and Push Docker Image

```bash
# Build image
docker build -f ../../docker/Dockerfile -t jobsentinel:latest ../../..

# Tag for ECR
aws ecr create-repository --repository-name jobsentinel
docker tag jobsentinel:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/jobsentinel:latest

# Login to ECR
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com

# Push
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/jobsentinel:latest
```

### 2. Create ECS Task Definition

```bash
# Create task-definition.json
cat > task-definition.json <<EOF
{
  "family": "jobsentinel",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "jobsentinel",
    "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/jobsentinel:latest",
    "essential": true,
    "environment": [
      {"name": "LOG_LEVEL", "value": "INFO"}
    ],
    "secrets": [
      {"name": "SLACK_WEBHOOK_URL", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:slack-webhook-XXX"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/jobsentinel",
        "awslogs-region": "REGION",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
EOF

# Register task
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 3. Schedule with EventBridge

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name jobsentinel-cluster

# Create EventBridge rule to run ECS task
aws events put-rule \
  --name jobsentinel-ecs-schedule \
  --schedule-expression "rate(2 hours)"

# Add ECS target
aws events put-targets \
  --rule jobsentinel-ecs-schedule \
  --targets file://targets.json
```

## EC2 Deployment

### 1. Launch Instance

```bash
# Create security group
aws ec2 create-security-group \
  --group-name jobsentinel-sg \
  --description "JobSentinel security group"

# Allow SSH
aws ec2 authorize-security-group-ingress \
  --group-name jobsentinel-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Launch instance (spot for 60-70% discount)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-groups jobsentinel-sg \
  --instance-market-options MarketType=spot
```

### 2. Setup on Instance

```bash
# SSH to instance
ssh -i your-key.pem ubuntu@INSTANCE_IP

# Run setup
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel/deploy/local/linux
chmod +x setup.sh
./setup.sh
```

## Secrets Management

### AWS Secrets Manager

```bash
# Store Slack webhook
aws secretsmanager create-secret \
  --name jobsentinel/slack-webhook \
  --secret-string "${SLACK_WEBHOOK_URL}"

# Store Reed API key
aws secretsmanager create-secret \
  --name jobsentinel/reed-api-key \
  --secret-string "${REED_API_KEY}"

# Retrieve in code
aws secretsmanager get-secret-value \
  --secret-id jobsentinel/slack-webhook \
  --query SecretString \
  --output text
```

## Monitoring

### CloudWatch Logs

```bash
# View logs
aws logs tail /aws/lambda/jobsentinel --follow

# Create metric filter
aws logs put-metric-filter \
  --log-group-name /aws/lambda/jobsentinel \
  --filter-name ErrorCount \
  --filter-pattern "ERROR" \
  --metric-transformations \
    metricName=Errors,metricNamespace=JobSentinel,metricValue=1
```

### CloudWatch Alarms

```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name jobsentinel-high-errors \
  --alarm-description "Alert when error rate is high" \
  --metric-name Errors \
  --namespace JobSentinel \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT_ID:alerts
```

## Cost Optimization

### 1. Use Spot Instances
- EC2 Spot: 60-70% discount
- Fargate Spot: 70% discount

### 2. Right-Size Resources
```bash
# Lambda: Start with 512MB, monitor and adjust
# ECS: Start with 512 CPU / 1024 Memory
```

### 3. Schedule Wisely
```bash
# Run during off-peak hours (fewer Lambda invocations)
# Use EventBridge schedules to control frequency
```

### 4. Enable Cost Anomaly Detection
```bash
aws ce put-anomaly-monitor \
  --anomaly-monitor Name=JobSentinel,MonitorType=DIMENSIONAL
```

## Cost Breakdown

### Lambda + EventBridge
- Lambda invocations: 2M free/month
- Lambda compute: $0.0000166667/GB-second
- EventBridge: $1.00/million events
- **Estimated:** $5-10/month

### ECS Fargate
- vCPU: $0.04048/hour
- Memory: $0.004445/GB/hour
- **Estimated (0.5 vCPU, 1GB, 12 runs/day):** $15-30/month

### EC2 t3.small
- On-demand: $0.0208/hour = $15/month
- Spot: ~$5-7/month (60-70% discount)
- **Estimated:** $10-25/month

## Security Best Practices

1. **Use IAM Roles** (not access keys)
2. **Enable VPC** for Lambda/Fargate
3. **Secrets Manager** for sensitive data
4. **Encrypt at rest** (EBS, S3)
5. **CloudTrail** for audit logs
6. **Security Hub** for compliance

## Troubleshooting

### Lambda timeout
```bash
# Increase timeout (max 15 minutes)
aws lambda update-function-configuration \
  --function-name jobsentinel \
  --timeout 900
```

### Out of memory
```bash
# Increase memory
aws lambda update-function-configuration \
  --function-name jobsentinel \
  --memory-size 2048
```

### Permission errors
```bash
# Check IAM role permissions
aws iam get-role --role-name jobsentinel-lambda-role
aws iam list-attached-role-policies --role-name jobsentinel-lambda-role
```

## Support

- [AWS Documentation](https://docs.aws.amazon.com/)
- [Deployment Guide](../../../../docs/DEPLOYMENT_GUIDE.md)
- [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)

---

**Provider:** Amazon Web Services (AWS)  
**Last Updated:** October 14, 2025  
**Estimated Cost:** $5-30/month depending on option  
**Status:** Ready for deployment
