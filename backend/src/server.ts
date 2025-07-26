import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { validateAuthConfig } from './lib/auth';
import { connectAwsRoutes } from './routes/connectAws';
import { awsAccountRoutes } from './routes/awsAccounts';
import { awsResourcesRoutes } from './routes/awsResources';
import { driftDetectionRoutes, processDriftDetectionJobs } from './routes/driftDetection';
import { costMonitoringRoutes } from './routes/costMonitoring';
import { ApiError } from './types';

// Environment variables validation
function validateEnvironment(): void {
  const required = [
    'DATABASE_URL',
    'CLERK_DOMAIN',
    'PORT'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Create Fastify instance
function createServer(): FastifyInstance {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      ...(process.env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
    trustProxy: true,
    requestIdLogLabel: 'reqId',
    requestIdHeader: 'x-request-id',
  });

  return server;
}

// Register plugins and middleware
async function registerPlugins(server: FastifyInstance): Promise<void> {
  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // CORS configuration
  await server.register(cors, {
    origin: (origin, cb) => {
      const hostname = new URL(origin || 'http://localhost:3000').hostname;
      
      // Allow localhost in development
      if (process.env.NODE_ENV === 'development') {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          cb(null, true);
          return;
        }
      }
      
      // Allow production domains
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (allowedOrigins.includes(origin || '')) {
        cb(null, true);
        return;
      }
      
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });
}

// Register routes
async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check endpoint
  server.get('/health', async (_request, reply) => {
    return reply.send({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // API routes
  await server.register(connectAwsRoutes);
  await server.register(awsAccountRoutes);
  await server.register(awsResourcesRoutes);
  await server.register(driftDetectionRoutes);
  await server.register(costMonitoringRoutes);
}

// Global error handler
function setupErrorHandling(server: FastifyInstance): void {
  server.setErrorHandler(async (error, request, reply) => {
    const logger = request.log;
    
    // Log error details
    logger.error({ 
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      reqId: request.id,
    }, 'Request error');

    // Handle API errors
    if (error instanceof ApiError) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message,
        reqId: request.id,
      });
    }

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: error.validation,
        reqId: request.id,
      });
    }

    // Handle other known errors
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        reqId: request.id,
      });
    }

    // Handle unexpected errors
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      reqId: request.id,
    });
  });

  // Handle 404 errors
  server.setNotFoundHandler(async (request, reply) => {
    const logger = request.log;
    
    logger.warn({ 
      url: request.url,
      method: request.method,
      reqId: request.id,
    }, 'Route not found');

    return reply.status(404).send({
      success: false,
      error: 'Route not found',
      reqId: request.id,
    });
  });
}

// Global background job interval
let driftJobInterval: NodeJS.Timeout | null = null;

// Graceful shutdown
function setupGracefulShutdown(server: FastifyInstance): void {
  const gracefulShutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down gracefully`);
    
    try {
      // Stop background jobs
      if (driftJobInterval) {
        clearInterval(driftJobInterval);
        server.log.info('Background jobs stopped');
      }
      
      await server.close();
      server.log.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      server.log.error(error, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    server.log.fatal(error, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    server.log.fatal({ reason, promise }, 'Unhandled rejection');
    process.exit(1);
  });
}

// Main server startup function
async function startServer(): Promise<void> {
  try {
    // Validate environment
    validateEnvironment();
    validateAuthConfig();

    // Create server
    const server = createServer();

    // Setup error handling
    setupErrorHandling(server);

    // Register plugins
    await registerPlugins(server);

    // Register routes
    await registerRoutes(server);

    // Setup graceful shutdown
    setupGracefulShutdown(server);

    // Start server
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    
    server.log.info(`🚀 CloudGuard Watch API server started successfully`);
    server.log.info(`📡 Server listening on ${host}:${port}`);
    server.log.info(`🏥 Health check available at http://${host}:${port}/health`);
    server.log.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start background job processing for drift detection
    const processDriftJobs = async () => {
      try {
        await processDriftDetectionJobs();
      } catch (error) {
        server.log.error(error, 'Error processing drift detection jobs');
      }
    };

    // Process drift detection jobs every 2 minutes
    driftJobInterval = setInterval(processDriftJobs, 2 * 60 * 1000);

    // Process initial drift jobs
    processDriftJobs();

    server.log.info(`⚙️ Background drift detection jobs started (every 2 minutes)`);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { createServer, startServer };
export default startServer; 