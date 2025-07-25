import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../lib/auth';
import { prisma } from '../prisma/client';
import { ApiResponse, ApiError } from '../types';

// Types for AWS account responses
export interface AwsAccountResponse {
  id: string;
  accountId: string;
  name?: string;
  region?: string;
  status: string;
  roleArn: string;
  createdAt: string;
  updatedAt: string;
}

export interface AwsAccountsListResponse {
  accounts: AwsAccountResponse[];
  total: number;
}

// Note: Account ID validation is handled in the route parameter schema

// Rate limiting configuration
const rateLimitOptions = {
  max: 20, // Maximum 20 requests
  timeWindow: '1 minute', // Per minute
  keyGenerator: (request: FastifyRequest) => {
    return request.headers.authorization || request.ip;
  },
};

// Get user's connected AWS accounts
async function getAwsAccountsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ApiResponse<AwsAccountsListResponse>> {
  const logger = request.log;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    logger.info({ userId: user.id }, 'Fetching user AWS accounts');

    // Get user's AWS accounts from database
    const accounts = await prisma.awsAccount.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info({ 
      userId: user.id, 
      accountCount: accounts.length 
    }, 'Retrieved AWS accounts');

    // Transform to response format
    const accountsResponse: AwsAccountResponse[] = accounts.map(account => ({
      id: account.id,
      accountId: account.accountId,
      ...(account.name && { name: account.name }),
      ...(account.region && { region: account.region }),
      status: account.status,
      roleArn: account.roleArn,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    }));

    return reply.status(200).send({
      success: true,
      data: {
        accounts: accountsResponse,
        total: accounts.length,
      },
      message: 'AWS accounts retrieved successfully',
    });

  } catch (error) {
    // Handle authentication errors
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn('Authentication failed for AWS accounts fetch');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Handle unexpected errors
    logger.error(error, 'Unexpected error fetching AWS accounts');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Remove/disconnect AWS account
async function deleteAwsAccountHandler(
  request: FastifyRequest<{ Params: { accountId: string } }>,
  reply: FastifyReply
): Promise<ApiResponse<void>> {
  const logger = request.log;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    // Validate account ID parameter
    const { accountId } = request.params;
    
    if (!accountId) {
      return reply.status(400).send({
        success: false,
        error: 'Account ID is required',
      });
    }

    logger.info({ 
      userId: user.id, 
      accountId 
    }, 'Attempting to delete AWS account');

    // Check if account exists and belongs to user
    const existingAccount = await prisma.awsAccount.findUnique({
      where: {
        userId_accountId: {
          userId: user.id,
          accountId: accountId,
        },
      },
    });

    if (!existingAccount) {
      logger.warn({ 
        userId: user.id, 
        accountId 
      }, 'AWS account not found or does not belong to user');

      return reply.status(404).send({
        success: false,
        error: 'AWS account not found',
      });
    }

    // Delete the AWS account record
    await prisma.awsAccount.delete({
      where: {
        userId_accountId: {
          userId: user.id,
          accountId: accountId,
        },
      },
    });

    logger.info({ 
      userId: user.id, 
      accountId,
      deletedAccountId: existingAccount.id
    }, 'AWS account deleted successfully');

    return reply.status(200).send({
      success: true,
      message: 'AWS account disconnected successfully',
    });

  } catch (error) {
    // Handle authentication errors
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn('Authentication failed for AWS account deletion');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Handle Prisma errors
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      logger.warn('Attempted to delete non-existent AWS account');
      return reply.status(404).send({
        success: false,
        error: 'AWS account not found',
      });
    }

    // Handle unexpected errors
    logger.error(error, 'Unexpected error deleting AWS account');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Register AWS account management routes
export async function awsAccountRoutes(fastify: FastifyInstance) {
  // Apply rate limiting to these routes
  await fastify.register(require('@fastify/rate-limit'), rateLimitOptions);

  // GET /api/aws-accounts - List user's connected AWS accounts
  fastify.get(
    '/api/aws-accounts',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accounts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        accountId: { type: 'string' },
                        name: { type: 'string' },
                        region: { type: 'string' },
                        status: { type: 'string' },
                        roleArn: { type: 'string' },
                        createdAt: { type: 'string' },
                        updatedAt: { type: 'string' },
                      },
                    },
                  },
                  total: { type: 'number' },
                },
              },
              message: { type: 'string' },
            },
          },
          401: {
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
    getAwsAccountsHandler
  );

  // DELETE /api/aws-accounts/:accountId - Remove/disconnect AWS account
  fastify.delete<{ Params: { accountId: string } }>(
    '/api/aws-accounts/:accountId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            accountId: { type: 'string' },
          },
          required: ['accountId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          404: {
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
    deleteAwsAccountHandler
  );
} 