# Application Logging System

This project uses AWS CloudWatch for centralized logging of backend services and browser console logging for frontend debugging.

## CloudWatch Integration

Backend logs are automatically collected by AWS CloudWatch Logs. Log groups are created automatically when services are deployed.

## Specific Log Groups for This Application

### Lambda Functions

**Environment: preview-sokomari**

- Estimate Race Time: `/aws/lambda/IronmanCountdownApi-preview-sokomari-estimate-race-time`
- Extract Workout: `/aws/lambda/IronmanCountdownApi-preview-sokomari-extract-workout`
- Calculate Statistics: `/aws/lambda/IronmanCountdownApi-preview-sokomari-calculate-statistics`

### API Gateway

- API Logs: `/aws/apigateway/IronmanCountdownApi-preview-sokomari`

### CloudFront

- Distribution Logs: Stored in S3 bucket `ironmancountdownfrontend-preview-sokomari-logs-063402440748`
- Log Prefix: `cloudfront/preview-sokomari/`

### S3 Access Logs

- Website Bucket Logs: Stored in log bucket with prefix `s3/preview-sokomari/`

## Accessing Logs

**AWS CLI:**
```bash
# List log groups for your environment
aws logs describe-log-groups --region us-east-1 --log-group-name-prefix "/aws/lambda/IronmanCountdownApi-preview-sokomari"

# Get recent log events from a Lambda function
aws logs filter-log-events \
  --log-group-name "/aws/lambda/IronmanCountdownApi-preview-sokomari-estimate-race-time" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region us-east-1

# Get API Gateway logs
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/IronmanCountdownApi-preview-sokomari" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region us-east-1
```

## Quick Debugging Commands

### Check Recent Errors in Lambda Functions

**Estimate Race Time Function:**
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/IronmanCountdownApi-preview-sokomari-estimate-race-time" \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --filter-pattern "ERROR" \
  --region us-east-1
```

**Extract Workout Function:**
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/IronmanCountdownApi-preview-sokomari-extract-workout" \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --filter-pattern "ERROR" \
  --region us-east-1
```

**Calculate Statistics Function:**
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/IronmanCountdownApi-preview-sokomari-calculate-statistics" \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --filter-pattern "ERROR" \
  --region us-east-1
```

### Check API Gateway Errors

```bash
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/IronmanCountdownApi-preview-sokomari" \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --filter-pattern "4XX OR 5XX" \
  --region us-east-1
```

### View All Recent Logs from a Function

```bash
aws logs tail "/aws/lambda/IronmanCountdownApi-preview-sokomari-estimate-race-time" \
  --since 30m \
  --region us-east-1 \
  --follow
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
5. Verify API endpoint: `https://fv5r7xp8wd.execute-api.us-east-1.amazonaws.com/v1/`

## Common Error Scenarios

### Authentication Errors (401)
- **Symptom**: Lambda functions return 401 Unauthorized
- **Check**: Verify JWT token is being passed correctly in Authorization header
- **Debug**: Check Lambda logs for "No authorization header" or "Authentication failed" messages
- **Log Group**: `/aws/lambda/IronmanCountdownApi-preview-sokomari-estimate-race-time` or `extract-workout`

### Secrets Manager Errors
- **Symptom**: Lambda functions fail with "Secrets Manager" errors
- **Check**: Verify secret exists: `aws secretsmanager describe-secret --secret-id IronmanCountdown/preview-sokomari/secrets`
- **Debug**: Check Lambda execution role has Secrets Manager permissions
- **Log Group**: Any Lambda function log group

### Supabase Connection Errors
- **Symptom**: Functions fail to connect to Supabase
- **Check**: Verify SUPABASE_URL and SUPABASE_ANON_KEY in secrets
- **Debug**: Check Lambda logs for Supabase client initialization errors
- **Log Group**: `/aws/lambda/IronmanCountdownApi-preview-sokomari-estimate-race-time` or `calculate-statistics`

### Lovable AI API Errors
- **Symptom**: Extract workout function returns 429 or 402 errors
- **Check**: Verify LOVABLE_API_KEY in secrets and check API credits
- **Debug**: Check Lambda logs for "Rate limit exceeded" or "AI credits exhausted"
- **Log Group**: `/aws/lambda/IronmanCountdownApi-preview-sokomari-extract-workout`

## Troubleshooting Workflow

When encountering errors:
1. **Check API Gateway logs first** - Identify which endpoint failed and HTTP status code
2. **Check corresponding Lambda logs** - Find the specific error message and stack trace
3. **Verify secrets** - Ensure all required secrets are configured correctly
4. **Check browser console** - For frontend errors, check browser developer tools
5. **Test API endpoints directly** - Use curl or Postman to isolate backend vs frontend issues

## Environment-Specific Log Groups

For different environments, replace `preview-sokomari` with:
- `dev` for development environment
- `prod` for production environment
- `preview-{username}` for other preview environments

