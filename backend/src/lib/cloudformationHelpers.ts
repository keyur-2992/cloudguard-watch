import { 
  CloudFormationClient, 
  DescribeStacksCommand, 
  DetectStackDriftCommand,
  DescribeStackDriftDetectionStatusCommand,
  DescribeStackResourceDriftsCommand,
  Stack,
  StackDriftDetectionStatus as AWSStackDriftDetectionStatus,
  StackResourceDrift
} from '@aws-sdk/client-cloudformation';
import { ApiError } from '../types';
import { AwsCredentials } from './awsHelpers';

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

export interface DriftDetectionResult {
  driftDetectionId: string;
  status: string; // DETECTION_IN_PROGRESS, DETECTION_COMPLETE, DETECTION_FAILED
  driftStatus?: string; // IN_SYNC, DRIFTED, UNKNOWN
  failureReason?: string;
  timestamp: string;
}

export interface StackResourceDriftInfo {
  logicalResourceId: string;
  resourceType: string;
  physicalResourceId?: string;
  driftStatus: string; // IN_SYNC, MODIFIED, DELETED, NOT_CHECKED
  actualProperties?: Record<string, any>;
  expectedProperties?: Record<string, any>;
  propertyDifferences?: Array<{
    propertyPath: string;
    expectedValue: any;
    actualValue: any;
    differenceType: string;
  }>;
}

/**
 * Get CloudFormation client with credentials
 */
