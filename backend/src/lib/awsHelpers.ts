import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { ApiError } from '../types';

export interface AssumeRoleResult {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  accountId: string;
}

export interface CallerIdentity {
  accountId: string;
  arn: string;
  userId: string;
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  region?: string;
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

/**
 * Assumes an AWS IAM role using cross-account access
 */
export async function assumeRole(
  roleArn: string,
  externalId: string,
  sessionName = 'CloudGuardAssumeRole'
): Promise<AssumeRoleResult> {
  try {
    // Create STS client (uses default credentials or environment)
    const stsClient = new STSClient({ region: 'us-east-1' });
    
    const command = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: sessionName,
      ExternalId: externalId,
      DurationSeconds: 3600, // 1 hour
    });

    const response = await stsClient.send(command);
    
    if (!response.Credentials) {
      throw new ApiError('Failed to assume role: No credentials returned', 400);
    }

    const { AccessKeyId, SecretAccessKey, SessionToken } = response.Credentials;
    
    if (!AccessKeyId || !SecretAccessKey || !SessionToken) {
      throw new ApiError('Failed to assume role: Incomplete credentials', 400);
    }

    // Extract account ID from assumed role ARN
    const accountId = response.AssumedRoleUser?.Arn?.split(':')[4] || '';
    
    if (!accountId) {
      throw new ApiError('Failed to extract account ID from assumed role', 400);
    }

