# Application Logging System

This project uses AWS CloudWatch for centralized logging of backend services and browser console logging for frontend debugging.

## CloudWatch Integration

Backend logs are automatically collected by AWS CloudWatch Logs. Log groups are created automatically when services are deployed.

## Accessing Logs

**AWS CLI:**
```bash
# List log groups for your environment
aws logs describe-log-groups --region us-east-1

# Get recent log events
aws logs filter-log-events \
  --log-group-name "LOG_GROUP_NAME" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region us-east-1
```

## Frontend Debugging

**Browser Developer Tools:**
1. Open Developer Tools (F12)
2. Navigate to Console tab
3. Filter by log level (Info, Warning, Error)

**Network Tab for API Errors:**
1. Open Developer Tools → Network tab
2. Reproduce the error
3. Look for failed requests (red status codes)
4. Check response body for error details

## Troubleshooting

When encountering errors:
1. Check recent logs first using CLI time-filtered queries
2. Use browser network tab for API debugging
3. Check both frontend console and backend CloudWatch logs

For specific log group names and detailed debugging commands, this file will be updated after deployment with environment-specific information.

