import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Reference existing Secrets Manager secret
    const appSecrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AppSecrets",
      `IronmanCountdown/${environment}/secrets`
    );

    // Lambda execution role
    const lambdaRole = new iam.Role(this, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: `Lambda execution role for ${id}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
      inlinePolicies: {
        SecretsAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["secretsmanager:GetSecretValue"],
              resources: [`${appSecrets.secretArn}*`],
            }),
          ],
        }),
      },
    });

    const runtime = lambda.Runtime.NODEJS_LATEST;

    // Estimate Race Time Lambda function
    const estimateRaceTimeFunction = new lambda.Function(
      this,
      "EstimateRaceTimeFunction",
      {
        functionName: `${id}-estimate-race-time`,
        runtime: runtime,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda/estimate-race-time")
        ),
        role: lambdaRole,
        environment: {
          ENVIRONMENT: environment,
          SECRETS_ARN: appSecrets.secretArn,
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        description: `Estimate race time function for ${environment}`,
      }
    );

    // Extract Workout Lambda function
    const extractWorkoutFunction = new lambda.Function(
      this,
      "ExtractWorkoutFunction",
      {
        functionName: `${id}-extract-workout`,
        runtime: runtime,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda/extract-workout")
        ),
        role: lambdaRole,
        environment: {
          ENVIRONMENT: environment,
          SECRETS_ARN: appSecrets.secretArn,
        },
        timeout: cdk.Duration.seconds(60),
        memorySize: 1024,
        description: `Extract workout function for ${environment}`,
      }
    );

    // Calculate Statistics Lambda function
    const calculateStatisticsFunction = new lambda.Function(
      this,
      "CalculateStatisticsFunction",
      {
        functionName: `${id}-calculate-statistics`,
        runtime: runtime,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda/calculate-statistics")
        ),
        role: lambdaRole,
        environment: {
          ENVIRONMENT: environment,
          SECRETS_ARN: appSecrets.secretArn,
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        description: `Calculate statistics function for ${environment}`,
      }
    );

    // Log retention for Lambda functions
    const logRetention = environment === "prod" 
      ? logs.RetentionDays.TEN_YEARS 
      : logs.RetentionDays.ONE_WEEK;
    
    const logRemovalPolicy = environment === "prod"
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    new logs.LogRetention(this, "EstimateRaceTimeLogRetention", {
      logGroupName: `/aws/lambda/${id}-estimate-race-time`,
      retention: logRetention,
      removalPolicy: logRemovalPolicy,
    });

    new logs.LogRetention(this, "ExtractWorkoutLogRetention", {
      logGroupName: `/aws/lambda/${id}-extract-workout`,
      retention: logRetention,
      removalPolicy: logRemovalPolicy,
    });

    new logs.LogRetention(this, "CalculateStatisticsLogRetention", {
      logGroupName: `/aws/lambda/${id}-calculate-statistics`,
      retention: logRetention,
      removalPolicy: logRemovalPolicy,
    });

    // API Gateway with CORS
    const apiLogGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/aws/apigateway/${id}`,
      retention: logRetention,
      removalPolicy: logRemovalPolicy,
    });

    const api = new apigateway.RestApi(this, "Api", {
      restApiName: id,
      description: `Serverless API for ${id}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "x-client-info",
          "apikey",
        ],
      },
      deployOptions: {
        stageName: "v1",
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
    });

    // Lambda integrations
    const estimateRaceTimeIntegration = new apigateway.LambdaIntegration(
      estimateRaceTimeFunction,
      {
        proxy: true,
        allowTestInvoke: true,
      }
    );

    const extractWorkoutIntegration = new apigateway.LambdaIntegration(
      extractWorkoutFunction,
      {
        proxy: true,
        allowTestInvoke: true,
      }
    );

    const calculateStatisticsIntegration = new apigateway.LambdaIntegration(
      calculateStatisticsFunction,
      {
        proxy: true,
        allowTestInvoke: true,
      }
    );

    // API routes
    const estimateRaceTime = api.root.addResource("estimate-race-time");
    estimateRaceTime.addMethod("POST", estimateRaceTimeIntegration);

    const extractWorkout = api.root.addResource("extract-workout");
    extractWorkout.addMethod("POST", extractWorkoutIntegration);

    const calculateStatistics = api.root.addResource("calculate-statistics");
    calculateStatistics.addMethod("POST", calculateStatisticsIntegration);

    // Health check endpoint
    const health = api.root.addResource("health");
    health.addMethod(
      "GET",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": JSON.stringify({
                status: "healthy",
                timestamp: "$context.requestTime",
              }),
            },
          },
        ],
        requestTemplates: {
          "application/json": '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      }
    );

    this.apiUrl = api.url;

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
      exportName: `${id}-ApiUrl`,
    });

    new cdk.CfnOutput(this, "ApiId", {
      value: api.restApiId,
      description: "API Gateway ID",
      exportName: `${id}-ApiId`,
    });

    new cdk.CfnOutput(this, "SecretsArn", {
      value: appSecrets.secretArn,
      description: "Application Secrets ARN",
      exportName: `${id}-SecretsArn`,
    });

    cdk.Tags.of(this).add("Stack", "Backend");
    cdk.Tags.of(this).add("aws-mcp:deploy:type", "backend-lambda");
  }
}

