const scanMock = jest.fn();
const putMock = jest.fn();

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      scan: scanMock,
      put: putMock,
    })),
  },
}));

describe('Lambda handler', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DYNAMODB = 'demo-items-test';
    process.env.STAGE = 'test';
    scanMock.mockReset();
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
    scanMock.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Items: [
          { id: '1', name: 'older', createdAt: '2024-01-01T00:00:00.000Z' },
          { id: '2', name: 'newer', createdAt: '2024-01-02T00:00:00.000Z' },
        ],
      }),
    });

    const { handler } = await import('../lib/function');

    const response = await handler({
      httpMethod: 'GET',
      path: '/items',
      resource: '/items',
    } as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      count: 2,
      items: [
        { id: '2', name: 'newer', createdAt: '2024-01-02T00:00:00.000Z' },
        { id: '1', name: 'older', createdAt: '2024-01-01T00:00:00.000Z' },
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
});
