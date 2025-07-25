import { User as PrismaUser, AwsAccount as PrismaAwsAccount } from '@prisma/client';

// Clerk JWT Payload
export interface ClerkJWTPayload {
  sub: string; // Clerk user ID
  iss: string; // Issuer
  aud: string; // Audience
  exp: number; // Expiration time
  iat: number; // Issued at time
  sid: string; // Session ID
  [key: string]: any;
}

// Request types
export interface ConnectAwsRequest {
  roleArn: string;
  externalId: string;
  name?: string;
  region?: string;
}

export interface AuthenticatedRequest {
  user: {
    id: string;
    clerkId: string;
    email: string;
  };
}

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ConnectAwsResponse {
  id: string;
  accountId: string;
  name?: string;
  region?: string;
  status: string;
  createdAt: string;
}

export interface AwsResourceCounts {
  ec2Count: number;
  s3Count: number;
  lambdaCount: number;
  rdsCount: number;
}

export interface DetailedAwsResource {
  id: string;
  name: string;
  type: string;
  region: string;
  status: 'healthy' | 'warning' | 'critical';
  state?: string;
  size?: string;
  lastModified: string;
  tags?: Record<string, string>;
}

export interface DetailedResourceInventory {
  ec2Instances: DetailedAwsResource[];
  s3Buckets: DetailedAwsResource[];
  lambdaFunctions: DetailedAwsResource[];
  rdsInstances: DetailedAwsResource[];
  total: number;
}

export interface CloudFormationStackInfo {
  stackId: string;
  stackName: string;
  status: string;
  driftStatus?: string;
  description?: string;
  creationTime: string;
  lastUpdatedTime?: string;
  tags?: Record<string, string>;
  outputs?: Array<{
    outputKey: string;
    outputValue: string;
    description?: string;
  }>;
  parameters?: Record<string, string>;
}

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

export interface CostSummaryRequest {
  granularity?: 'DAILY' | 'MONTHLY';
  startDate?: string;
  endDate?: string;
  days?: number;
}

// Extended Prisma types
export type User = PrismaUser;
export type AwsAccount = PrismaAwsAccount;

// Error types
export class ApiError extends Error {
  public statusCode: number | undefined;
  public code: string | undefined;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: string;
  details: ValidationError[];
}

// Authentication
export interface AuthContext {
  user: User;
  clerkUserId: string;
} 