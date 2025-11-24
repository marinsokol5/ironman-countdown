#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FrontendStack } from "../lib/stacks/frontend-stack";
import { ApiStack } from "../lib/stacks/api-stack";
import { PipelineStack } from "../lib/pipeline-stack";
import { execSync } from "child_process";

const app = new cdk.App();

// Get environment variables
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || "us-east-1";

// Get context values
const codeConnectionArn = app.node.tryGetContext("codeConnectionArn");
const repositoryName =
  app.node.tryGetContext("repositoryName") || "marinsokol5/ironman-countdown";
const branchName = app.node.tryGetContext("branchName") || "main";
const pipelineOnly = app.node.tryGetContext("pipelineOnly") === "true";

// Create infrastructure stacks only if not pipeline-only mode
if (!pipelineOnly) {
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
}

// Create pipeline stack (only if CodeConnection ARN is provided)
if (codeConnectionArn) {
  new PipelineStack(app, "IronmanCountdownPipelineStack", {
    env: { account, region },
    description: "CI/CD Pipeline for IronmanCountdown",
    codeConnectionArn,
    repositoryName,
    branchName,
  });
} else {
  console.warn(
    "⚠️  CodeConnection ARN not provided. Pipeline stack will not be created.",
  );
  console.warn(
    "   Create connection: See Step 1.9 in setup-codepipeline script",
  );
}

// Global tags
cdk.Tags.of(app).add("Project", "IronmanCountdown");
cdk.Tags.of(app).add("ManagedBy", "CDK");
