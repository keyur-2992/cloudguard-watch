import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../lib/auth';
import { prisma } from '../prisma/client';
import { assumeRole } from '../lib/awsHelpers';
import { ApiResponse, ApiError } from '../types';
import { AwsCredentials } from '../lib/awsHelpers';

// Import cost helpers (with fallback for type issues)
let getCostAndUsage: any;
let getCostTrends: any;
let getCostByService: any;
let getRecentCosts: any;

try {
  const costHelpers = require('../lib/costExplorerHelpers');
  getCostAndUsage = costHelpers.getCostAndUsage;
  getCostTrends = costHelpers.getCostTrends;
  getCostByService = costHelpers.getCostByService;
  getRecentCosts = costHelpers.getRecentCosts;
} catch (error) {
  console.warn('Cost Explorer helpers not available:', error);
}

// Request/Response types
export interface CostSummaryRequest {
  granularity?: 'DAILY' | 'MONTHLY';
  startDate?: string;
  endDate?: string;
  days?: number;
}

export interface CostEntry {
  date: string;
  service: string;
  amount: string;
  unit: string;
}

export interface CostSummaryResponse {
  startDate: string;
  endDate: string;
  granularity: string;
  totalAmount: string;
  unit: string;
  entries: CostEntry[];
  topServices: Array<{
    service: string;
    amount: string;
    percentage: number;
  }>;
}

export interface CostTrendsResponse {
  trends: Array<{
    date: string;
    amount: string;
    previousAmount?: string;
    changePercent?: number;
  }>;
}