function getCloudFormationClient(credentials: AwsCredentials): CloudFormationClient {
  return new CloudFormationClient({
    region: credentials.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

/**
 * List all CloudFormation stacks in the account
 */
export async function listCloudFormationStacks(
  credentials: AwsCredentials
): Promise<CloudFormationStackInfo[]> {
  try {
    const client = getCloudFormationClient(credentials);
    const command = new DescribeStacksCommand({});
    
    const response = await client.send(command);
    const stacks: CloudFormationStackInfo[] = [];

    if (response.Stacks) {
      for (const stack of response.Stacks) {
        if (stack.StackName && stack.StackId && stack.StackStatus && stack.CreationTime) {
          // Transform tags from AWS format to simple object
          const tags: Record<string, string> = {};
          if (stack.Tags) {
            for (const tag of stack.Tags) {
              if (tag.Key && tag.Value) {
                tags[tag.Key] = tag.Value;
              }
            }
          }

          // Transform outputs
          const outputs = stack.Outputs?.map(output => ({
            outputKey: output.OutputKey || '',
            outputValue: output.OutputValue || '',
            description: output.Description,
          })) || [];

          // Transform parameters
          const parameters: Record<string, string> = {};
          if (stack.Parameters) {
            for (const param of stack.Parameters) {
              if (param.ParameterKey && param.ParameterValue) {
                parameters[param.ParameterKey] = param.ParameterValue;
              }
            }
          }

          stacks.push({
            stackId: stack.StackId,
            stackName: stack.StackName,
            status: stack.StackStatus,
            driftStatus: stack.DriftInformation?.StackDriftStatus,
            description: stack.Description,
            creationTime: stack.CreationTime.toISOString(),
            lastUpdatedTime: stack.LastUpdatedTime?.toISOString(),
            tags: Object.keys(tags).length > 0 ? tags : undefined,
            outputs: outputs.length > 0 ? outputs : undefined,
            parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
          });
        }
      }
    }

    return stacks;
  } catch (error) {
    throw new ApiError(
      `Failed to list CloudFormation stacks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get details of a specific CloudFormation stack
 */
export async function getCloudFormationStack(
  credentials: AwsCredentials,
  stackName: string
): Promise<CloudFormationStackInfo> {
  try {
    const client = getCloudFormationClient(credentials);
    const command = new DescribeStacksCommand({
      StackName: stackName,
    });
    
    const response = await client.send(command);
    
    if (!response.Stacks || response.Stacks.length === 0) {
      throw new ApiError(`Stack '${stackName}' not found`, 404);
    }

    const stack = response.Stacks[0];
    
    if (!stack.StackName || !stack.StackId || !stack.StackStatus || !stack.CreationTime) {
      throw new ApiError(`Invalid stack data for '${stackName}'`, 500);
    }

    // Transform the stack data (same logic as listCloudFormationStacks)
    const tags: Record<string, string> = {};
    if (stack.Tags) {
      for (const tag of stack.Tags) {
        if (tag.Key && tag.Value) {
          tags[tag.Key] = tag.Value;
        }
      }
    }

    const outputs = stack.Outputs?.map(output => ({
      outputKey: output.OutputKey || '',
      outputValue: output.OutputValue || '',
      description: output.Description,
    })) || [];

    const parameters: Record<string, string> = {};
    if (stack.Parameters) {
      for (const param of stack.Parameters) {
        if (param.ParameterKey && param.ParameterValue) {
          parameters[param.ParameterKey] = param.ParameterValue;
        }
      }
    }

    return {
      stackId: stack.StackId,
      stackName: stack.StackName,
      status: stack.StackStatus,
      driftStatus: stack.DriftInformation?.StackDriftStatus,
      description: stack.Description,
      creationTime: stack.CreationTime.toISOString(),
      lastUpdatedTime: stack.LastUpdatedTime?.toISOString(),
      tags: Object.keys(tags).length > 0 ? tags : undefined,
      outputs: outputs.length > 0 ? outputs : undefined,
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      `Failed to get CloudFormation stack '${stackName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Trigger drift detection for a CloudFormation stack
 */
export async function triggerStackDriftDetection(
  credentials: AwsCredentials,
  stackName: string
): Promise<string> {
  try {
    const client = getCloudFormationClient(credentials);
    const command = new DetectStackDriftCommand({
      StackName: stackName,
    });
    
    const response = await client.send(command);
    
    if (!response.StackDriftDetectionId) {
      throw new ApiError('No drift detection ID returned from AWS', 500);
    }

    return response.StackDriftDetectionId;
  } catch (error) {
    throw new ApiError(
      `Failed to trigger drift detection for stack '${stackName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get the status of a drift detection operation
 */
export async function getDriftDetectionStatus(
  credentials: AwsCredentials,
  driftDetectionId: string
): Promise<DriftDetectionResult> {
  try {
    const client = getCloudFormationClient(credentials);
    const command = new DescribeStackDriftDetectionStatusCommand({
      StackDriftDetectionId: driftDetectionId,
    });
    
    const response = await client.send(command);
    
    if (!response.DetectionStatus) {
      throw new ApiError('No detection status returned from AWS', 500);
    }

    return {
      driftDetectionId,
      status: response.DetectionStatus,
      driftStatus: response.StackDriftStatus,
      failureReason: response.DetectionStatusReason,
      timestamp: response.Timestamp?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    throw new ApiError(
      `Failed to get drift detection status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get detailed drift information for stack resources
 */
export async function getStackResourceDrifts(
  credentials: AwsCredentials,
  stackName: string
): Promise<StackResourceDriftInfo[]> {
  try {
    const client = getCloudFormationClient(credentials);
    const command = new DescribeStackResourceDriftsCommand({
      StackName: stackName,
    });
    
    const response = await client.send(command);
    const drifts: StackResourceDriftInfo[] = [];

    if (response.StackResourceDrifts) {
      for (const drift of response.StackResourceDrifts) {
        if (drift.LogicalResourceId && drift.ResourceType && drift.StackResourceDriftStatus) {
          // Transform property differences
          const propertyDifferences = drift.PropertyDifferences?.map(diff => ({
            propertyPath: diff.PropertyPath || '',
            expectedValue: diff.ExpectedValue,
            actualValue: diff.ActualValue,
            differenceType: diff.DifferenceType || 'UNKNOWN',
          })) || [];

          drifts.push({
            logicalResourceId: drift.LogicalResourceId,
            resourceType: drift.ResourceType,
            physicalResourceId: drift.PhysicalResourceId,
            driftStatus: drift.StackResourceDriftStatus,
            actualProperties: drift.ActualProperties ? JSON.parse(drift.ActualProperties) : undefined,
            expectedProperties: drift.ExpectedProperties ? JSON.parse(drift.ExpectedProperties) : undefined,
            propertyDifferences: propertyDifferences.length > 0 ? propertyDifferences : undefined,
          });
        }
      }
    }

    return drifts;
  } catch (error) {
    throw new ApiError(
      `Failed to get stack resource drifts for '${stackName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
} 