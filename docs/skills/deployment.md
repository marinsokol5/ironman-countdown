# Deployment Skill

## Overview

This skill provides deployment guidance for AWS applications using two primary methods:
1. **Local Development Deployment** - Deploy to personal preview environment for testing
2. **CI/CD Pipeline Deployment** - Deploy to test/production environments via git push

## Local Development Deployment

### Prerequisites
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- CDK infrastructure code generated (via `run-deployment-assistant`)
- `scripts/deploy.sh` exists and is executable

### Deployment Process

#### 1. Determine if First Deployment
- Learn about CDK stack names in `infra` folder
- You MUST verify if this is the first deployment by querying existing stacks `aws cloudformation describe-stacks --stack-name <StackName>-<environment>`

#### 2. Check Deployment Script
- Check that `scripts/deploy.sh` exists in the project root
- Verify the script is executable: `chmod +x scripts/deploy.sh`
- Review the script to ensure it matches your application type

#### 3. Initialize Application Secrets (First Deployment Only, If Secrets Detected)

**Only if this is a first deployment AND secrets are detected**, you MUST:
- Verify `scripts/manage-secrets.cjs` exists and is executable: `chmod +x scripts/manage-secrets.cjs`
- Check if the secret already exists by running `aws secretsmanager describe-secret --secret-id `<AppName>/<environment>/secrets`
- If the secret does not exist initialize all known secret keys with TBD values using:
  ```bash
  ./scripts/manage-secrets.cjs init '{"SECRET_KEY_1":"TBD","SECRET_KEY_2":"TBD"}'
  ```

#### 4. Request User Confirmation (First Deployment Only)

**CRITICAL - Pricing Disclaimer:**
- DO NOT provide any cost estimates, pricing information, or monthly cost projections
- DO NOT discuss or speculate about AWS service costs
- If user asks about costs, redirect them to AWS Pricing Calculator: https://calculator.aws

**Only if this is a first deployment**, you MUST:
- Inform the user that the deployment will create AWS resources that may incur costs
- Include this disclaimer: "AWS pricing varies based on usage patterns, selected regions, and specific configurations. For accurate cost estimates tailored to your requirements, please use the AWS Pricing Calculator: https://calculator.aws"
- List the AWS resources that will be created (S3 buckets, CloudFront distribution, Lambda functions, API Gateway, etc.)
- **CRITICAL** If any AWS resources will be publicly accessible (Lambda functions without auth, public S3 buckets, open API endpoints), warn user with specific resource names and access paths

**If secrets were initialized**, you MUST:
- Inform the user they need to fill in secret values before deployment
- Provide two options:
  1. **Terminal**: Run `./scripts/manage-secrets.cjs update-all` to fill in values interactively
  2. **AWS Console**: Use this link to edit secrets directly:
     `https://us-east-1.console.aws.amazon.com/secretsmanager/secret?name=<SecretName>&region=<Region>`
     (Replace `<SecretName>` with actual secret name like `AppName/preview-username/secrets` and `<Region>` with deployment region)

**Finally**:
- Ask the user to explicitly confirm they want to proceed with the deployment (if secrets were initialized, include confirmation that they have filled in all secret values)
- Wait for user confirmation before proceeding to the next step
- If the user declines, stop the deployment process and provide instructions for manual deployment

#### 5. Execute Deployment
You MUST:
- Run the deployment script: `./scripts/deploy.sh [environment]`
- Monitor the deployment progress
- Capture outputs:
  - Frontend URL (CloudFront distribution or Amplify URL)
  - API Gateway URL (if applicable)
  - Load Balancer URL (if applicable)
  - Service URL (App Runner, if applicable)
  - CloudFront Distribution ID (if applicable)
  - Secrets ARN (if applicable)
  - ECR Repository URI (if applicable)

### Environment Strategy
- **Preview**: `preview-${whoami}` - Personal preview environment (default)
- Automatically isolated per developer
- Safe for experimentation and testing

## CI/CD Pipeline Deployment

### Prerequisites
- CI/CD pipeline created and connected to git repository

### Deployment Process

A CodePipeline has been connected to your git repository. To deploy changes:

1. **Check for uncommitted changes**
   ```bash
   git status
   ```

2. **Commit changes if needed**
   - If there are uncommitted changes, ask the user if they want to commit them
   - If yes, commit the changes with an appropriate message

3. **Push to trigger deployment**
   ```bash
   git push
   ```

## Cleanup

**Important** Never use `--force` / `-f` flags with `cdk destroy`.

### Remove Personal Preview Environment
```bash
cd infra
cdk destroy --all
```

### Remove Pipeline (if exists)
```bash
cd infra
cdk destroy --context pipelineOnly=true --context codeConnectionArn=test
```

## Troubleshooting

### Common Issues
- **CDK Bootstrap Required**: Run `cdk bootstrap` if deployment fails
- **Permission Errors**: Verify AWS credentials and IAM permissions
- **Resource Limits**: Check AWS service quotas in target region
- **Name Conflicts**: Ensure resource names are unique across environments

### Deployment Verification
- Check CloudFormation stacks in AWS Console
- Verify all outputs are captured correctly
- Test application functionality thoroughly
- Monitor CloudWatch logs for errors

