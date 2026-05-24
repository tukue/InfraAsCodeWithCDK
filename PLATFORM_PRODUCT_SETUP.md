# Transforming InfraAsCodeWithCDK into a Platform Product with Backstage

## Overview

This guide documents the process of evolving the `InfraAsCodeWithCDK` project from a simple serverless application into a comprehensive **platform product** by integrating [Backstage](https://backstage.io/), Spotify's open-source developer portal platform, and a complete observability stack including Prometheus, Grafana, and related telemetry services.

## What is a Platform Product?

A platform product provides a unified, self-service experience for developers to discover, understand, and interact with all the tools, services, and infrastructure components they need. Instead of scattered documentation and manual processes, platform products offer:

- **Service Catalog**: Centralized registry of all services and APIs
- **Developer Portal**: Unified interface for accessing tools and documentation
- **Infrastructure as Code**: Automated provisioning and management
- **Observability Platform**: Comprehensive monitoring, metrics, and alerting
- **Golden Paths**: Standardized, opinionated workflows for common tasks
- **Self-Service Capabilities**: Developers can provision resources without waiting for operations teams

## Why Backstage?

Backstage addresses the core challenges of platform engineering:

- **Service Discovery**: Automatically discovers and catalogs services
- **Documentation Centralization**: Pulls docs from code repositories
- **Standardization**: Enforces consistent practices across teams
- **Developer Experience**: Reduces cognitive load and onboarding time
- **Scalability**: Grows with your organization without exponential complexity

## Current Application Architecture

The existing CDK application deploys:
- **API Gateway**: REST API endpoint
- **Lambda Function**: Serverless compute with Node.js runtime
- **DynamoDB Table**: NoSQL database for data persistence
- **CloudWatch**: Logging and monitoring

## Platform Product Transformation Steps

### Phase 1: Backstage Infrastructure Setup

#### 1.1 Add Backstage Dependencies

Update `package.json` to include Backstage-related CDK constructs:

```json
{
  "dependencies": {
    "@aws-cdk/aws-ecs": "^1.204.0",
    "@aws-cdk/aws-ecs-patterns": "^1.204.0",
    "@aws-cdk/aws-rds": "^1.204.0",
    "@aws-cdk/aws-elasticache": "^1.204.0",
    "aws-cdk-lib": "2.99.1",
    "constructs": "^10.0.0"
  }
}
```

#### 1.2 Create Backstage CDK Construct

Create a new construct file `lib/backstage-construct.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class BackstageConstruct extends Construct {
  public readonly serviceUrl: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // PostgreSQL database for Backstage
    const database = new rds.DatabaseInstance(this, 'BackstageDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.BURSTABLE3,
        cdk.aws_ec2.InstanceSize.MICRO
      ),
      vpc: // Reference existing VPC or create new one
      credentials: rds.Credentials.fromGeneratedSecret('backstage'),
      databaseName: 'backstage',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Redis cache for Backstage
    const cache = new elasticache.CfnCacheCluster(this, 'BackstageCache', {
      cacheNodeType: 'cache.t2.micro',
      engine: 'redis',
      numCacheNodes: 1,
    });

    // ECS Fargate service for Backstage
    const cluster = new ecs.Cluster(this, 'BackstageCluster', {
      vpc: // Same VPC as database
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BackstageTask', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    // Add Backstage container
    const container = taskDefinition.addContainer('BackstageContainer', {
      image: ecs.ContainerImage.fromRegistry('spotify/backstage:latest'),
      environment: {
        POSTGRES_HOST: database.dbInstanceEndpointAddress,
        POSTGRES_PORT: database.dbInstanceEndpointPort,
        POSTGRES_USER: 'backstage',
        REDIS_HOST: cache.attrRedisEndpointAddress,
        REDIS_PORT: cache.attrRedisEndpointPort,
      },
      secrets: {
        POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(
          database.secret!,
          'password'
        ),
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'backstage' }),
    });

    container.addPortMappings({
      containerPort: 7007,
      protocol: ecs.Protocol.TCP,
    });

    // Load balanced service
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackstageService', {
      cluster,
      taskDefinition,
      publicLoadBalancer: true,
    });

    this.serviceUrl = service.loadBalancer.loadBalancerDnsName;
  }
}
```

#### 1.3 Integrate Backstage into Main Stack

Update `lib/cdk-app-stack.ts` to include the Backstage construct:

```typescript
import { BackstageConstruct } from './backstage-construct';

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Existing infrastructure...

    // Add Backstage platform
    const backstage = new BackstageConstruct(this, 'Backstage');

    // Output Backstage URL
    new cdk.CfnOutput(this, 'BackstageUrl', {
      value: `https://${backstage.serviceUrl}`,
      description: 'Backstage Developer Portal URL',
    });
  }
}
```

### Phase 1.5: Observability Infrastructure Setup

#### 1.5.1 Add Observability Dependencies

Update `package.json` to include observability-related CDK constructs:

```json
{
  "dependencies": {
    "@aws-cdk/aws-ecs": "^1.204.0",
    "@aws-cdk/aws-ecs-patterns": "^1.204.0",
    "@aws-cdk/aws-efs": "^1.204.0",
    "@aws-cdk/aws-elasticache": "^1.204.0",
    "@aws-cdk/aws-rds": "^1.204.0",
    "@aws-cdk/aws-ec2": "^1.204.0",
    "aws-cdk-lib": "2.99.1",
    "constructs": "^10.0.0"
  }
}
```

#### 1.5.2 Create Observability CDK Construct

Create a new construct file `lib/observability-construct.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ObservabilityConstruct extends Construct {
  public readonly grafanaUrl: string;
  public readonly prometheusUrl: string;

  constructor(scope: Construct, id: string, vpc: ec2.IVpc) {
    super(scope, id);

    // EFS for persistent storage
    const fileSystem = new efs.FileSystem(this, 'ObservabilityStorage', {
      vpc,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Prometheus ECS Service
    const prometheusTask = new ecs.FargateTaskDefinition(this, 'PrometheusTask', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    // Add EFS volume for Prometheus data
    const prometheusVolume: ecs.Volume = {
      name: 'prometheus-data',
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: 'ENABLED',
      },
    };
    prometheusTask.addVolume(prometheusVolume);

    const prometheusContainer = prometheusTask.addContainer('Prometheus', {
      image: ecs.ContainerImage.fromRegistry('prom/prometheus:latest'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'prometheus' }),
      portMappings: [{ containerPort: 9090 }],
    });

    prometheusContainer.addMountPoints({
      sourceVolume: prometheusVolume.name,
      containerPath: '/prometheus',
      readOnly: false,
    });

    const prometheusService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'PrometheusService', {
      cluster: new ecs.Cluster(this, 'ObservabilityCluster', { vpc }),
      taskDefinition: prometheusTask,
      publicLoadBalancer: false, // Internal only
      desiredCount: 1,
    });

    // Grafana ECS Service
    const grafanaTask = new ecs.FargateTaskDefinition(this, 'GrafanaTask', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    // Add EFS volume for Grafana data
    const grafanaVolume: ecs.Volume = {
      name: 'grafana-data',
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: 'ENABLED',
      },
    };
    grafanaTask.addVolume(grafanaVolume);

    const grafanaContainer = grafanaTask.addContainer('Grafana', {
      image: ecs.ContainerImage.fromRegistry('grafana/grafana:latest'),
      environment: {
        GF_SECURITY_ADMIN_PASSWORD: 'admin', // Change in production
        GF_USERS_ALLOW_SIGN_UP: 'false',
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'grafana' }),
      portMappings: [{ containerPort: 3000 }],
    });

    grafanaContainer.addMountPoints({
      sourceVolume: grafanaVolume.name,
      containerPath: '/var/lib/grafana',
      readOnly: false,
    });

    const grafanaService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'GrafanaService', {
      cluster: prometheusService.cluster,
      taskDefinition: grafanaTask,
      publicLoadBalancer: true,
      desiredCount: 1,
    });

    // Node Exporter for EC2 metrics
    const nodeExporterTask = new ecs.FargateTaskDefinition(this, 'NodeExporterTask', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    nodeExporterTask.addContainer('NodeExporter', {
      image: ecs.ContainerImage.fromRegistry('prom/node-exporter:latest'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'node-exporter' }),
      portMappings: [{ containerPort: 9100 }],
    });

    const nodeExporterService = new ecs.FargateService(this, 'NodeExporterService', {
      cluster: prometheusService.cluster,
      taskDefinition: nodeExporterTask,
      desiredCount: 1,
    });

    // Loki for log aggregation
    const lokiTask = new ecs.FargateTaskDefinition(this, 'LokiTask', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    const lokiVolume: ecs.Volume = {
      name: 'loki-data',
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: 'ENABLED',
      },
    };
    lokiTask.addVolume(lokiVolume);

    lokiTask.addContainer('Loki', {
      image: ecs.ContainerImage.fromRegistry('grafana/loki:latest'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'loki' }),
      portMappings: [{ containerPort: 3100 }],
    });

    const lokiService = new ecs.FargateService(this, 'LokiService', {
      cluster: prometheusService.cluster,
      taskDefinition: lokiTask,
      desiredCount: 1,
    });

    // AlertManager for alerting
    const alertManagerTask = new ecs.FargateTaskDefinition(this, 'AlertManagerTask', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    alertManagerTask.addContainer('AlertManager', {
      image: ecs.ContainerImage.fromRegistry('prom/alertmanager:latest'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'alertmanager' }),
      portMappings: [{ containerPort: 9093 }],
    });

    const alertManagerService = new ecs.FargateService(this, 'AlertManagerService', {
      cluster: prometheusService.cluster,
      taskDefinition: alertManagerTask,
      desiredCount: 1,
    });

    // CloudWatch integration for Lambda metrics
    const lambdaMetricsRole = new iam.Role(this, 'LambdaMetricsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaMetricsRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess')
    );

    this.grafanaUrl = grafanaService.loadBalancer.loadBalancerDnsName;
    this.prometheusUrl = prometheusService.loadBalancer.loadBalancerDnsName;
  }
}
```

#### 1.5.3 Integrate Observability into Main Stack

Update `lib/cdk-app-stack.ts` to include the observability construct:

```typescript
import { ObservabilityConstruct } from './observability-construct';

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC for observability services
    const vpc = new ec2.Vpc(this, 'ObservabilityVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Existing infrastructure...

    // Add observability platform
    const observability = new ObservabilityConstruct(this, 'Observability', vpc);

    // Output observability URLs
    new cdk.CfnOutput(this, 'GrafanaUrl', {
      value: `https://${observability.grafanaUrl}`,
      description: 'Grafana Dashboard URL',
    });

    new cdk.CfnOutput(this, 'PrometheusUrl', {
      value: `http://${observability.prometheusUrl}:9090`,
      description: 'Prometheus Metrics URL',
    });
  }
}
```

#### 1.5.4 Configure Prometheus Targets

Create `prometheus.yml` configuration file:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'lambda'
    static_configs:
      - targets: ['lambda-exporter:9100']
    metrics_path: '/metrics'

  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway-exporter:9100']

  - job_name: 'dynamodb'
    static_configs:
      - targets: ['dynamodb-exporter:9100']

  - job_name: 'ecs'
    static_configs:
      - targets: ['ecs-exporter:9100']

  - job_name: 'node'
    ec2_sd_configs:
      - region: us-east-1
        port: 9100
    relabel_configs:
      - source_labels: [__meta_ec2_instance_state_name]
        regex: running
        action: keep
```

