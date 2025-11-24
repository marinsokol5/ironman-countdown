import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface CodeBuildRoleProps {
  allowSecretsManager?: boolean;
  allowS3Artifacts?: boolean;
  artifactsBucketArn?: string;
  allowCloudFormation?: boolean;
  allowCdkBootstrap?: boolean;
  additionalPolicies?: iam.PolicyStatement[];
}

export class CodeBuildRole extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: CodeBuildRoleProps = {}) {
    super(scope, id);

    const {
      allowSecretsManager = false,
      allowS3Artifacts = false,
      artifactsBucketArn,
      allowCloudFormation = false,
      allowCdkBootstrap = false,
      additionalPolicies = [],
    } = props;

    const statements: iam.PolicyStatement[] = [];

    // Secrets Manager access
    if (allowSecretsManager) {
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["secretsmanager:GetSecretValue"],
          resources: [
            `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:IronmanCountdown/*`,
          ],
        }),
      );
    }

    // S3 artifacts bucket access
    if (allowS3Artifacts && artifactsBucketArn) {
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "s3:GetObject",
            "s3:PutObject",
            "s3:ListBucket",
            "s3:GetBucketLocation",
          ],
          resources: [
            artifactsBucketArn,
            `${artifactsBucketArn}/*`,
          ],
        }),
      );
    }

    // CloudFormation access
    if (allowCloudFormation) {
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "cloudformation:DescribeStacks",
            "cloudformation:DescribeStackEvents",
            "cloudformation:DescribeStackResources",
            "cloudformation:GetTemplate",
            "cloudformation:CreateStack",
            "cloudformation:UpdateStack",
            "cloudformation:DeleteStack",
            "cloudformation:ValidateTemplate",
          ],
          resources: ["*"],
        }),
      );
    }

    // CDK Bootstrap permissions
    if (allowCdkBootstrap) {
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "cloudformation:*",
            "s3:*",
            "iam:*",
            "ssm:*",
            "sts:AssumeRole",
          ],
          resources: ["*"],
        }),
      );
    }

    // Add additional policies
    statements.push(...additionalPolicies);

    this.role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      description: `CodeBuild role for ${id}`,
      inlinePolicies: {
        CodeBuildPolicy: new iam.PolicyDocument({
          statements,
        }),
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchLogsFullAccess",
        ),
      ],
    });
  }
}

export class ArtifactsBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const account = cdk.Stack.of(this).account;
    const appName = "ironman-countdown";

    this.bucket = new s3.Bucket(this, "Bucket", {
      bucketName: `${appName}-pipeline-artifacts-${account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "DeleteOldArtifacts",
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });
  }
}