// Validation schemas
const costSummarySchema = z.object({
  granularity: z.enum(['DAILY', 'MONTHLY']).optional().default('DAILY'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.number().min(1).max(365).optional().default(30),
});

// Rate limiting configuration
const rateLimitOptions = {
  max: 10, // Maximum 10 requests per minute for cost data
  timeWindow: '1 minute',
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

// Helper function to parse dates or use defaults
function parseDateRange(startDate?: string, endDate?: string, days: number = 30): { start: Date; end: Date } {
  let start: Date;
  let end: Date;

  if (endDate) {
    end = new Date(endDate);
  } else {
    end = new Date();
  }

  if (startDate) {
    start = new Date(startDate);
  } else {
    start = new Date();
    start.setDate(start.getDate() - days);
  }

  return { start, end };
}

// Get cost summary for a time period
async function getCostSummaryHandler(
  request: FastifyRequest<{ Querystring: CostSummaryRequest }>,
  reply: FastifyReply
): Promise<ApiResponse<CostSummaryResponse>> {
  const logger = request.log;
  const reqId = request.id;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    // Validate query parameters
    const validationResult = costSummarySchema.safeParse(request.query);
    
    if (!validationResult.success) {
      logger.warn({ 
        userId: user.id, 
        errors: validationResult.error.issues 
      }, 'Validation failed for cost summary request');

      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const { granularity, startDate, endDate, days } = validationResult.data;

    logger.info({ 
      userId: user.id,
      granularity,
      startDate,
      endDate,
      days,
      reqId 
    }, 'Fetching cost summary for user');

    // Check if cost helpers are available
    if (!getCostAndUsage) {
      return reply.status(503).send({
        success: false,
        error: 'Cost Explorer functionality is temporarily unavailable',
      });
    }

    // Get AWS credentials
    const { credentials, awsAccount } = await getUserAwsCredentials(user.id);

    // Parse date range
    const { start, end } = parseDateRange(startDate, endDate, days);

    // Fetch cost data from AWS
    const startTime = Date.now();
    const costData = await getCostAndUsage(
      credentials,
      start,
      end,
      granularity,
      true // Group by service
    );
    const fetchTime = Date.now() - startTime;

    // Cache cost data in database (optional - for performance)
    try {
      for (const entry of costData.entries) {
        await prisma.costEntry.upsert({
          where: {
            awsAccountId_date_service_granularity: {
              awsAccountId: awsAccount.accountId,
              date: new Date(entry.date),
              service: entry.service,
              granularity: granularity,
            },
          },
          update: {
            amount: entry.amount,
            unit: entry.unit,
            updatedAt: new Date(),
          },
          create: {
            awsAccountDbId: awsAccount.id,
            awsAccountId: awsAccount.accountId,
            date: new Date(entry.date),
            service: entry.service,
            amount: entry.amount,
            unit: entry.unit,
            granularity: granularity,
          },
        });
      }

      // Store cost summary
      await prisma.costSummary.upsert({
        where: {
          awsAccountId_startDate_endDate_granularity: {
            awsAccountId: awsAccount.accountId,
            startDate: start,
            endDate: end,
            granularity: granularity,
          },
        },
        update: {
          totalAmount: costData.totalAmount,
          unit: costData.unit,
          topServices: costData.topServices,
          updatedAt: new Date(),
        },
        create: {
          awsAccountDbId: awsAccount.id,
          awsAccountId: awsAccount.accountId,
          startDate: start,
          endDate: end,
          granularity: granularity,
          totalAmount: costData.totalAmount,
          unit: costData.unit,
          topServices: costData.topServices,
        },
      });
    } catch (dbError) {
      // Log database errors but don't fail the request
      logger.warn({ error: dbError, reqId }, 'Failed to cache cost data in database');
    }

    logger.info({ 
      userId: user.id, 
      accountId: awsAccount.accountId,
      totalAmount: costData.totalAmount,
      entriesCount: costData.entries.length,
      fetchTimeMs: fetchTime,
      reqId 
    }, 'Successfully fetched cost summary');

    return reply.status(200).send({
      success: true,
      data: costData,
      message: 'Cost summary retrieved successfully',
    });

  } catch (error) {
    // Handle authentication errors
    if (error instanceof ApiError && error.statusCode === 401) {
      logger.warn({ reqId }, 'Authentication failed for cost summary fetch');
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
      }, 'AWS API error during cost summary fetch');
      
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }

    // Handle unexpected errors
    logger.error({ error, reqId }, 'Unexpected error fetching cost summary');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Get cost trends with comparison
async function getCostTrendsHandler(
  request: FastifyRequest<{ Querystring: CostSummaryRequest }>,
  reply: FastifyReply
): Promise<ApiResponse<CostTrendsResponse>> {
  const logger = request.log;
  const reqId = request.id;
  
  try {
    // Authenticate user
    const authContext = await authenticateUser(request.headers.authorization);
    const { user } = authContext;

    // Validate query parameters
    const validationResult = costSummarySchema.safeParse(request.query);
    
    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const { granularity, startDate, endDate, days } = validationResult.data;

    // Check if cost helpers are available
    if (!getCostTrends) {
      return reply.status(503).send({
        success: false,
        error: 'Cost trends functionality is temporarily unavailable',
      });
    }

    // Get AWS credentials
    const { credentials } = await getUserAwsCredentials(user.id);

    // Parse date range
    const { start, end } = parseDateRange(startDate, endDate, days);

    // Fetch cost trends from AWS
    const trends = await getCostTrends(credentials, start, end, granularity);

    logger.info({ 
      userId: user.id,
      trendsCount: trends.length,
      reqId 
    }, 'Successfully fetched cost trends');

    return reply.status(200).send({
      success: true,
      data: { trends },
      message: 'Cost trends retrieved successfully',
    });

  } catch (error) {
    if (error instanceof ApiError) {
      logger.error({ 
        error: error.message, 
        statusCode: error.statusCode,
        reqId 
      }, 'Error fetching cost trends');
      
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }

    logger.error({ error, reqId }, 'Unexpected error fetching cost trends');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Register cost monitoring routes
export async function costMonitoringRoutes(fastify: FastifyInstance) {
  // Apply rate limiting to these routes
  await fastify.register(require('@fastify/rate-limit'), rateLimitOptions);

  // GET /api/cost/summary - Get cost summary
  fastify.get(
    '/api/cost/summary',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            granularity: { type: 'string', enum: ['DAILY', 'MONTHLY'] },
            startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            endDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            days: { type: 'number', minimum: 1, maximum: 365 },
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
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  granularity: { type: 'string' },
                  totalAmount: { type: 'string' },
                  unit: { type: 'string' },
                  entries: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string' },
                        service: { type: 'string' },
                        amount: { type: 'string' },
                        unit: { type: 'string' },
                      },
                    },
                  },
                  topServices: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        service: { type: 'string' },
                        amount: { type: 'string' },
                        percentage: { type: 'number' },
                      },
                    },
                  },
                },
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    getCostSummaryHandler
  );

  // GET /api/cost/trends - Get cost trends with comparison
  fastify.get(
    '/api/cost/trends',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            granularity: { type: 'string', enum: ['DAILY', 'MONTHLY'] },
            startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            endDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            days: { type: 'number', minimum: 1, maximum: 365 },
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
                  trends: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string' },
                        amount: { type: 'string' },
                        previousAmount: { type: 'string' },
                        changePercent: { type: 'number' },
                      },
                    },
                  },
                },
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    getCostTrendsHandler
  );
} 