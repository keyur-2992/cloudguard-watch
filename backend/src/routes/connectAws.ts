import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../lib/auth';
import { prisma } from '../prisma/client';
import { testAwsConnection } from '../lib/awsHelpers';
import { 
  ConnectAwsRequest, 
  ConnectAwsResponse, 
  ApiResponse, 
  ApiError,
  ValidationErrorResponse 
} from '../types';

// Validation schema for AWS connection request
const connectAwsSchema = z.object({
  roleArn: z
    .string()
    .min(1, 'IAM Role ARN is required')
    .regex(
      /^arn:aws:iam::\d{12}:role\/.+$/,
      'Invalid IAM Role ARN format'
    ),
  externalId: z
    .string()
    .min(2, 'External ID must be at least 2 characters')
    .max(1224, 'External ID must not exceed 1224 characters')
    .regex(/^[\w+=,.@:-]+$/, 'External ID contains invalid characters'),
  name: z
    .string()
    .min(1, 'Account name must not be empty')
    .max(100, 'Account name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Account name contains invalid characters')
    .optional(),
  region: z
    .string()
    .regex(/^[a-z0-9\-]+$/, 'Invalid AWS region format')
    .optional(),
});

// Rate limiting configuration
const rateLimitOptions = {
  max: 10, // Maximum 10 requests
  timeWindow: '1 minute', // Per minute
  keyGenerator: (request: FastifyRequest) => {
    return request.headers.authorization || request.ip;
  },
};

// Connect AWS account route handler
async function connectAwsHandler(
  request: FastifyRequest<{ Body: ConnectAwsRequest }>,
  reply: FastifyReply
): Promise<ApiResponse<ConnectAwsResponse> | ValidationErrorResponse> {
  const logger = request.log;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    logger.info({ userId: user.id }, 'User authenticated for AWS connection');

    // Validate request body
    const validationResult = connectAwsSchema.safeParse(request.body);
    
    if (!validationResult.success) {
      logger.warn({ 
        userId: user.id, 
        errors: validationResult.error.issues 
      }, 'Validation failed for AWS connection request');

      const validationErrors = validationResult.error.issues.map((issue: any) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    const { roleArn, externalId, name, region } = validationResult.data;

    logger.info({ userId: user.id, roleArn }, 'Testing AWS connection');

    // Test AWS connection by assuming role and verifying identity
    const awsConnection = await testAwsConnection(roleArn, externalId);
    const { accountId } = awsConnection;

    logger.info({ 
      userId: user.id, 
      accountId, 
      verified: awsConnection.verified 
    }, 'AWS connection verified');

    // Check if user already has this AWS account connected
    const existingAccount = await prisma.awsAccount.findUnique({
      where: {
        userId_accountId: {
          userId: user.id,
          accountId,
        },
      },
    });

    if (existingAccount) {
      logger.warn({ 
        userId: user.id, 
        accountId 
      }, 'AWS account already connected');

      const error = new ApiError('AWS account already connected', 409);
      return reply.status(409).send({
        success: false,
        error: error.message,
      });
    }

    // Create new AWS account record
    const awsAccount = await prisma.awsAccount.create({
      data: {
        userId: user.id,
        accountId,
        roleArn,
        externalId,
        name: name || `AWS Account ${accountId}`,
        region: region || 'us-east-1',
        status: 'connected',
      },
    });

    logger.info({ 
      userId: user.id, 
      awsAccountId: awsAccount.id,
      accountId 
    }, 'AWS account connected successfully');

    // Prepare response
    const response: ConnectAwsResponse = {
      id: awsAccount.id,
      accountId: awsAccount.accountId,
      ...(awsAccount.name && { name: awsAccount.name }),
      ...(awsAccount.region && { region: awsAccount.region }),
      status: awsAccount.status,
      createdAt: awsAccount.createdAt.toISOString(),
    };

    return reply.status(201).send({
      success: true,
      data: response,
      message: 'AWS account connected successfully',
    });

  } catch (error) {
    // Handle authentication errors
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn('Authentication failed for AWS connection');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Handle other API errors
    if (error instanceof ApiError) {
      logger.error({ 
        error: error.message, 
        statusCode: error.statusCode 
      }, 'API error during AWS connection');
      
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }

    // Handle Prisma/database errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      logger.error(error, 'Database constraint violation');
      return reply.status(409).send({
        success: false,
        error: 'AWS account already exists',
      });
    }

    // Handle unexpected errors
    logger.error(error, 'Unexpected error during AWS connection');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Register routes
export async function connectAwsRoutes(fastify: FastifyInstance) {
  // Apply rate limiting to this route
  await fastify.register(require('@fastify/rate-limit'), rateLimitOptions);

  // POST /api/connect-aws
  fastify.post<{ Body: ConnectAwsRequest }>(
    '/api/connect-aws',
    {
      schema: {
        body: {
          type: 'object',
          required: ['roleArn', 'externalId'],
          properties: {
            roleArn: { type: 'string', minLength: 1 },
            externalId: { type: 'string', minLength: 2, maxLength: 1224 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            region: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  accountId: { type: 'string' },
                  name: { type: 'string' },
                  region: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          409: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    connectAwsHandler
  );
} 