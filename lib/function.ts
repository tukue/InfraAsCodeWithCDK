import { randomUUID } from 'crypto';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

type ItemRecord = {
  id: string;
  name: string;
  createdAt: string;
};

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.DYNAMODB;
const stage = process.env.STAGE ?? 'dev';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

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

async function listItems(): Promise<APIGatewayProxyResult> {
  const result = await dynamodb
    .scan({
      TableName: requireTableName(),
    })
    .promise();

  const items = ((result.Items ?? []) as ItemRecord[]).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return json(200, {
    items,
    count: items.length,
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

    if (resourcePath === '/health' && method === 'GET') {
      return json(200, {
        status: 'ok',
        stage,
      });
    }

    if (resourcePath === '/items' && method === 'GET') {
      return listItems();
    }

    if (resourcePath === '/items' && method === 'POST') {
      return createItem(event);
    }

    if (resourcePath === '/' && method === 'GET') {
      return json(200, {
        message: 'Demo API is running',
        routes: ['GET /health', 'GET /items', 'POST /items'],
      });
    }

    return json(404, {
      error: 'Not Found',
    });
  } catch (error) {
    console.error('Request failed', error);

    if (error instanceof SyntaxError) {
      return json(400, {
        error: 'Request body must be valid JSON',
      });
    }

    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    const statusCode = message.startsWith('Field "') || message === 'Request body is required'
      ? 400
      : 500;

    return json(statusCode, {
      error: message,
    });
  }
};
