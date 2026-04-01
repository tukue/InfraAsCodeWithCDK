import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB || '';
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';
const LOG_LEVEL = process.env.APP_LOG_LEVEL || 'INFO';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const log = (
  level: LogLevel,
  message: string,
  details: Record<string, unknown> = {}
): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    ...details,
  };

  if (level === 'ERROR') {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === 'WARN') {
    console.warn(JSON.stringify(payload));
    return;
  }

  if (level === 'DEBUG' && LOG_LEVEL !== 'DEBUG') {
    return;
  }

  console.log(JSON.stringify(payload));
};

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const correlationId =
    event.headers?.['x-correlation-id'] ||
    event.headers?.['X-Correlation-Id'] ||
    context.awsRequestId;

  try {
    log('INFO', 'request-received', {
      awsRequestId: context.awsRequestId,
      correlationId,
      path: event.path,
      method: event.httpMethod,
      tableNameConfigured: TABLE_NAME.length > 0,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({
        message: 'Testing from Lambda!',
        service: SERVICE_NAME,
        correlationId,
        requestId: context.awsRequestId,
      }),
    };
  } catch (error) {
    log('ERROR', 'request-failed', {
      awsRequestId: context.awsRequestId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
