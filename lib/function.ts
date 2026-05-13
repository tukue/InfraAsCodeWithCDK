import { randomUUID } from 'crypto';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

type ItemRecord = {
  id: string;
  name: string;
  createdAt: string;
};

type ItemsCursor = {
  id: string;
};

type PlatformCapability = {
  id: string;
  name: string;
  status: 'available' | 'planned';
  description: string;
};

const dynamodb = new AWS.DynamoDB.DocumentClient();
const defaultItemsLimit = 25;
const maxItemsLimit = 100;
const tableName = process.env.DYNAMODB;
const stage = process.env.STAGE ?? 'dev';
const catalogEntityRef = process.env.CATALOG_ENTITY_REF ?? 'component:default/infra-as-code-with-cdk';
const recommendedPathTemplateName =
  process.env.RECOMMENDED_PATH_TEMPLATE_NAME ?? 'recommended-path-service';
const recommendedPathTemplatePath =
  process.env.RECOMMENDED_PATH_TEMPLATE_PATH ??
  'backstage/templates/recommended-path-service/template.yaml';
const recommendedPathCatalogPath =
  process.env.RECOMMENDED_PATH_CATALOG_PATH ?? 'catalog-info.yaml';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const platformCapabilities: PlatformCapability[] = [
  {
    id: 'service-scaffold',
    name: 'Service scaffold',
    status: 'available',
    description: 'Backstage scaffolder template for new services.',
  },
  {
    id: 'ci',
    name: 'CI validation',
    status: 'available',
    description: 'GitHub Actions validates build and policy checks.',
  },
  {
    id: 'image-delivery',
    name: 'Image delivery',
    status: 'available',
    description: 'GHCR image build and publish workflow for runtime delivery.',
  },
  {
    id: 'gitops-deploy',
    name: 'GitOps deployment',
    status: 'available',
    description: 'Argo CD reconciles Kubernetes manifests from Git.',
  },
  {
    id: 'observability-baseline',
    name: 'Observability baseline',
    status: 'available',
    description: 'Default dashboard and alert definitions ship with the template.',
  },
  {
    id: 'policy-guardrails',
    name: 'Policy guardrails',
    status: 'available',
    description: 'OPA conftest rules validate deployment manifests in CI.',
  },
];

function getPlatformProduct() {
  return {
    name: 'InfraAsCodeWithCDK Platform',
    type: 'platform-product',
    stage,
    catalogEntityRef,
    recommendedPath: {
      templateName: recommendedPathTemplateName,
      templatePath: recommendedPathTemplatePath,
      catalogPath: recommendedPathCatalogPath,
      stages: [
        'service scaffold',
        'ci',
        'image build',
        'manifest tag update',
        'argo cd deploy',
        'dashboards and alerts',
        'policy checks',
      ],
    },
    capabilities: platformCapabilities,
  };
}

function json(statusCode: number, body: Record<string, unknown>): APIGatewayProxyResult {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

function requireTableName(): string {
  if (!tableName) {
    throw new Error('DYNAMODB environment variable is not configured');
  }

  return tableName;
}

function parseCreateItemBody(body: string | null): { name: string } {
  if (!body) {
    throw new Error('Request body is required');
  }

  const parsed = JSON.parse(body) as { name?: unknown };

  if (typeof parsed.name !== 'string' || parsed.name.trim() === '') {
    throw new Error('Field "name" must be a non-empty string');
  }

  return { name: parsed.name.trim() };
}

function parseItemsLimit(rawLimit?: string): number {
  if (!rawLimit) {
    return defaultItemsLimit;
  }

  const limit = Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > maxItemsLimit) {
    throw new Error(`Query parameter "limit" must be an integer from 1 to ${maxItemsLimit}`);
  }

  return limit;
}

function encodeCursor(cursor?: AWS.DynamoDB.DocumentClient.Key): string | undefined {
  if (!cursor) {
    return undefined;
  }

  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(rawCursor?: string): AWS.DynamoDB.DocumentClient.Key | undefined {
  if (!rawCursor) {
    return undefined;
  }

  try {
    const decoded = JSON.parse(Buffer.from(rawCursor, 'base64url').toString('utf8')) as Partial<ItemsCursor>;

    if (typeof decoded.id !== 'string' || decoded.id.trim() === '') {
      throw new Error('Cursor does not contain a valid id');
    }

    return {
      id: decoded.id,
    };
  } catch (error) {
    throw new Error('Query parameter "cursor" must be a valid pagination cursor');
  }
}

function isClientError(message: string): boolean {
  return (
    message.startsWith('Field "') ||
    message === 'Request body is required' ||
    message.startsWith('Query parameter "')
  );
}

async function listItems(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const limit = parseItemsLimit(event.queryStringParameters?.limit);
  const exclusiveStartKey = decodeCursor(event.queryStringParameters?.cursor);

  const result = await dynamodb
    .scan({
      TableName: requireTableName(),
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    })
    .promise();

  const items = ((result.Items ?? []) as ItemRecord[]).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return json(200, {
    items,
    count: items.length,
    limit,
    nextCursor: encodeCursor(result.LastEvaluatedKey),
  });
}

async function createItem(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { name } = parseCreateItemBody(event.body ?? null);

  const item: ItemRecord = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };

  await dynamodb
    .put({
      TableName: requireTableName(),
      Item: item,
    })
    .promise();

  return json(201, {
    item,
  });
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const resourcePath = event.resource ?? event.path;
    const method = event.httpMethod;
    const platformProduct = getPlatformProduct();

    if (resourcePath === '/health' && method === 'GET') {
      return json(200, {
        status: 'ok',
        stage,
      });
    }

    if (resourcePath === '/items' && method === 'GET') {
      return await listItems(event);
    }

    if (resourcePath === '/items' && method === 'POST') {
      return await createItem(event);
    }

    if (resourcePath === '/platform' && method === 'GET') {
      return json(200, platformProduct);
    }

    if (resourcePath === '/platform/recommended-path' && method === 'GET') {
      return json(200, {
        stage,
        catalogEntityRef,
        recommendedPath: platformProduct.recommendedPath,
        capabilities: platformProduct.capabilities,
      });
    }

    if (resourcePath === '/' && method === 'GET') {
      return json(200, {
        message: 'Platform product API is running',
        platformType: platformProduct.type,
        recommendedPathTemplate: recommendedPathTemplateName,
        routes: [
          'GET /health',
          'GET /platform',
          'GET /platform/recommended-path',
          'GET /items',
          'POST /items',
        ],
      });
    }

    return json(404, {
      error: 'Not Found',
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json(400, {
        error: 'Request body must be valid JSON',
      });
    }

    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    const statusCode = isClientError(message) ? 400 : 500;

    if (statusCode >= 500) {
      console.error('Request failed', error);
    }

    return json(statusCode, {
      error: message,
    });
  }
};
