import {Context, APIGatewayEvent } from 'aws-lambda';

export const handler = async (event: APIGatewayEvent, context: Context): Promise<string> => {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2));
    return context.logStreamName;
};
