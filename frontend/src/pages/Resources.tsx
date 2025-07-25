import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  RefreshCw,
  Database,
  Server,
  Cloud,
  Shield,
  HardDrive,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApiService, ApiError, AwsResourceCounts, DetailedResourceInventory, DetailedAwsResource } from "@/lib/api";
import ResourceTable from "@/components/ResourceTable";

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const Resources = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [resourceCounts, setResourceCounts] = useState<AwsResourceCounts | null>(null);
  const [detailedInventory, setDetailedInventory] = useState<DetailedResourceInventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { getAwsResources, getDetailedAwsResources } = useApiService();

  // Fetch AWS resource counts on component mount
  useEffect(() => {
    fetchResourceCounts();
  }, []);

  const fetchResourceCounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch both resource counts and detailed inventory in parallel
      const [countsResult, detailedResult] = await Promise.all([
        getAwsResources(),
        getDetailedAwsResources()
      ]);
      
      if (countsResult.success && countsResult.data) {
        setResourceCounts(countsResult.data);
      }

      if (detailedResult.success && detailedResult.data) {
        setDetailedInventory(detailedResult.data);
      }
    } catch (err) {
      console.error("Failed to fetch AWS resources:", err);
      
      let errorMessage = "Failed to load AWS resources";
      
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          errorMessage = "No AWS accounts connected. Please connect an AWS account first.";
        } else if (err.statusCode === 403) {
          errorMessage = "AWS access denied. Please reconnect your AWS account.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
      toast({
        title: "Failed to Load Resources",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchResourceCounts();
  };

  const resourceTypes = [
    { value: "all", label: "All Resources", icon: Database },
    { value: "ec2", label: "EC2 Instances", icon: Server },
    { value: "s3", label: "S3 Buckets", icon: HardDrive },
    { value: "lambda", label: "Lambda Functions", icon: Cloud },
    { value: "rds", label: "RDS Databases", icon: Shield },
  ];

  // Combine all resources from the detailed inventory
  const allResources: DetailedAwsResource[] = detailedInventory ? [
    ...detailedInventory.ec2Instances,
    ...detailedInventory.s3Buckets,
    ...detailedInventory.lambdaFunctions,
    ...detailedInventory.rdsInstances,
  ] : [];

  // Transform AWS resources to match ResourceTable interface
  const transformedResources = allResources.map(resource => ({
    id: resource.id,
    name: resource.name,
    type: resource.type,
    region: resource.region,
    account: "AWS Account", // Default account name since we have single account
    status: resource.status === 'critical' ? 'error' as const : resource.status,
    driftStatus: 'none' as const, // TODO: Implement drift detection
    lastModified: formatRelativeTime(resource.lastModified),
  }));

  const filteredResources = transformedResources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || 
                       (selectedType === "ec2" && resource.type.includes("EC2")) ||
                       (selectedType === "rds" && resource.type.includes("RDS")) ||
                       (selectedType === "s3" && resource.type.includes("S3")) ||
                       (selectedType === "lambda" && resource.type.includes("Lambda"));
    return matchesSearch && matchesType;
  });

  // Calculate real AWS resource stats
  const stats = resourceCounts ? {
    total: resourceCounts.ec2Count + resourceCounts.s3Count + resourceCounts.lambdaCount + resourceCounts.rdsCount,
    ec2: resourceCounts.ec2Count,
    s3: resourceCounts.s3Count,
    lambda: resourceCounts.lambdaCount,
    rds: resourceCounts.rdsCount
  } : {
    total: 0,
    ec2: 0,
    s3: 0,
    lambda: 0,
    rds: 0
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resources</h1>
          <p className="text-muted-foreground">Monitor and manage your AWS resources</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Resources</p>
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-lg">...</span>
                  </div>
                ) : error ? (
                  <p className="text-2xl font-bold text-muted-foreground">--</p>
                ) : (
                  <p className="text-2xl font-bold">{stats.total}</p>
                )}
              </div>
              <Database className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">EC2 Instances</p>
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-lg">...</span>
                  </div>
                ) : error ? (
                  <p className="text-2xl font-bold text-muted-foreground">--</p>
                ) : (
                  <p className="text-2xl font-bold text-blue-600">{stats.ec2}</p>
                )}
              </div>
              <Server className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">S3 Buckets</p>
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-lg">...</span>
                  </div>
                ) : error ? (
                  <p className="text-2xl font-bold text-muted-foreground">--</p>
                ) : (
                  <p className="text-2xl font-bold text-green-600">{stats.s3}</p>
                )}
              </div>
              <HardDrive className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lambda Functions</p>
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-lg">...</span>
                  </div>
                ) : error ? (
                  <p className="text-2xl font-bold text-muted-foreground">--</p>
                ) : (
                  <p className="text-2xl font-bold text-purple-600">{stats.lambda}</p>
                )}
              </div>
              <Cloud className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="shadow-soft border-destructive/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Unable to load AWS resources</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AWS Service Breakdown */}
      {resourceCounts && !error && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>AWS Service Breakdown</CardTitle>
            <CardDescription>Real-time resource counts from your connected AWS account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Server className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{resourceCounts.ec2Count}</p>
                <p className="text-sm text-muted-foreground">EC2 Instances</p>
                <p className="text-xs text-muted-foreground">(Running only)</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <HardDrive className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{resourceCounts.s3Count}</p>
                <p className="text-sm text-muted-foreground">S3 Buckets</p>
                <p className="text-xs text-muted-foreground">(All regions)</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <Cloud className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{resourceCounts.lambdaCount}</p>
                <p className="text-sm text-muted-foreground">Lambda Functions</p>
                <p className="text-xs text-muted-foreground">(Primary region)</p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <Shield className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{resourceCounts.rdsCount}</p>
                <p className="text-sm text-muted-foreground">RDS Databases</p>
                <p className="text-xs text-muted-foreground">(All instances)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resource Inventory</CardTitle>
              <CardDescription>All AWS resources across your accounts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto">
              {resourceTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type.value)}
                  className="whitespace-nowrap"
                >
                  <type.icon className="w-4 h-4 mr-2" />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading detailed resource information...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-4" />
              <p>Unable to load resource details</p>
            </div>
          ) : detailedInventory && allResources.length > 0 ? (
            <ResourceTable resources={filteredResources} />
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No Resources Found
              </p>
              <p className="text-sm text-muted-foreground">
                Your AWS account doesn't have any resources in the monitored services, or they may be in a different region.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Resources;