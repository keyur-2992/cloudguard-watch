import { useAuth } from '@clerk/clerk-react';

// API Configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  reqId?: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: string;
  details: {
    field: string;
    message: string;
    code: string;
  }[];
}

export interface ConnectAwsRequest {
  roleArn: string;
  externalId: string;
  name?: string;
  region?: string;
}

export interface ConnectAwsResponse {
  id: string;
  accountId: string;
  name?: string;
  region?: string;
  status: string;
  createdAt: string;
}

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

// Custom error class for API errors
export class ApiError extends Error {
  public statusCode: number;
  public details?: any;
  public reqId?: string;

  constructor(message: string, statusCode: number, details?: any, reqId?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.reqId = reqId;
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...requestOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(requestOptions.headers as Record<string, string> || {}),
  };

  // Add authorization header if token is provided
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...requestOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.details,
        data.reqId
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'Unable to connect to server. Please check your internet connection.',
        0
      );
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
}

// API service functions
export const apiService = {
  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    return apiRequest('/health');
  },

  // Connect AWS account
  async connectAws(
    data: ConnectAwsRequest,
    token: string
  ): Promise<ApiResponse<ConnectAwsResponse>> {
    return apiRequest('/api/connect-aws', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  // Get user's AWS accounts
  async getAwsAccounts(token: string): Promise<ApiResponse<AwsAccountsListResponse>> {
    return apiRequest('/api/aws-accounts', {
      method: 'GET',
      token,
    });
  },

  // Delete/disconnect AWS account
  async deleteAwsAccount(
    accountId: string,
    token: string
  ): Promise<ApiResponse<void>> {
    return apiRequest(`/api/aws-accounts/${encodeURIComponent(accountId)}`, {
      method: 'DELETE',
      token,
    });
  },

  // Get AWS resource counts
  async getAwsResources(token: string): Promise<ApiResponse<AwsResourceCounts>> {
    return apiRequest('/api/aws/resources', {
      method: 'GET',
      token,
    });
  },

  // Get detailed AWS resource inventory
  async getDetailedAwsResources(token: string): Promise<ApiResponse<DetailedResourceInventory>> {
    return apiRequest('/api/aws/resources/detailed', {
      method: 'GET',
      token,
    });
  },

  // Get CloudFormation stacks with drift status
  async getDriftStacks(token: string): Promise<ApiResponse<DriftStacksResponse>> {
    return apiRequest('/api/drift/stacks', {
      method: 'GET',
      token,
    });
  },

  // Trigger drift detection for a stack
  async triggerDriftDetection(
    data: TriggerDriftRequest,
    token: string
  ): Promise<ApiResponse<TriggerDriftResponse>> {
    return apiRequest('/api/drift/trigger', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  // Get cost summary
  async getCostSummary(
    params: CostSummaryRequest,
    token: string
  ): Promise<ApiResponse<CostSummaryResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params.granularity) queryParams.append('granularity', params.granularity);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.days) queryParams.append('days', params.days.toString());
    
    const url = `/api/cost/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return apiRequest(url, {
      method: 'GET',
      token,
    });
  },

  // Get cost trends
  async getCostTrends(
    params: CostSummaryRequest,
    token: string
  ): Promise<ApiResponse<CostTrendsResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params.granularity) queryParams.append('granularity', params.granularity);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.days) queryParams.append('days', params.days.toString());
    
    const url = `/api/cost/trends${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return apiRequest(url, {
      method: 'GET',
      token,
    });
  },
};

// Hook for authenticated API calls
export function useApiService() {
  const { getToken } = useAuth();

  const makeAuthenticatedRequest = async <T>(
    apiCall: (token: string) => Promise<T>
  ): Promise<T> => {
    try {
      const token = await getToken({ template: '__session' });
      if (!token) {
        throw new ApiError('Not authenticated', 401);
      }
      return await apiCall(token);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        // Handle authentication errors
        throw new ApiError('Session expired. Please sign in again.', 401);
      }
      throw error;
    }
  };

  return {
    connectAws: (data: ConnectAwsRequest) =>
      makeAuthenticatedRequest((token) => apiService.connectAws(data, token)),
    
    getAwsAccounts: () =>
      makeAuthenticatedRequest((token) => apiService.getAwsAccounts(token)),
    
    deleteAwsAccount: (accountId: string) =>
      makeAuthenticatedRequest((token) => apiService.deleteAwsAccount(accountId, token)),
    
    getAwsResources: () =>
      makeAuthenticatedRequest((token) => apiService.getAwsResources(token)),
    
    getDetailedAwsResources: () =>
      makeAuthenticatedRequest((token) => apiService.getDetailedAwsResources(token)),
    
    getDriftStacks: () =>
      makeAuthenticatedRequest((token) => apiService.getDriftStacks(token)),
    
    triggerDriftDetection: (data: TriggerDriftRequest) =>
      makeAuthenticatedRequest((token) => apiService.triggerDriftDetection(data, token)),
    
    getCostSummary: (params: CostSummaryRequest = {}) =>
      makeAuthenticatedRequest((token) => apiService.getCostSummary(params, token)),
    
    getCostTrends: (params: CostSummaryRequest = {}) =>
      makeAuthenticatedRequest((token) => apiService.getCostTrends(params, token)),
    
    healthCheck: () => apiService.healthCheck(),
  };
} 