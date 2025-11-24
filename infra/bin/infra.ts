#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FrontendStack } from "../lib/stacks/frontend-stack";
import { ApiStack } from "../lib/stacks/api-stack";
import { execSync } from "child_process";

const app = new cdk.App();

// Environment detection
const getDefaultEnvironment = (): string => {
  try {
    const username = process.env.USER || execSync("whoami").toString().trim();
    return `preview-${username}`;
  } catch {
    return "preview-local";
  }
};

const environment =
  app.node.tryGetContext("environment") || getDefaultEnvironment();
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || "us-east-1";

// Build output path
const buildOutputPath = app.node.tryGetContext("buildPath") || "../dist";

// Create frontend stack
new FrontendStack(app, `IronmanCountdownFrontend-${environment}`, {
  env: { account, region },
  environment,
  buildOutputPath,
  description: `Static website hosting - ${environment}`,
});

// Create API stack
new ApiStack(app, `IronmanCountdownApi-${environment}`, {
  env: { account, region },
  environment,
  description: `Serverless API - ${environment}`,
});

// Global tags
cdk.Tags.of(app).add("Project", "IronmanCountdown");
cdk.Tags.of(app).add("ManagedBy", "CDK");
cdk.Tags.of(app).add("Environment", environment);
