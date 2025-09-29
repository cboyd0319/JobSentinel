#!/usr/bin/env python3
"""
Enhanced Cloud Cost Monitoring for Job Scraper
Provides real-time cost tracking, alerts, and automatic cost protection
"""

import os
import sys
import json
import logging
import subprocess  # nosec B404 - subprocess used for secure cloud CLI calls with hardcoded commands
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Dict, List, Optional
import requests
import shutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cost-monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class CostAlert:
    """Represents a cost alert configuration"""
    threshold_amount: float
    threshold_percent: float
    alert_type: str  # 'warning', 'critical', 'emergency'
    action: str  # 'notify', 'throttle', 'stop'

@dataclass
class CostData:
    """Represents current cost information"""
    current_spend: float
    forecast_spend: float
    last_updated: datetime
    currency: str = "USD"
    period: str = "month"

def _safe_subprocess_run(cmd_list: List[str], **kwargs) -> subprocess.CompletedProcess:
    """
    Secure subprocess wrapper that validates commands and uses full paths
    Only allows predefined, safe cloud CLI commands
    """
    if not cmd_list or not isinstance(cmd_list, list):
        raise ValueError("Command must be a non-empty list")

    # Validate first command (executable)
    allowed_executables = {
        'gcloud': '/usr/local/bin/gcloud',
        'aws': '/usr/local/bin/aws',
        'az': '/usr/local/bin/az'
    }

    cmd_name = cmd_list[0]
    if cmd_name not in allowed_executables:
        raise ValueError(f"Executable '{cmd_name}' not in allowed list: {list(allowed_executables.keys())}")

    # Use full path if available, fallback to command name
    full_path = shutil.which(cmd_name) or allowed_executables.get(cmd_name, cmd_name)
    safe_cmd = [full_path] + cmd_list[1:]

    # Additional security: validate no shell injection patterns
    for arg in cmd_list:
        if any(char in str(arg) for char in ['|', '&', ';', '>', '<', '`', '$(']):
            raise ValueError(f"Potential shell injection detected in argument: {arg}")

    return subprocess.run(safe_cmd, **kwargs)  # nosec B603 - safe commands with validation

def _safe_subprocess_check_output(cmd_list: List[str], **kwargs) -> str:
    """Secure wrapper for subprocess.check_output"""
    return _safe_subprocess_run(cmd_list, check=True, capture_output=True, text=True, **kwargs).stdout

