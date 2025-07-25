import { 
  CostExplorerClient, 
  GetCostAndUsageCommand,
  GetCostAndUsageRequest,
  GetCostAndUsageResponse,
  GetRightsizingRecommendationCommand,
  Granularity,
  GroupDefinition,
  Metric
} from '@aws-sdk/client-cost-explorer';
import { ApiError } from '../types';
import { AwsCredentials } from './awsHelpers';

export interface CostEntry {
  date: string;
  service: string;
  amount: string;
  unit: string;
  usageType?: string;
  operation?: string;
}

export interface CostSummaryData {
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

export interface CostTrend {
  date: string;
  amount: string;
  previousAmount: string | undefined;
  changePercent: number | undefined;
}

export type CostGranularity = 'DAILY' | 'MONTHLY';

/**
 * Get Cost Explorer client with credentials
 * Note: Cost Explorer is only available in us-east-1 region
 */
function getCostExplorerClient(credentials: AwsCredentials): CostExplorerClient {
  return new CostExplorerClient({
    region: 'us-east-1', // Cost Explorer only works in us-east-1
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

/**
 * Format date for AWS Cost Explorer API (YYYY-MM-DD format)
 */
function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get cost and usage data from AWS Cost Explorer
 */
export async function getCostAndUsage(
  credentials: AwsCredentials,
  startDate: Date,
  endDate: Date,
  granularity: CostGranularity = 'DAILY',
  groupByService: boolean = true
): Promise<CostSummaryData> {
  try {
    const client = getCostExplorerClient(credentials);
    
    // Prepare group by clause
    const groupBy: GroupDefinition[] = [];
    if (groupByService) {
      groupBy.push({
        Type: 'DIMENSION',
        Key: 'SERVICE' as any, // AWS SDK types are inconsistent
      });
    }

    const request: GetCostAndUsageRequest = {
      TimePeriod: {
        Start: formatDateForAPI(startDate),
        End: formatDateForAPI(endDate),
      },
      Granularity: granularity as Granularity,
      Metrics: ['UnblendedCost' as Metric],
      GroupBy: groupBy,
    };

    const command = new GetCostAndUsageCommand(request);
    const response: GetCostAndUsageResponse = await client.send(command);

    if (!response.ResultsByTime) {
      throw new ApiError('No cost data returned from AWS Cost Explorer', 404);
    }

    // Process the response into our format
    const entries: CostEntry[] = [];
    let totalAmount = 0;
    const serviceAmounts: { [service: string]: number } = {};

    for (const result of response.ResultsByTime) {
      const date = result.TimePeriod?.Start || '';
      
      if (result.Groups && result.Groups.length > 0) {
        // Grouped by service
        for (const group of result.Groups) {
          const service = group.Keys?.[0] || 'Unknown Service';
          const cost = group.Metrics?.UnblendedCost;
          
          if (cost && cost.Amount) {
            const amount = parseFloat(cost.Amount);
            const unit = cost.Unit || 'USD';
            
            entries.push({
              date,
              service,
              amount: cost.Amount,
              unit,
            });

            totalAmount += amount;
            serviceAmounts[service] = (serviceAmounts[service] || 0) + amount;
          }
        }
      } else if (result.Total?.UnblendedCost) {
        // Not grouped - total for the period
        const cost = result.Total.UnblendedCost;
        if (cost.Amount) {
          const amount = parseFloat(cost.Amount);
          
          entries.push({
            date,
            service: 'Total',
            amount: cost.Amount,
            unit: cost.Unit || 'USD',
          });

          totalAmount += amount;
        }
      }
    }

    // Calculate top services
    const topServices = Object.entries(serviceAmounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([service, amount]) => ({
        service,
        amount: amount.toFixed(4),
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }));

    return {
      startDate: formatDateForAPI(startDate),
      endDate: formatDateForAPI(endDate),
      granularity,
      totalAmount: totalAmount.toFixed(4),
      unit: entries.length > 0 ? entries[0].unit : 'USD',
      entries,
      topServices,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle AWS-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const awsError = error as any;
      
      if (awsError.name === 'AccessDeniedException') {
        throw new ApiError(
          'Access denied to Cost Explorer. Please ensure your IAM role has cost:GetCostAndUsage permission.',
          403
        );
      }
      
      if (awsError.name === 'DataUnavailableException') {
        throw new ApiError(
          'Cost data is not available for the requested time period. Data may not be ready yet.',
          404
        );
      }
      
      if (awsError.name === 'InvalidNextTokenException') {
        throw new ApiError(
          'Invalid pagination token provided.',
          400
        );
      }
    }
    
    throw new ApiError(
      `Failed to fetch cost data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get cost trends with comparison to previous period
 */
export async function getCostTrends(
  credentials: AwsCredentials,
  startDate: Date,
  endDate: Date,
  granularity: CostGranularity = 'DAILY'
): Promise<CostTrend[]> {
  try {
    // Calculate the duration for comparison period
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());

    // Get current period costs
    const currentPeriod = await getCostAndUsage(
      credentials,
      startDate,
      endDate,
      granularity,
      false // Don't group by service for trends
    );

    // Get previous period costs for comparison
    const previousPeriod = await getCostAndUsage(
      credentials,
      previousStartDate,
      previousEndDate,
      granularity,
      false
    );

    // Create a map of previous period costs by date
    const previousCosts: { [date: string]: number } = {};
    for (const entry of previousPeriod.entries) {
      // Adjust the date to match current period for comparison
      const originalDate = new Date(entry.date);
      const adjustedDate = new Date(originalDate.getTime() + periodDuration);
      const adjustedDateStr = formatDateForAPI(adjustedDate);
      previousCosts[adjustedDateStr] = parseFloat(entry.amount);
    }

    // Build trends with comparisons
    const trends: CostTrend[] = currentPeriod.entries.map(entry => {
      const currentAmount = parseFloat(entry.amount);
      const previousAmount = previousCosts[entry.date];
      
      let changePercent: number | undefined;
      if (previousAmount !== undefined && previousAmount > 0) {
        changePercent = ((currentAmount - previousAmount) / previousAmount) * 100;
      }

      return {
        date: entry.date,
        amount: entry.amount,
        previousAmount: previousAmount?.toFixed(4),
        changePercent: changePercent ? parseFloat(changePercent.toFixed(2)) : undefined,
      };
    });

    return trends;

  } catch (error) {
    throw new ApiError(
      `Failed to fetch cost trends: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get cost breakdown by service for a specific time period
 */
export async function getCostByService(
  credentials: AwsCredentials,
  startDate: Date,
  endDate: Date,
  topN: number = 10
): Promise<Array<{ service: string; amount: string; unit: string; percentage: number }>> {
  try {
    const costData = await getCostAndUsage(
      credentials,
      startDate,
      endDate,
      'MONTHLY', // Use monthly for service breakdown
      true
    );

    // Aggregate costs by service
    const serviceAmounts: { [service: string]: { amount: number; unit: string } } = {};
    let totalAmount = 0;

    for (const entry of costData.entries) {
      const amount = parseFloat(entry.amount);
      
      if (serviceAmounts[entry.service]) {
        serviceAmounts[entry.service].amount += amount;
      } else {
        serviceAmounts[entry.service] = {
          amount,
          unit: entry.unit,
        };
      }
      
      totalAmount += amount;
    }

    // Sort by amount and take top N
    const sortedServices = Object.entries(serviceAmounts)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, topN);

    return sortedServices.map(([service, data]) => ({
      service,
      amount: data.amount.toFixed(4),
      unit: data.unit,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }));

  } catch (error) {
    throw new ApiError(
      `Failed to fetch cost breakdown by service: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get cost data for the last N days
 */
export async function getRecentCosts(
  credentials: AwsCredentials,
  days: number = 30
): Promise<CostSummaryData> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return getCostAndUsage(credentials, startDate, endDate, 'DAILY', true);
}

/**
 * Get monthly cost summary for a specific month
 */
export async function getMonthlyCosts(
  credentials: AwsCredentials,
  year: number,
  month: number
): Promise<CostSummaryData> {
  const startDate = new Date(year, month - 1, 1); // month is 0-indexed
  const endDate = new Date(year, month, 1); // First day of next month

  return getCostAndUsage(credentials, startDate, endDate, 'DAILY', true);
} 