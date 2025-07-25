import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../lib/auth';
import { prisma } from '../prisma/client';
import { assumeRole } from '../lib/awsHelpers';
import { 
  listCloudFormationStacks, 
  triggerStackDriftDetection,
  getDriftDetectionStatus,
  getStackResourceDrifts,
  CloudFormationStackInfo 
} from '../lib/cloudformationHelpers';
import { ApiResponse, ApiError } from '../types';
import { AwsCredentials } from '../lib/awsHelpers';

// Request/Response types
export interface DriftStacksResponse {
  stacks: CloudFormationStackInfo[];
  total: number;
}

export interface TriggerDriftRequest {
  stackName: string;
}

export interface TriggerDriftResponse {
  driftDetectionId: string;
  stackName: string;
  status: string;
  message: string;
}

// Validation schemas
const triggerDriftSchema = z.object({
  stackName: z.string().min(1, 'Stack name is required'),
});

// Rate limiting configuration
const rateLimitOptions = {
  max: 20, // Maximum 20 requests
  timeWindow: '1 minute', // Per minute
  keyGenerator: (request: FastifyRequest) => {
    return request.headers.authorization || request.ip;
  },
};

// Helper function to get AWS credentials for user's account
async function getUserAwsCredentials(userId: string): Promise<{
  credentials: AwsCredentials;
  awsAccount: any;
}> {
  // Find user's connected AWS accounts
  const awsAccounts = await prisma.awsAccount.findMany({
    where: {
      userId: userId,
      status: 'connected',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (awsAccounts.length === 0) {
    throw new ApiError('No connected AWS accounts found. Please connect an AWS account first.', 404);
  }

  // Use the first (most recent) connected account
  const primaryAccount = awsAccounts[0]!;

  // Assume role to get temporary credentials
  const assumedRole = await assumeRole(primaryAccount.roleArn, primaryAccount.externalId);

  const credentials: AwsCredentials = {
    accessKeyId: assumedRole.accessKeyId,
    secretAccessKey: assumedRole.secretAccessKey,
    sessionToken: assumedRole.sessionToken,
    region: primaryAccount.region || 'us-east-1',
  };

  return { credentials, awsAccount: primaryAccount };
}

// List CloudFormation stacks with drift status
async function listStacksHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ApiResponse<DriftStacksResponse>> {
  const logger = request.log;
  const reqId = request.id;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    logger.info({ userId: user.id, reqId }, 'Fetching CloudFormation stacks for user');

    // Get AWS credentials
    const { credentials, awsAccount } = await getUserAwsCredentials(user.id);

    // Fetch stacks from AWS
    const startTime = Date.now();
    const awsStacks = await listCloudFormationStacks(credentials);
    const fetchTime = Date.now() - startTime;

    // Update database with stack information
    for (const stack of awsStacks) {
      await prisma.cloudFormationStack.upsert({
        where: {
          awsAccountId_stackName_region: {
            awsAccountId: awsAccount.accountId,
            stackName: stack.stackName,
            region: credentials.region || 'us-east-1',
          },
        },
        update: {
          status: stack.status,
          driftStatus: stack.driftStatus || null,
          description: stack.description || null,
          tags: stack.tags || {},
          outputs: stack.outputs || [],
          parameters: stack.parameters || {},
          updatedAt: new Date(),
        },
        create: {
          awsAccountDbId: awsAccount.id,
          awsAccountId: awsAccount.accountId,
          stackName: stack.stackName,
          stackId: stack.stackId,
          status: stack.status,
          driftStatus: stack.driftStatus || null,
          description: stack.description || null,
          region: credentials.region || 'us-east-1',
          tags: stack.tags || {},
          outputs: stack.outputs || [],
          parameters: stack.parameters || {},
        },
      });
    }

    logger.info({ 
      userId: user.id, 
      accountId: awsAccount.accountId,
      stackCount: awsStacks.length,
      fetchTimeMs: fetchTime,
      reqId 
    }, 'Successfully fetched CloudFormation stacks');

    return reply.status(200).send({
      success: true,
      data: {
        stacks: awsStacks,
        total: awsStacks.length,
      },
      message: 'CloudFormation stacks retrieved successfully',
    });

  } catch (error) {
    // Handle authentication errors
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn({ reqId }, 'Authentication failed for drift stacks fetch');
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
      }, 'AWS API error during stacks fetch');
      
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }

    // Handle unexpected errors
    logger.error({ error, reqId }, 'Unexpected error fetching CloudFormation stacks');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Trigger drift detection for a specific stack
async function triggerDriftHandler(
  request: FastifyRequest<{ Body: TriggerDriftRequest }>,
  reply: FastifyReply
): Promise<ApiResponse<TriggerDriftResponse>> {
  const logger = request.log;
  const reqId = request.id;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    // Validate request body
    const validationResult = triggerDriftSchema.safeParse(request.body);
    
    if (!validationResult.success) {
      logger.warn({ 
        userId: user.id, 
        errors: validationResult.error.issues 
      }, 'Validation failed for drift trigger request');

      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const { stackName } = validationResult.data;

    logger.info({ 
      userId: user.id, 
      stackName,
      reqId 
    }, 'Triggering drift detection for stack');

    // Get AWS credentials
    const { credentials, awsAccount } = await getUserAwsCredentials(user.id);

    // Trigger drift detection
    const driftDetectionId = await triggerStackDriftDetection(credentials, stackName);

    // Store drift detection job in database
    await prisma.driftDetectionJob.create({
      data: {
        awsAccountId: awsAccount.accountId,
        stackName: stackName,
        region: credentials.region || 'us-east-1',
        driftDetectionId: driftDetectionId,
        status: 'DETECTION_IN_PROGRESS',
      },
    });

    // Update stack drift status in database
    await prisma.cloudFormationStack.updateMany({
      where: {
        awsAccountId: awsAccount.accountId,
        stackName: stackName,
        region: credentials.region || 'us-east-1',
      },
      data: {
        driftDetectionId: driftDetectionId,
        driftStatus: 'DETECTION_IN_PROGRESS',
        detectionTime: new Date(),
      },
    });

    logger.info({ 
      userId: user.id, 
      stackName,
      driftDetectionId,
      reqId 
    }, 'Successfully triggered drift detection');

    return reply.status(200).send({
      success: true,
      data: {
        driftDetectionId,
        stackName,
        status: 'DETECTION_IN_PROGRESS',
        message: 'Drift detection started successfully',
      },
      message: 'Drift detection triggered successfully',
    });

  } catch (error) {
    // Handle authentication errors
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn({ reqId }, 'Authentication failed for drift trigger');
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
      }, 'AWS API error during drift trigger');
      
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }

    // Handle unexpected errors
    logger.error({ error, reqId }, 'Unexpected error triggering drift detection');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Background job to check drift detection status
