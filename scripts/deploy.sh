#!/bin/bash

set -e

# Get environment from first argument, or default to preview-$(whoami)
ENVIRONMENT="${1:-preview-$(whoami)}"
# Optional: control asset deployment (defaults to true)
WITH_ASSETS="${WITH_ASSETS:-true}"

echo "Starting AWS CDK deployment to environment: $ENVIRONMENT"
echo "Asset deployment: $WITH_ASSETS"

# Check AWS CLI
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "AWS CLI not configured. Run 'aws configure' first."
    exit 1
fi

# Install CDK if needed
if ! command -v cdk &> /dev/null; then
    echo "Installing AWS CDK..."
    npm install --no-progress -g aws-cdk
fi

# Build frontend
if [ "$WITH_ASSETS" = "true" ]; then
    echo "Building frontend..."
    npm run build
else
    echo "Skipping frontend build (WITH_ASSETS=false)"
fi

# Install Lambda dependencies
echo "Installing Lambda dependencies..."
for lambda_dir in infra/lambda/*/; do
  if [ -d "$lambda_dir" ] && [ -f "$lambda_dir/package.json" ]; then
    echo "Installing Node.js dependencies for $(basename "$lambda_dir")..."
    cd "$lambda_dir"
    npm install --no-progress
    cd - > /dev/null
  fi
done

# Install CDK dependencies
echo "Installing CDK dependencies..."
cd infra
npm install --no-progress
npm run build

# Bootstrap CDK
echo "Bootstrapping CDK..."
cdk bootstrap --progress events

# Deploy stacks with environment context
echo "Deploying CDK stacks for environment: $ENVIRONMENT..."

# Build deploy command
DEPLOY_CMD=(cdk deploy --all --context "environment=$ENVIRONMENT" --require-approval never --progress events)

# Add withAssets=false if needed
if [ "$WITH_ASSETS" = "false" ]; then
    DEPLOY_CMD+=(--context withAssets=false)
fi

# Add hotswap for preview environments only
if [[ "$ENVIRONMENT" == "preview-"* ]]; then
    echo "Using hotswap deployment for faster development feedback..."
    DEPLOY_CMD+=(--hotswap-fallback)
else
    echo "Using standard deployment for shared environment..."
fi

# Execute deployment
"${DEPLOY_CMD[@]}"

# Get outputs
FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name "IronmanCountdownFrontend-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text 2>/dev/null || echo "")

API_URL=$(aws cloudformation describe-stacks \
    --stack-name "IronmanCountdownApi-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "IronmanCountdownFrontend-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text 2>/dev/null || echo "")

echo ""
echo "Deployment complete for environment: $ENVIRONMENT!"
if [ -n "$FRONTEND_URL" ]; then
    echo "Frontend URL: $FRONTEND_URL"
fi
if [ -n "$API_URL" ]; then
    echo "API URL: $API_URL"
fi
if [ -n "$DISTRIBUTION_ID" ]; then
    echo "CloudFront Distribution ID: $DISTRIBUTION_ID"
fi
echo ""
echo "Usage examples:"
echo "  ./scripts/deploy.sh                   # Deploy to preview-\$(whoami)"
echo "  ./scripts/deploy.sh dev               # Deploy to dev"
echo "  ./scripts/deploy.sh prod              # Deploy to production"
echo "  WITH_ASSETS=false ./scripts/deploy.sh # Deploy without updating assets"