    return {
      accessKeyId: AccessKeyId,
      secretAccessKey: SecretAccessKey,
      sessionToken: SessionToken,
      accountId,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle specific AWS errors
    if (error instanceof Error) {
      if (error.name === 'AccessDenied') {
        throw new ApiError('Access denied: Invalid role ARN or external ID', 403);
      }
      if (error.name === 'InvalidParameterValue') {
        throw new ApiError('Invalid role ARN or external ID format', 400);
      }
      if (error.name === 'TokenRefreshRequired') {
        throw new ApiError('AWS credentials expired or invalid', 401);
      }
    }
    
    throw new ApiError(
      `Failed to assume role: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Gets caller identity using temporary credentials to verify access
 */
export async function getCallerIdentity(credentials: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}): Promise<CallerIdentity> {
  try {
    // Create STS client with temporary credentials
    const stsClient = new STSClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);

    if (!response.Account || !response.Arn || !response.UserId) {
      throw new ApiError('Failed to get caller identity: Incomplete response', 500);
    }

    return {
      accountId: response.Account,
      arn: response.Arn,
      userId: response.UserId,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      `Failed to verify identity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Test AWS connection by assuming role and verifying identity
 */
export async function testAwsConnection(
  roleArn: string,
  externalId: string
): Promise<{ accountId: string; verified: boolean }> {
  try {
    // Step 1: Assume the role
    const assumedRole = await assumeRole(roleArn, externalId);
    
    // Step 2: Verify identity with temporary credentials
    const identity = await getCallerIdentity({
      accessKeyId: assumedRole.accessKeyId,
      secretAccessKey: assumedRole.secretAccessKey,
      sessionToken: assumedRole.sessionToken,
    });
    
    // Verify account IDs match
    if (assumedRole.accountId !== identity.accountId) {
      throw new ApiError('Account ID mismatch during verification', 500);
    }
    
    return {
      accountId: identity.accountId,
      verified: true,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      `AWS connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get running EC2 instance count
 */
export async function getEC2Count(credentials: AwsCredentials): Promise<number> {
  try {
    const ec2Client = new EC2Client({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const command = new DescribeInstancesCommand({
      Filters: [
        {
          Name: 'instance-state-name',
          Values: ['running'],
        },
      ],
    });

    const response = await ec2Client.send(command);
    
    let count = 0;
    if (response.Reservations) {
      for (const reservation of response.Reservations) {
        if (reservation.Instances) {
          count += reservation.Instances.length;
        }
      }
    }

    return count;
  } catch (error) {
    throw new ApiError(
      `Failed to fetch EC2 instances: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get S3 bucket count
 */
export async function getS3Count(credentials: AwsCredentials): Promise<number> {
  try {
    const s3Client = new S3Client({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    return response.Buckets?.length || 0;
  } catch (error) {
    throw new ApiError(
      `Failed to fetch S3 buckets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get Lambda function count
 */
export async function getLambdaCount(credentials: AwsCredentials): Promise<number> {
  try {
    const lambdaClient = new LambdaClient({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    let count = 0;
    let nextMarker: string | undefined;

    do {
      const command = new ListFunctionsCommand({
        Marker: nextMarker,
        MaxItems: 50,
      });

      const response = await lambdaClient.send(command);
      
      if (response.Functions) {
        count += response.Functions.length;
      }
      
      nextMarker = response.NextMarker;
    } while (nextMarker);

    return count;
  } catch (error) {
    throw new ApiError(
      `Failed to fetch Lambda functions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get RDS database instance count
 */
export async function getRDSCount(credentials: AwsCredentials): Promise<number> {
  try {
    const rdsClient = new RDSClient({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const command = new DescribeDBInstancesCommand({
      MaxRecords: 100,
    });

    const response = await rdsClient.send(command);

    return response.DBInstances?.length || 0;
  } catch (error) {
    throw new ApiError(
      `Failed to fetch RDS instances: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get all AWS resource counts for a user's account
 */
export async function getAwsResourceCounts(
  roleArn: string,
  externalId: string,
  region?: string
): Promise<AwsResourceCounts> {
  try {
    // Step 1: Assume the role
    const assumedRole = await assumeRole(roleArn, externalId);
    
    // Step 2: Create credentials object
    const credentials: AwsCredentials = {
      accessKeyId: assumedRole.accessKeyId,
      secretAccessKey: assumedRole.secretAccessKey,
      sessionToken: assumedRole.sessionToken,
      region: region || 'us-east-1',
    };

    // Step 3: Fetch all resource counts in parallel for better performance
    const [ec2Count, s3Count, lambdaCount, rdsCount] = await Promise.all([
      getEC2Count(credentials),
      getS3Count(credentials),
      getLambdaCount(credentials),
      getRDSCount(credentials),
    ]);

    return {
      ec2Count,
      s3Count,
      lambdaCount,
      rdsCount,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      `Failed to fetch AWS resource counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get detailed EC2 instance information
 */
export async function getDetailedEC2Instances(credentials: AwsCredentials): Promise<DetailedAwsResource[]> {
  try {
    const ec2Client = new EC2Client({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const command = new DescribeInstancesCommand({
      Filters: [
        {
          Name: 'instance-state-name',
          Values: ['running', 'stopped', 'pending'],
        },
      ],
    });

    const response = await ec2Client.send(command);
    const resources: DetailedAwsResource[] = [];

    if (response.Reservations) {
      for (const reservation of response.Reservations) {
        if (reservation.Instances) {
          for (const instance of reservation.Instances) {
            const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
            const name = nameTag?.Value || `Instance-${instance.InstanceId?.slice(-8)}`;
            
            // Determine status based on instance state
            let status: 'healthy' | 'warning' | 'critical' = 'healthy';
            if (instance.State?.Name === 'stopped') status = 'warning';
            if (instance.State?.Name === 'shutting-down') status = 'critical';

            const tags = instance.Tags?.reduce((acc, tag) => {
              if (tag.Key && tag.Value) {
                acc[tag.Key] = tag.Value;
              }
              return acc;
            }, {} as Record<string, string>);

            resources.push({
              id: instance.InstanceId || 'unknown',
              name: name,
              type: 'EC2 Instance',
              region: credentials.region || 'us-east-1',
              status: status,
              state: instance.State?.Name || 'unknown',
              size: instance.InstanceType || 'unknown',
              lastModified: instance.LaunchTime?.toISOString() || new Date().toISOString(),
              ...(tags && Object.keys(tags).length > 0 && { tags }),
            });
          }
        }
      }
    }

    return resources;
  } catch (error) {
    throw new ApiError(
      `Failed to fetch detailed EC2 instances: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get detailed S3 bucket information
 */
export async function getDetailedS3Buckets(credentials: AwsCredentials): Promise<DetailedAwsResource[]> {
  try {
    const s3Client = new S3Client({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    const resources: DetailedAwsResource[] = [];

    if (response.Buckets) {
      for (const bucket of response.Buckets) {
        if (bucket.Name) {
          resources.push({
            id: bucket.Name,
            name: bucket.Name,
            type: 'S3 Bucket',
            region: 'global', // S3 buckets are global but region-specific
            status: 'healthy',
            lastModified: bucket.CreationDate?.toISOString() || new Date().toISOString(),
          });
        }
      }
    }

    return resources;
  } catch (error) {
    throw new ApiError(
      `Failed to fetch detailed S3 buckets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get detailed Lambda function information
 */
export async function getDetailedLambdaFunctions(credentials: AwsCredentials): Promise<DetailedAwsResource[]> {
  try {
    const lambdaClient = new LambdaClient({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const resources: DetailedAwsResource[] = [];
    let nextMarker: string | undefined;

    do {
      const command = new ListFunctionsCommand({
        Marker: nextMarker,
        MaxItems: 50,
      });

      const response = await lambdaClient.send(command);
      
      if (response.Functions) {
        for (const func of response.Functions) {
          if (func.FunctionName) {
            // Determine status based on state
            let status: 'healthy' | 'warning' | 'critical' = 'healthy';
            if (func.State === 'Failed') status = 'critical';
            if (func.State === 'Pending') status = 'warning';

            resources.push({
              id: func.FunctionArn || func.FunctionName,
              name: func.FunctionName,
              type: 'Lambda Function',
              region: credentials.region || 'us-east-1',
              status: status,
              state: func.State || 'Active',
              size: `${func.CodeSize || 0} bytes`,
              lastModified: func.LastModified || new Date().toISOString(),
            });
          }
        }
      }
      
      nextMarker = response.NextMarker;
    } while (nextMarker);

    return resources;
  } catch (error) {
    throw new ApiError(
      `Failed to fetch detailed Lambda functions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get detailed RDS instance information
 */
export async function getDetailedRDSInstances(credentials: AwsCredentials): Promise<DetailedAwsResource[]> {
  try {
    const rdsClient = new RDSClient({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const command = new DescribeDBInstancesCommand({
      MaxRecords: 100,
    });

    const response = await rdsClient.send(command);
    const resources: DetailedAwsResource[] = [];

    if (response.DBInstances) {
      for (const dbInstance of response.DBInstances) {
        if (dbInstance.DBInstanceIdentifier) {
          // Determine status based on DB instance status
          let status: 'healthy' | 'warning' | 'critical' = 'healthy';
          if (dbInstance.DBInstanceStatus === 'stopped' || dbInstance.DBInstanceStatus === 'stopping') status = 'warning';
          if (dbInstance.DBInstanceStatus === 'failed' || dbInstance.DBInstanceStatus === 'incompatible-parameters') status = 'critical';

          resources.push({
            id: dbInstance.DBInstanceIdentifier,
            name: dbInstance.DBName || dbInstance.DBInstanceIdentifier,
            type: 'RDS Instance',
            region: dbInstance.AvailabilityZone?.slice(0, -1) || credentials.region || 'us-east-1',
            status: status,
            state: dbInstance.DBInstanceStatus || 'unknown',
            size: dbInstance.DBInstanceClass || 'unknown',
            lastModified: dbInstance.InstanceCreateTime?.toISOString() || new Date().toISOString(),
          });
        }
      }
    }

    return resources;
  } catch (error) {
    throw new ApiError(
      `Failed to fetch detailed RDS instances: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Get detailed resource inventory for all AWS services
 */
export async function getDetailedAwsResourceInventory(
  roleArn: string,
  externalId: string,
  region?: string
): Promise<DetailedResourceInventory> {
  try {
    // Step 1: Assume the role
    const assumedRole = await assumeRole(roleArn, externalId);
    
    // Step 2: Create credentials object
    const credentials: AwsCredentials = {
      accessKeyId: assumedRole.accessKeyId,
      secretAccessKey: assumedRole.secretAccessKey,
      sessionToken: assumedRole.sessionToken,
      region: region || 'us-east-1',
    };

    // Step 3: Fetch all detailed resource information in parallel
    const [ec2Instances, s3Buckets, lambdaFunctions, rdsInstances] = await Promise.all([
      getDetailedEC2Instances(credentials),
      getDetailedS3Buckets(credentials),
      getDetailedLambdaFunctions(credentials),
      getDetailedRDSInstances(credentials),
    ]);

    const total = ec2Instances.length + s3Buckets.length + lambdaFunctions.length + rdsInstances.length;

    return {
      ec2Instances,
      s3Buckets,
      lambdaFunctions,
      rdsInstances,
      total,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      `Failed to fetch detailed AWS resource inventory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
} 