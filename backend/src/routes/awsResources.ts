import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateUser } from '../lib/auth';
import { prisma } from '../prisma/client';
import { getAwsResourceCounts, getDetailedAwsResourceInventory } from '../lib/awsHelpers';
import { ApiResponse, ApiError } from '../types';
import { AwsResourceCounts, DetailedResourceInventory } from '../lib/awsHelpers';

// Rate limiting configuration
const rateLimitOptions = {
  max: 30, // Maximum 30 requests (resource fetching can be intensive)
  timeWindow: '1 minute', // Per minute
  keyGenerator: (request: FastifyRequest) => {
    return request.headers.authorization || request.ip;
  },
};

// AWS Resources route handler
async function getAwsResourcesHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ApiResponse<AwsResourceCounts>> {
  const logger = request.log;
  const reqId = request.id;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    logger.info({ 
      userId: user.id, 
      reqId 
    }, 'Fetching AWS resources for user');

    // Find user's connected AWS accounts
    const awsAccounts = await prisma.awsAccount.findMany({
      where: {
        userId: user.id,
        status: 'connected', // Only fetch from connected accounts
      },
      orderBy: {
        createdAt: 'desc', // Use the most recently connected account
      },
    });

    if (awsAccounts.length === 0) {
      logger.warn({ 
        userId: user.id, 
        reqId 
      }, 'No connected AWS accounts found');

      return reply.status(404).send({
        success: false,
        error: 'No connected AWS accounts found. Please connect an AWS account first.',
      });
    }

    // Use the first (most recent) connected account
    const primaryAccount = awsAccounts[0]!; // Safe because we checked length above

    logger.info({ 
      userId: user.id, 
      accountId: primaryAccount.accountId,
      roleArn: primaryAccount.roleArn,
      reqId 
    }, 'Using AWS account for resource fetching');

    // Fetch AWS resource counts
    const startTime = Date.now();
    const resourceCounts = await getAwsResourceCounts(
      primaryAccount.roleArn,
      primaryAccount.externalId,
      primaryAccount.region || undefined
    );
    const fetchTime = Date.now() - startTime;

    logger.info({ 
      userId: user.id, 
      accountId: primaryAccount.accountId,
      resourceCounts,
      fetchTimeMs: fetchTime,
      reqId 
    }, 'Successfully fetched AWS resource counts');

    return reply.status(200).send({
      success: true,
      data: resourceCounts,
      message: 'AWS resource counts retrieved successfully',
    });

  } catch (error) {
    // Handle authentication errors
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn({ reqId }, 'Authentication failed for AWS resources fetch');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Handle AWS-specific errors
    if (error instanceof ApiError) {
      logger.error({ 
        error: error.message, 
        statusCode: error.statusCode,
        reqId 
      }, 'AWS API error during resource fetch');
      
      // If it's a credential or access error, suggest reconnecting
      if (error.message.includes('credentials') || error.message.includes('Access denied')) {
        return reply.status(403).send({
          success: false,
          error: 'AWS access denied. Please reconnect your AWS account.',
        });
      }
      
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }

    // Handle Prisma/database errors
    if (error instanceof Error && error.message.includes('Prisma')) {
      logger.error({ error, reqId }, 'Database error during AWS resources fetch');
      return reply.status(500).send({
        success: false,
        error: 'Database error',
      });
    }

    // Handle unexpected errors
    logger.error({ error, reqId }, 'Unexpected error fetching AWS resources');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Detailed AWS resource inventory route handler
async function getDetailedAwsResourceInventoryHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ApiResponse<DetailedResourceInventory>> {
  const logger = request.log;
  const reqId = request.id;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    logger.info({ 
      userId: user.id, 
      reqId 
    }, 'Fetching detailed AWS resource inventory for user');

    // Find user's connected AWS accounts
    const awsAccounts = await prisma.awsAccount.findMany({
      where: {
        userId: user.id,
        status: 'connected',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (awsAccounts.length === 0) {
      logger.warn({ 
        userId: user.id, 
        reqId 
      }, 'No connected AWS accounts found for detailed inventory');

      return reply.status(404).send({
        success: false,
        error: 'No connected AWS accounts found. Please connect an AWS account first.',
      });
    }

    // Use the first (most recent) connected account
    const primaryAccount = awsAccounts[0]!;

    logger.info({ 
      userId: user.id, 
      accountId: primaryAccount.accountId,
      roleArn: primaryAccount.roleArn,
      reqId 
    }, 'Fetching detailed AWS resource inventory');

    // Fetch detailed AWS resource inventory
    const startTime = Date.now();
    const resourceInventory = await getDetailedAwsResourceInventory(
      primaryAccount.roleArn,
      primaryAccount.externalId,
      primaryAccount.region || undefined
    );
    const fetchTime = Date.now() - startTime;

    logger.info({ 
      userId: user.id, 
      accountId: primaryAccount.accountId,
      totalResources: resourceInventory.total,
      ec2Count: resourceInventory.ec2Instances.length,
      s3Count: resourceInventory.s3Buckets.length,
      lambdaCount: resourceInventory.lambdaFunctions.length,
      rdsCount: resourceInventory.rdsInstances.length,
      fetchTimeMs: fetchTime,
      reqId 
    }, 'Successfully fetched detailed AWS resource inventory');

    return reply.status(200).send({
      success: true,
      data: resourceInventory,
      message: 'AWS resource inventory retrieved successfully',
    });

  } catch (error) {
    // Handle authentication errors
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn({ reqId }, 'Authentication failed for detailed AWS inventory fetch');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Handle AWS-specific errors
    if (error instanceof ApiError) {
      logger.error({ 
        error: error.message, 
        statusCode: error.statusCode,
        reqId 
      }, 'AWS API error during detailed inventory fetch');
      
      // If it's a credential or access error, suggest reconnecting
      if (error.message.includes('credentials') || error.message.includes('Access denied')) {
        return reply.status(403).send({
          success: false,
          error: 'AWS access denied. Please reconnect your AWS account.',
        });
      }
      
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }

    // Handle unexpected errors
    logger.error({ error, reqId }, 'Unexpected error fetching detailed AWS inventory');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Register AWS resources routes
export async function awsResourcesRoutes(fastify: FastifyInstance) {
  // Apply rate limiting to this route
  await fastify.register(require('@fastify/rate-limit'), rateLimitOptions);

  // GET /api/aws/resources - Get AWS resource counts for user's connected account
  fastify.get(
    '/api/aws/resources',
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
                  ec2Count: { type: 'number' },
                  s3Count: { type: 'number' },
                  lambdaCount: { type: 'number' },
                  rdsCount: { type: 'number' },
                },
                required: ['ec2Count', 's3Count', 'lambdaCount', 'rdsCount'],
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
          403: {
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
    getAwsResourcesHandler
  );

  // GET /api/aws/resources/detailed - Get detailed AWS resource inventory
  fastify.get(
    '/api/aws/resources/detailed',
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
                  ec2Instances: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string' },
                        region: { type: 'string' },
                        status: { type: 'string' },
                        state: { type: 'string' },
                        size: { type: 'string' },
                        lastModified: { type: 'string' },
                        tags: { type: 'object' },
                      },
                    },
                  },
                  s3Buckets: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string' },
                        region: { type: 'string' },
                        status: { type: 'string' },
                        lastModified: { type: 'string' },
                      },
                    },
                  },
                  lambdaFunctions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string' },
                        region: { type: 'string' },
                        status: { type: 'string' },
                        state: { type: 'string' },
                        size: { type: 'string' },
                        lastModified: { type: 'string' },
                      },
                    },
                  },
                  rdsInstances: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string' },
                        region: { type: 'string' },
                        status: { type: 'string' },
                        state: { type: 'string' },
                        size: { type: 'string' },
                        lastModified: { type: 'string' },
                      },
                    },
                  },
                  total: { type: 'number' },
                },
                required: ['ec2Instances', 's3Buckets', 'lambdaFunctions', 'rdsInstances', 'total'],
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
          403: {
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
    getDetailedAwsResourceInventoryHandler
  );
} 