#### 1.5.5 Configure Grafana Dashboards

Create initial Grafana provisioning files:

```yaml
# grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

#### 1.5.6 Add Alert Rules

Create `alert_rules.yml`:

```yaml
groups:
  - name: lambda.rules
    rules:
      - alert: LambdaHighErrorRate
        expr: rate(lambda_errors_total[5m]) / rate(lambda_invocations_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on Lambda function {{ $labels.function_name }}"
          description: "Error rate is {{ $value }} errors per second"

  - name: api.rules
    rules:
      - alert: HighApiLatency
        expr: histogram_quantile(0.95, rate(api_gateway_latency_bucket[5m])) > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency on {{ $labels.api_name }}"
          description: "95th percentile latency is {{ $value }}ms"

  - name: infrastructure.rules
    rules:
      - alert: HighCpuUsage
        expr: cpu_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"
```

### Phase 3: Backstage Configuration

#### 3.1 Create Backstage App Structure

Create a `backstage/` directory with the following structure:

```
backstage/
├── app-config.yaml          # Main configuration
├── packages/
│   ├── app/                 # Frontend app
│   ├── backend/             # Backend app
│   └── backend-dynamic/     # Dynamic plugins
├── plugins/                 # Custom plugins
└── mkdocs.yml              # Documentation config
```

#### 3.2 Configure Service Catalog

Update `app-config.yaml` to include your existing services:

```yaml
catalog:
  locations:
    - type: url
      target: https://github.com/tukue/InfraAsCodeWithCDK/blob/main/catalog-info.yaml
    - type: file
      target: ../../catalog-info.yaml

backend:
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

techdocs:
  builder: 'local'
  generator:
    runIn: 'docker'
  publisher:
    type: 'awsS3'
    awsS3:
      bucketName: ${TECHDOCS_BUCKET}
```

#### 3.3 Create Service Catalog Entry

Create `catalog-info.yaml` in the root directory:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: infra-as-code-with-cdk
  description: Serverless API with Lambda and DynamoDB
  tags:
    - typescript
    - aws-cdk
    - serverless
    - api
spec:
  type: service
  lifecycle: production
  owner: platform-team
  system: platform-system
  providesApis:
    - demo-api

---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: demo-api
  description: REST API for the demo application
spec:
  type: openapi
  lifecycle: production
  owner: platform-team
  system: platform-system
  definition:
    $text: ./openapi.yaml

---
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: platform-system
  description: Core platform infrastructure
spec:
  owner: platform-team
```

### Phase 4: Developer Experience Enhancements

#### 4.1 Add TechDocs

Create `docs/` directory with MkDocs configuration:

```yaml
# mkdocs.yml
site_name: InfraAsCodeWithCDK Platform
nav:
  - Home: index.md
  - API Documentation: api.md
  - Deployment Guide: deployment.md
  - Contributing: contributing.md

plugins:
  - techdocs-core
```

#### 4.2 Add Software Templates

Backstage templates are the center of the platform experience, so this repository now includes one simplified recommended path example instead of placeholder template ideas.

Implemented assets:

```
catalog-info.yaml
backstage/
└── templates/
    └── recommended-path-service/
        ├── template.yaml
        ├── README.md
        └── scaffold/
            ├── .github/workflows/
            ├── deploy/
            ├── gitops/argocd/
            ├── observability/
            └── policy/conftest/
```

The recommended path service template covers:

- Service scaffold
- CI validation
- Container image build and publish
- Manifest tag update in Git
- Argo CD deployment from GitOps state
- Default dashboard and alert definitions
- Policy checks for Kubernetes delivery artifacts

#### 4.3 Configure CI/CD Integration

Add GitHub Actions for automated catalog updates:

```yaml
# .github/workflows/backstage-catalog.yaml
name: Update Backstage Catalog
on:
  push:
    branches: [ main ]
    paths:
      - 'catalog-info.yaml'
      - 'docs/**'

jobs:
  update-catalog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Update Backstage Catalog
        run: |
          # Trigger Backstage catalog refresh
          curl -X POST ${{ secrets.BACKSTAGE_URL }}/api/catalog/refresh
```

### Phase 5: Platform Operations

#### 5.1 Monitoring and Observability

Configure comprehensive monitoring for all platform components including the dedicated observability stack:

```typescript
// In cdk-app-stack.ts
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

// Monitor Backstage service health
const backstageAlarm = new cloudwatch.Alarm(this, 'BackstageHealthAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ECS',
    metricName: 'CPUUtilization',
    dimensionsMap: {
      ServiceName: backstage.service.serviceName,
      ClusterName: backstage.cluster.clusterName,
    },
  }),
  threshold: 80,
  evaluationPeriods: 2,
});

// Monitor Observability services
const prometheusAlarm = new cloudwatch.Alarm(this, 'PrometheusHealthAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ECS',
    metricName: 'MemoryUtilization',
    dimensionsMap: {
      ServiceName: observability.prometheusService.serviceName,
      ClusterName: observability.cluster.clusterName,
    },
  }),
  threshold: 85,
  evaluationPeriods: 3,
});

const grafanaAlarm = new cloudwatch.Alarm(this, 'GrafanaHealthAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ECS',
    metricName: 'CPUUtilization',
    dimensionsMap: {
      ServiceName: observability.grafanaService.serviceName,
      ClusterName: observability.cluster.clusterName,
    },
  }),
  threshold: 75,
  evaluationPeriods: 2,
});

// Create dashboard for platform metrics
const dashboard = new cloudwatch.Dashboard(this, 'PlatformDashboard', {
  dashboardName: 'PlatformObservability',
});

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Platform Services Health',
    left: [
      new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: { ServiceName: backstage.service.serviceName },
        label: 'Backstage CPU',
      }),
      new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: { ServiceName: observability.grafanaService.serviceName },
        label: 'Grafana CPU',
      }),
    ],
  })
);
```

#### 5.2 Cost Optimization

Add cost allocation tags and budgets for all platform components:

```typescript
// Tag all platform resources
cdk.Tags.of(backstage).add('Component', 'DeveloperPortal');
cdk.Tags.of(backstage).add('Owner', 'PlatformTeam');

cdk.Tags.of(observability).add('Component', 'Observability');
cdk.Tags.of(observability).add('Owner', 'PlatformTeam');

// Tag existing infrastructure
cdk.Tags.of(lambda_backend).add('Component', 'API');
cdk.Tags.of(dynamodb_table).add('Component', 'Database');

// Add comprehensive cost budget
new cdk.aws_budgets.CfnBudget(this, 'PlatformBudget', {
  budget: {
    budgetName: 'PlatformMonthlyBudget',
    budgetType: 'COST',
    timeUnit: 'MONTHLY',
    budgetLimit: {
      amount: 1000,
      unit: 'USD',
    },
  },
  notificationsWithSubscribers: [
    {
      notification: {
        notificationType: 'ACTUAL',
        threshold: 80,
        thresholdType: 'PERCENTAGE',
      },
      subscribers: [
        {
          subscriptionType: 'EMAIL',
          address: 'platform-team@company.com',
        },
      ],
    },
  ],
});
```

## Deployment Instructions

### Prerequisites

1. **AWS Account**: Platform account with necessary permissions
2. **Domain**: Configure Route 53 for custom domain
3. **GitHub Integration**: Personal access token with repo access
4. **Docker Hub**: Access to Backstage, Prometheus, Grafana Docker images
5. **VPC Configuration**: Ensure proper networking for observability services

### Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   export AWS_REGION=us-east-1
   export GITHUB_TOKEN=your_github_token
   ```

3. **Bootstrap CDK (First Time Only)**
   ```bash
   cdk bootstrap
   ```

4. **Deploy Platform**
   ```bash
   cdk deploy
   ```

5. **Initialize Backstage**
   ```bash
   # Access Backstage at the output URL
   # Complete initial setup wizard
   # Configure integrations
   ```

6. **Configure Observability**
   ```bash
   # Access Grafana at the output URL (default: admin/admin)
   # Configure Prometheus as data source
   # Import platform dashboards
   # Set up alerting rules and notifications
   ```

## Best Practices

### Platform Engineering Principles

1. **Recommended Paths**: Provide opinionated, automated workflows
2. **Self-Service**: Enable developers to provision resources independently
3. **Documentation**: Keep docs updated and discoverable
4. **Observability**: Monitor platform health and usage
5. **Security**: Implement least-privilege access controls

### Backstage-Specific Best Practices

1. **Catalog Organization**: Use consistent naming and tagging
2. **Plugin Ecosystem**: Start with core plugins, add custom ones gradually
3. **Access Control**: Implement RBAC for different user roles
4. **Performance**: Monitor and optimize Backstage performance
5. **Updates**: Keep Backstage and plugins updated regularly

## Next Steps

1. **User Onboarding**: Create documentation for developers
2. **Plugin Development**: Build custom plugins for your organization
3. **Integration Expansion**: Add more tools and services
4. **Governance**: Establish platform governance policies
5. **Metrics and KPIs**: Define platform success metrics

## Troubleshooting

### Common Issues

1. **Backstage Not Starting**: Check database connectivity and environment variables
2. **Catalog Not Loading**: Verify GitHub integration and token permissions
3. **Performance Issues**: Monitor ECS resource utilization and scale accordingly

### Support Resources

- [Backstage Documentation](https://backstage.io/docs)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Platform Engineering Community](https://platformengineering.org/)

---

*This guide transforms your infrastructure code into a developer platform. Start small, iterate often, and focus on developer experience.*