export async function processDriftDetectionJobs(): Promise<void> {
  try {
    // Find pending drift detection jobs
    const pendingJobs = await prisma.driftDetectionJob.findMany({
      where: {
        status: 'DETECTION_IN_PROGRESS',
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    for (const job of pendingJobs) {
      try {
        // Get AWS account details
        const awsAccount = await prisma.awsAccount.findFirst({
          where: {
            accountId: job.awsAccountId,
            status: 'connected',
          },
        });

        if (!awsAccount) {
          // Mark job as failed if AWS account not found
          await prisma.driftDetectionJob.update({
            where: { id: job.id },
            data: {
              status: 'DETECTION_FAILED',
              failureReason: 'AWS account not found or disconnected',
              completedAt: new Date(),
            },
          });
          continue;
        }

        // Get credentials and check drift status
        const assumedRole = await assumeRole(awsAccount.roleArn, awsAccount.externalId);
        const credentials: AwsCredentials = {
          accessKeyId: assumedRole.accessKeyId,
          secretAccessKey: assumedRole.secretAccessKey,
          sessionToken: assumedRole.sessionToken,
          region: job.region,
        };

        const driftResult = await getDriftDetectionStatus(credentials, job.driftDetectionId);

        // Update job status
        await prisma.driftDetectionJob.update({
          where: { id: job.id },
          data: {
            status: driftResult.status,
            failureReason: driftResult.failureReason || null,
            completedAt: driftResult.status !== 'DETECTION_IN_PROGRESS' ? new Date() : null,
          },
        });

        // Update stack drift status if detection is complete
        if (driftResult.status === 'DETECTION_COMPLETE' && driftResult.driftStatus) {
          await prisma.cloudFormationStack.updateMany({
            where: {
              awsAccountId: job.awsAccountId,
              stackName: job.stackName,
              region: job.region,
            },
            data: {
              driftStatus: driftResult.driftStatus,
              detectionTime: new Date(),
            },
          });

          // If stack is drifted, get detailed drift information
          if (driftResult.driftStatus === 'DRIFTED') {
            try {
              const resourceDrifts = await getStackResourceDrifts(credentials, job.stackName);
              
              // Find the stack record
              const stack = await prisma.cloudFormationStack.findFirst({
                where: {
                  awsAccountId: job.awsAccountId,
                  stackName: job.stackName,
                  region: job.region,
                },
              });

              if (stack) {
                // Clear existing drift results for this stack
                await prisma.stackDriftResult.deleteMany({
                  where: { stackId: stack.id },
                });

                // Insert new drift results
                for (const drift of resourceDrifts) {
                  await prisma.stackDriftResult.create({
                    data: {
                      stackId: stack.id,
                      resourceLogicalId: drift.logicalResourceId,
                      resourceType: drift.resourceType,
                      resourcePhysicalId: drift.physicalResourceId || null,
                      driftStatus: drift.driftStatus,
                      actualProperties: drift.actualProperties || {},
                      expectedProperties: drift.expectedProperties || {},
                      propertyDifferences: drift.propertyDifferences || [],
                    },
                  });
                }
              }
            } catch (error) {
              console.error(`Failed to get detailed drift for stack ${job.stackName}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing drift detection job ${job.id}:`, error);
        
        // Mark job as failed
        await prisma.driftDetectionJob.update({
          where: { id: job.id },
          data: {
            status: 'DETECTION_FAILED',
            failureReason: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error('Error processing drift detection jobs:', error);
  }
}

// Register drift detection routes
export async function driftDetectionRoutes(fastify: FastifyInstance) {
  // Apply rate limiting to these routes
  await fastify.register(require('@fastify/rate-limit'), rateLimitOptions);

  // GET /api/drift/stacks - List CloudFormation stacks with drift status
  fastify.get(
    '/api/drift/stacks',
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
                  stacks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        stackId: { type: 'string' },
                        stackName: { type: 'string' },
                        status: { type: 'string' },
                        driftStatus: { type: 'string' },
                        description: { type: 'string' },
                        creationTime: { type: 'string' },
                        lastUpdatedTime: { type: 'string' },
                        tags: { type: 'object' },
                        outputs: { type: 'array' },
                        parameters: { type: 'object' },
                      },
                    },
                  },
                  total: { type: 'number' },
                },
                required: ['stacks', 'total'],
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    listStacksHandler
  );

  // POST /api/drift/trigger - Trigger drift detection for a stack
  fastify.post<{ Body: TriggerDriftRequest }>(
    '/api/drift/trigger',
    {
      schema: {
        body: {
          type: 'object',
          required: ['stackName'],
          properties: {
            stackName: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  driftDetectionId: { type: 'string' },
                  stackName: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                },
                required: ['driftDetectionId', 'stackName', 'status', 'message'],
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    triggerDriftHandler
  );
} 