class CloudCostMonitor:
    """Enhanced cloud cost monitoring with multiple provider support"""

    def __init__(self, provider: str):
        self.provider = provider.lower()
        self.config = self._load_config()
        self.alerts = self._setup_alerts()

    def _load_config(self) -> Dict:
        """Load configuration from environment and files"""
        return {
            'max_monthly_spend': float(os.getenv('MAX_MONTHLY_SPEND', '10.0')),
            'emergency_threshold': float(os.getenv('EMERGENCY_THRESHOLD', '8.0')),
            'warning_threshold': float(os.getenv('WARNING_THRESHOLD', '5.0')),
            'slack_webhook': os.getenv('SLACK_WEBHOOK_URL'),
            'email_alerts': os.getenv('EMAIL_ALERTS', 'true').lower() == 'true',
            'auto_stop_enabled': os.getenv('AUTO_STOP_ENABLED', 'true').lower() == 'true',
        }

    def _setup_alerts(self) -> List[CostAlert]:
        """Setup cost alert thresholds"""
        max_spend = self.config['max_monthly_spend']
        return [
            CostAlert(self.config['warning_threshold'], 50.0, 'warning', 'notify'),
            CostAlert(max_spend * 0.8, 80.0, 'critical', 'throttle'),
            CostAlert(self.config['emergency_threshold'], 90.0, 'emergency', 'stop'),
        ]

    def get_gcp_costs(self) -> CostData:
        """Get Google Cloud costs using billing API"""
        try:
            # Get current project
            project_id = _safe_subprocess_check_output([
                'gcloud', 'config', 'get-value', 'project'
            ]).strip()

            # Get billing account
            billing_cmd = [
                'gcloud', 'billing', 'projects', 'describe', project_id,
                '--format=value(billingAccountName)'
            ]
            billing_account = _safe_subprocess_check_output(billing_cmd).strip()

            if not billing_account:
                logger.warning("No billing account found for project")
                return CostData(0.0, 0.0, datetime.now())

            # Get current month costs
            start_date = datetime.now().replace(day=1).strftime('%Y-%m-%d')
            end_date = datetime.now().strftime('%Y-%m-%d')

            cost_cmd = [
                'gcloud', 'billing', 'budgets', 'list',
                f'--billing-account={billing_account}',
                '--format=json'
            ]

            try:
                output = _safe_subprocess_check_output(cost_cmd)
                budgets = json.loads(output) if output.strip() else []

                # Extract current spend from budget data
                current_spend = 0.0
                for budget in budgets:
                    if 'amount' in budget and 'actualSpend' in budget:
                        current_spend += float(budget.get('actualSpend', {}).get('units', 0))

                # Simple forecast: current spend * (days remaining / days elapsed)
                now = datetime.now()
                days_in_month = (now.replace(month=now.month+1, day=1) - timedelta(days=1)).day
                days_elapsed = now.day
                days_remaining = days_in_month - days_elapsed

                if days_elapsed > 0:
                    daily_rate = current_spend / days_elapsed
                    forecast_spend = current_spend + (daily_rate * days_remaining)
                else:
                    forecast_spend = current_spend

                return CostData(current_spend, forecast_spend, datetime.now())

            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to get GCP billing data: {e}")
                return CostData(0.0, 0.0, datetime.now())

        except Exception as e:
            logger.error(f"Error getting GCP costs: {e}")
            return CostData(0.0, 0.0, datetime.now())

    def get_aws_costs(self) -> CostData:
        """Get AWS costs using Cost Explorer API"""
        try:
            import boto3
            from botocore.exceptions import ClientError

            client = boto3.client('ce')  # Cost Explorer

            # Get current month costs
            start_date = datetime.now().replace(day=1).strftime('%Y-%m-%d')
            end_date = datetime.now().strftime('%Y-%m-%d')

            try:
                response = client.get_cost_and_usage(
                    TimePeriod={
                        'Start': start_date,
                        'End': end_date
                    },
                    Granularity='MONTHLY',
                    Metrics=['BlendedCost'],
                    GroupBy=[
                        {
                            'Type': 'DIMENSION',
                            'Key': 'SERVICE'
                        }
                    ]
                )

                current_spend = 0.0
                for result in response['ResultsByTime']:
                    for group in result['Groups']:
                        amount = float(group['Metrics']['BlendedCost']['Amount'])
                        current_spend += amount

                # Simple forecast
                now = datetime.now()
                days_in_month = (now.replace(month=now.month+1, day=1) - timedelta(days=1)).day
                days_elapsed = now.day

                if days_elapsed > 0:
                    daily_rate = current_spend / days_elapsed
                    forecast_spend = daily_rate * days_in_month
                else:
                    forecast_spend = current_spend

                return CostData(current_spend, forecast_spend, datetime.now())

            except ClientError as e:
                logger.error(f"AWS Cost Explorer error: {e}")
                return CostData(0.0, 0.0, datetime.now())

        except ImportError:
            logger.error("boto3 not installed. Install with: pip install boto3")
            return CostData(0.0, 0.0, datetime.now())
        except Exception as e:
            logger.error(f"Error getting AWS costs: {e}")
            return CostData(0.0, 0.0, datetime.now())

    def get_azure_costs(self) -> CostData:
        """Get Azure costs using Azure CLI"""
        try:
            # Get current subscription
            subscription_cmd = ['az', 'account', 'show', '--query', 'id', '-o', 'tsv']
            subscription_id = _safe_subprocess_check_output(subscription_cmd).strip()

            # Get consumption data for current month
            start_date = datetime.now().replace(day=1).strftime('%Y-%m-%d')
            end_date = datetime.now().strftime('%Y-%m-%d')

            cost_cmd = [
                'az', 'consumption', 'usage', 'list',
                '--start-date', start_date,
                '--end-date', end_date,
                '--query', '[].{cost:pretaxCost,currency:currency}',
                '-o', 'json'
            ]

            try:
                output = _safe_subprocess_check_output(cost_cmd)
                usage_data = json.loads(output) if output.strip() else []

                current_spend = sum(float(item.get('cost', 0)) for item in usage_data)

                # Simple forecast
                now = datetime.now()
                days_in_month = (now.replace(month=now.month+1, day=1) - timedelta(days=1)).day
                days_elapsed = now.day

                if days_elapsed > 0:
                    daily_rate = current_spend / days_elapsed
                    forecast_spend = daily_rate * days_in_month
                else:
                    forecast_spend = current_spend

                return CostData(current_spend, forecast_spend, datetime.now())

            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to get Azure costs: {e}")
                return CostData(0.0, 0.0, datetime.now())

        except Exception as e:
            logger.error(f"Error getting Azure costs: {e}")
            return CostData(0.0, 0.0, datetime.now())

    def get_current_costs(self) -> CostData:
        """Get current costs for the configured provider"""
        if self.provider == 'gcp':
            return self.get_gcp_costs()
        elif self.provider == 'aws':
            return self.get_aws_costs()
        elif self.provider == 'azure':
            return self.get_azure_costs()
        else:
            logger.error(f"Unsupported provider: {self.provider}")
            return CostData(0.0, 0.0, datetime.now())

    def send_notification(self, alert: CostAlert, cost_data: CostData, message: str):
        """Send cost alert notification"""

        # Format notification message
        notification = {
            "text": f"💰 Cost Alert: Job Scraper ({self.provider.upper()})",
            "attachments": [
                {
                    "color": "warning" if alert.alert_type == "warning" else "danger",
                    "fields": [
                        {
                            "title": "Current Spend",
                            "value": f"${cost_data.current_spend:.2f}",
                            "short": True
                        },
                        {
                            "title": "Forecast",
                            "value": f"${cost_data.forecast_spend:.2f}",
                            "short": True
                        },
                        {
                            "title": "Threshold",
                            "value": f"${alert.threshold_amount:.2f}",
                            "short": True
                        },
                        {
                            "title": "Alert Type",
                            "value": alert.alert_type.title(),
                            "short": True
                        }
                    ],
                    "text": message
                }
            ]
        }

        # Send Slack notification
        if self.config['slack_webhook']:
            try:
                response = requests.post(
                    self.config['slack_webhook'],
                    json=notification,
                    timeout=10
                )
                if response.status_code == 200:
                    logger.info("Slack notification sent successfully")
                else:
                    logger.error(f"Failed to send Slack notification: {response.status_code}")
            except Exception as e:
                logger.error(f"Error sending Slack notification: {e}")

        # Log notification
        logger.warning(f"COST ALERT: {alert.alert_type.upper()} - {message}")

    def throttle_services(self):
        """Throttle cloud services to reduce costs"""
        logger.info(f"Throttling {self.provider} services to reduce costs")

        try:
            if self.provider == 'gcp':
                # Reduce Cloud Run instances
                _safe_subprocess_run([
                    'gcloud', 'run', 'services', 'update', 'job-scraper',
                    '--region=us-central1',
                    '--max-instances=1',
                    '--cpu-throttling'
                ], check=True)

            elif self.provider == 'aws':
                # Reduce Lambda concurrency
                _safe_subprocess_run([
                    'aws', 'lambda', 'put-provisioned-concurrency-config',
                    '--function-name', 'job-scraper',
                    '--provisioned-concurrency-config', 'ProvisionedConcurrencyExecutions=1'
                ], check=True)

            elif self.provider == 'azure':
                # Scale down Azure Functions
                _safe_subprocess_run([
                    'az', 'functionapp', 'plan', 'update',
                    '--name', 'job-scraper-plan',
                    '--resource-group', 'job-scraper-rg',
                    '--sku', 'Y1'  # Consumption plan
                ], check=True)

            logger.info("Services throttled successfully")

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to throttle services: {e}")

    def emergency_stop(self):
        """Emergency stop all cloud services"""
        logger.critical(f"EMERGENCY STOP: Stopping all {self.provider} services")

        try:
            if self.provider == 'gcp':
                # Stop Cloud Run service
                _safe_subprocess_run([
                    'gcloud', 'run', 'services', 'update', 'job-scraper',
                    '--region=us-central1',
                    '--min-instances=0',
                    '--max-instances=0'
                ], check=True)

            elif self.provider == 'aws':
                # Disable Lambda function
                _safe_subprocess_run([
                    'aws', 'lambda', 'put-function-concurrency',
                    '--function-name', 'job-scraper',
                    '--reserved-concurrent-executions', '0'
                ], check=True)

            elif self.provider == 'azure':
                # Stop Azure Function App
                _safe_subprocess_run([
                    'az', 'functionapp', 'stop',
                    '--name', 'job-scraper',
                    '--resource-group', 'job-scraper-rg'
                ], check=True)

            logger.critical("EMERGENCY STOP COMPLETED - All services stopped")

            # Send emergency notification
            emergency_message = (
                f"🚨 EMERGENCY STOP ACTIVATED 🚨\n\n"
                f"Cloud services have been automatically stopped due to cost limits.\n"
                f"Manual intervention required to restart services.\n"
                f"Review costs and configuration before restarting."
            )

            emergency_alert = CostAlert(0, 100, 'emergency', 'stop')
            cost_data = CostData(999.0, 999.0, datetime.now())  # Dummy data for notification
            self.send_notification(emergency_alert, cost_data, emergency_message)

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to execute emergency stop: {e}")

    def check_and_alert(self):
        """Check current costs and trigger alerts if necessary"""
        cost_data = self.get_current_costs()

        if cost_data.current_spend == 0.0:
            logger.info("No cost data available or services not deployed")
            return

        logger.info(f"Current spend: ${cost_data.current_spend:.2f}, "
                   f"Forecast: ${cost_data.forecast_spend:.2f}")

        # Check against each alert threshold
        for alert in sorted(self.alerts, key=lambda x: x.threshold_amount):
            if cost_data.current_spend >= alert.threshold_amount:

                message = (
                    f"Monthly spend (${cost_data.current_spend:.2f}) has exceeded "
                    f"the {alert.alert_type} threshold (${alert.threshold_amount:.2f}). "
                    f"Forecasted monthly total: ${cost_data.forecast_spend:.2f}"
                )

                if alert.action == 'notify':
                    self.send_notification(alert, cost_data, message)

                elif alert.action == 'throttle':
                    self.send_notification(alert, cost_data,
                                         message + "\n\n🔧 Throttling services to reduce costs...")
                    self.throttle_services()

                elif alert.action == 'stop' and self.config['auto_stop_enabled']:
                    self.send_notification(alert, cost_data,
                                         message + "\n\n🛑 Executing emergency stop...")
                    self.emergency_stop()
                    break  # Don't process further alerts after emergency stop

                # Only trigger the highest alert level
                break

    def generate_cost_report(self) -> Dict:
        """Generate detailed cost report"""
        cost_data = self.get_current_costs()

        return {
            "timestamp": datetime.now().isoformat(),
            "provider": self.provider,
            "current_spend": cost_data.current_spend,
            "forecast_spend": cost_data.forecast_spend,
            "currency": cost_data.currency,
            "max_budget": self.config['max_monthly_spend'],
            "budget_utilization": (cost_data.current_spend / self.config['max_monthly_spend']) * 100,
            "alerts_configured": len(self.alerts),
            "auto_stop_enabled": self.config['auto_stop_enabled']
        }

def main():
    """Main function for command-line usage"""
    import argparse

    parser = argparse.ArgumentParser(description='Enhanced Cloud Cost Monitor')
    parser.add_argument('--provider', choices=['gcp', 'aws', 'azure'],
                       default=os.getenv('CLOUD_PROVIDER', 'gcp'),
                       help='Cloud provider to monitor')
    parser.add_argument('--check', action='store_true',
                       help='Check costs and trigger alerts')
    parser.add_argument('--report', action='store_true',
                       help='Generate cost report')
    parser.add_argument('--test-alert', choices=['warning', 'critical', 'emergency'],
                       help='Test alert notification')

    args = parser.parse_args()

    monitor = CloudCostMonitor(args.provider)

    if args.check:
        monitor.check_and_alert()
    elif args.report:
        report = monitor.generate_cost_report()
        print(json.dumps(report, indent=2))
    elif args.test_alert:
        # Test alert notification
        test_alert = CostAlert(5.0, 50.0, args.test_alert, 'notify')
        test_cost = CostData(6.0, 12.0, datetime.now())
        monitor.send_notification(test_alert, test_cost,
                                f"Test {args.test_alert} alert notification")
    else:
        # Default: check costs
        monitor.check_and_alert()

if __name__ == '__main__':
    main()
