const queryMock = jest.fn();
const putMock = jest.fn();

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      query: queryMock,
      put: putMock,
    })),
  },
}));

describe('Lambda handler', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DYNAMODB = 'demo-items-test';
    process.env.STAGE = 'test';
    process.env.ITEMS_BY_CREATED_AT_INDEX = 'ItemsByCreatedAtIndex';
    process.env.CATALOG_ENTITY_REF = 'component:default/infra-as-code-with-cdk';
    process.env.RECOMMENDED_PATH_TEMPLATE_NAME = 'recommended-path-service';
    process.env.RECOMMENDED_PATH_TEMPLATE_PATH =
      'backstage/templates/recommended-path-service/template.yaml';
    process.env.RECOMMENDED_PATH_CATALOG_PATH = 'catalog-info.yaml';
    queryMock.mockReset();
    putMock.mockReset();
  });

  it('returns health status for GET /health', async () => {
    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'GET',
      path: '/health',
      resource: '/health',
    } as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      status: 'ok',
      stage: 'test',
    });
  });

  it('lists items for GET /items', async () => {
    queryMock.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Items: [
          { id: '2', entityType: 'ITEM', name: 'newer', createdAt: '2024-01-02T00:00:00.000Z' },
          { id: '1', entityType: 'ITEM', name: 'older', createdAt: '2024-01-01T00:00:00.000Z' },
        ],
        LastEvaluatedKey: {
          id: '1',
          entityType: 'ITEM',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      }),
    });

    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'GET',
      path: '/items',
      resource: '/items',
      queryStringParameters: {
        limit: '10',
      },
    } as any);

    expect(response.statusCode).toBe(200);
    expect(queryMock).toHaveBeenCalledWith({
      TableName: 'demo-items-test',
      IndexName: 'ItemsByCreatedAtIndex',
      KeyConditionExpression: '#entityType = :entityType',
      ExpressionAttributeNames: {
        '#entityType': 'entityType',
      },
      ExpressionAttributeValues: {
        ':entityType': 'ITEM',
      },
      Limit: 10,
      ExclusiveStartKey: undefined,
      ScanIndexForward: false,
    });
    const nextCursor = Buffer.from(
      JSON.stringify({
        id: '1',
        entityType: 'ITEM',
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
      'utf8',
    ).toString('base64url');

    expect(JSON.parse(response.body)).toEqual({
      count: 2,
      limit: 10,
      nextCursor,
      items: [
        { id: '2', entityType: 'ITEM', name: 'newer', createdAt: '2024-01-02T00:00:00.000Z' },
        { id: '1', entityType: 'ITEM', name: 'older', createdAt: '2024-01-01T00:00:00.000Z' },
      ],
    });
  });

  it('uses a default limit and decodes cursors for GET /items', async () => {
    queryMock.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Items: [],
      }),
    });

    const cursorKey = {
      id: 'previous',
      entityType: 'ITEM',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    const cursor = Buffer.from(JSON.stringify(cursorKey), 'utf8').toString('base64url');
    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'GET',
      path: '/items',
      resource: '/items',
      queryStringParameters: {
        cursor,
      },
    } as any);

    expect(response.statusCode).toBe(200);
    expect(queryMock).toHaveBeenCalledWith({
      TableName: 'demo-items-test',
      IndexName: 'ItemsByCreatedAtIndex',
      KeyConditionExpression: '#entityType = :entityType',
      ExpressionAttributeNames: {
        '#entityType': 'entityType',
      },
      ExpressionAttributeValues: {
        ':entityType': 'ITEM',
      },
      Limit: 25,
      ExclusiveStartKey: cursorKey,
      ScanIndexForward: false,
    });
    expect(JSON.parse(response.body)).toEqual({
      count: 0,
      items: [],
      limit: 25,
    });
  });

  it('rejects invalid list query parameters', async () => {
    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'GET',
      path: '/items',
      resource: '/items',
      queryStringParameters: {
        limit: '101',
      },
    } as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: 'Query parameter "limit" must be an integer from 1 to 100',
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns platform metadata for GET /platform', async () => {
    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'GET',
      path: '/platform',
      resource: '/platform',
    } as any);

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.body)).toEqual({
      name: 'InfraAsCodeWithCDK Platform',
      type: 'platform-product',
      stage: 'test',
      catalogEntityRef: 'component:default/infra-as-code-with-cdk',
      recommendedPath: {
        templateName: 'recommended-path-service',
        templatePath: 'backstage/templates/recommended-path-service/template.yaml',
        catalogPath: 'catalog-info.yaml',
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
      capabilities: [
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
      ],
    });
  });

  it('returns the recommended path contract for GET /platform/recommended-path', async () => {
    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'GET',
      path: '/platform/recommended-path',
      resource: '/platform/recommended-path',
    } as any);

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.body)).toEqual({
      stage: 'test',
      catalogEntityRef: 'component:default/infra-as-code-with-cdk',
      recommendedPath: {
        templateName: 'recommended-path-service',
        templatePath: 'backstage/templates/recommended-path-service/template.yaml',
        catalogPath: 'catalog-info.yaml',
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
      capabilities: [
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
      ],
    });
  });

  it('creates an item for POST /items', async () => {
    putMock.mockReturnValue({
      promise: jest.fn().mockResolvedValue(undefined),
    });

    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'POST',
      path: '/items',
      resource: '/items',
      body: JSON.stringify({ name: 'example item' }),
    } as any);

    expect(response.statusCode).toBe(201);
    expect(putMock).toHaveBeenCalledTimes(1);

    const parsed = JSON.parse(response.body);
    expect(parsed.item.name).toBe('example item');
    expect(parsed.item.entityType).toBe('ITEM');
    expect(parsed.item.id).toEqual(expect.any(String));
    expect(parsed.item.createdAt).toEqual(expect.any(String));
  });

  it('rejects invalid POST payloads', async () => {
    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'POST',
      path: '/items',
      resource: '/items',
      body: JSON.stringify({ name: '' }),
    } as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: 'Field "name" must be a non-empty string',
    });
  });

  it('advertises platform routes at the API root', async () => {
    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'GET',
      path: '/',
      resource: '/',
    } as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Platform product API is running',
      platformType: 'platform-product',
      recommendedPathTemplate: 'recommended-path-service',
      routes: [
        'GET /health',
        'GET /platform',
        'GET /platform/recommended-path',
        'GET /items',
        'POST /items',
      ],
    });
  });
});
