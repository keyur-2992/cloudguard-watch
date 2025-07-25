import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useApiService, ApiError, CloudFormationStackInfo, DriftStacksResponse, TriggerDriftRequest } from "@/lib/api";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye,
  RefreshCw,
  Filter,
  Loader2,
  CloudIcon,
  PlayCircle,
  Layers
} from "lucide-react";

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

const Drift = () => {
  const [selectedTab, setSelectedTab] = useState("all");
  const [stacks, setStacks] = useState<CloudFormationStackInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringDrift, setTriggeringDrift] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { getDriftStacks, triggerDriftDetection } = useApiService();

  // Fetch CloudFormation stacks on component mount
  useEffect(() => {
    fetchStacks();
  }, []);

  const fetchStacks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getDriftStacks();
      
      if (result.success && result.data) {
        setStacks(result.data.stacks);
      }
    } catch (err) {
      console.error("Failed to fetch CloudFormation stacks:", err);
      
      let errorMessage = "Failed to load CloudFormation stacks";
      
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
        title: "Failed to Load Stacks",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerDrift = async (stackName: string) => {
    try {
      setTriggeringDrift(stackName);
      
      const result = await triggerDriftDetection({ stackName });
      
      if (result.success) {
        toast({
          title: "Drift Detection Started",
          description: `Analyzing drift for stack "${stackName}". This may take a few minutes.`,
        });
        
        // Refresh stacks to show updated status
        await fetchStacks();
      }
    } catch (err) {
      console.error("Failed to trigger drift detection:", err);
      
      if (err instanceof ApiError) {
        toast({
          title: "Failed to Start Drift Detection",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setTriggeringDrift(null);
    }
  };

  const handleRefresh = () => {
    fetchStacks();
  };

  const getDriftStatusBadge = (driftStatus?: string) => {
    if (!driftStatus) {
      return <Badge variant="outline">Not Checked</Badge>;
    }
    
    switch (driftStatus) {
      case "IN_SYNC":
        return <Badge className="bg-success/10 text-success border-success/20">In Sync</Badge>;
      case "DRIFTED":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Drifted</Badge>;
      case "DETECTION_IN_PROGRESS":
        return <Badge className="bg-blue-100 text-blue-800 border-blue/20">Analyzing...</Badge>;
      case "UNKNOWN":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Unknown</Badge>;
      default:
        return <Badge variant="outline">{driftStatus}</Badge>;
    }
  };

  const getStackStatusBadge = (status: string) => {
    const isComplete = status.includes("COMPLETE");
    const isFailed = status.includes("FAILED");
    const isInProgress = status.includes("IN_PROGRESS");
    
    if (isComplete) {
      return <Badge className="bg-success/10 text-success border-success/20">{status}</Badge>;
    } else if (isFailed) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{status}</Badge>;
    } else if (isInProgress) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue/20">{status}</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDriftStatusIcon = (driftStatus?: string) => {
    switch (driftStatus) {
      case "IN_SYNC":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "DRIFTED":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "DETECTION_IN_PROGRESS":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case "UNKNOWN":
        return <Clock className="w-5 h-5 text-warning" />;
      default:
        return <CloudIcon className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const filteredStacks = stacks.filter(stack => {
    if (selectedTab === "all") return true;
    if (selectedTab === "in-sync") return stack.driftStatus === "IN_SYNC";
    if (selectedTab === "drifted") return stack.driftStatus === "DRIFTED";
    if (selectedTab === "not-checked") return !stack.driftStatus || stack.driftStatus === "NOT_CHECKED";
    return true;
  });

  const stats = {
    total: stacks.length,
    inSync: stacks.filter(s => s.driftStatus === "IN_SYNC").length,
    drifted: stacks.filter(s => s.driftStatus === "DRIFTED").length,
    notChecked: stacks.filter(s => !s.driftStatus || s.driftStatus === "NOT_CHECKED").length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Drift Detection</h1>
          <p className="text-muted-foreground">Monitor configuration changes and infrastructure drift</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stacks</p>
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-lg">...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold">{stats.total}</p>
                )}
              </div>
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Sync</p>
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-lg">...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-success">{stats.inSync}</p>
                )}
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drifted</p>
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-lg">...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-destructive">{stats.drifted}</p>
                )}
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Not Checked</p>
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-lg">...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-warning">{stats.notChecked}</p>
                )}
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="shadow-soft border-destructive/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Unable to load CloudFormation stacks</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CloudFormation Stacks */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>CloudFormation Stacks</CardTitle>
          <CardDescription>Monitor infrastructure drift across your CloudFormation stacks</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="in-sync">In Sync ({stats.inSync})</TabsTrigger>
              <TabsTrigger value="drifted">Drifted ({stats.drifted})</TabsTrigger>
              <TabsTrigger value="not-checked">Not Checked ({stats.notChecked})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading CloudFormation stacks...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
                  <p>Unable to load stacks</p>
                </div>
              ) : filteredStacks.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-lg">
                  <CloudIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    No CloudFormation stacks found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your AWS account doesn't have any CloudFormation stacks, or they may be in a different region.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStacks.map((stack) => (
                    <Card key={stack.stackId} className="shadow-soft">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            {getDriftStatusIcon(stack.driftStatus)}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-foreground">{stack.stackName}</h3>
                                {getStackStatusBadge(stack.status)}
                                {getDriftStatusBadge(stack.driftStatus)}
                              </div>
                              {stack.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {stack.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>CloudFormation Stack</span>
                                <span>Created {formatRelativeTime(stack.creationTime)}</span>
                                {stack.lastUpdatedTime && (
                                  <span>Updated {formatRelativeTime(stack.lastUpdatedTime)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleTriggerDrift(stack.stackName)}
                              disabled={triggeringDrift === stack.stackName || stack.driftStatus === 'DETECTION_IN_PROGRESS'}
                            >
                              {triggeringDrift === stack.stackName ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Detect Drift
                                </>
                              )}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>

                        {/* Stack Information */}
                        {(stack.tags || stack.outputs || stack.parameters) && (
                          <div className="bg-muted/30 rounded-lg p-4 mt-4">
                            <h4 className="text-sm font-medium mb-3">Stack Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {stack.tags && Object.keys(stack.tags).length > 0 && (
                                <div>
                                  <p className="font-medium mb-2">Tags</p>
                                  <div className="space-y-1">
                                    {Object.entries(stack.tags).slice(0, 3).map(([key, value]) => (
                                      <div key={key} className="flex items-center justify-between">
                                        <span className="font-mono text-muted-foreground">{key}</span>
                                        <Badge variant="outline" className="text-xs">{value}</Badge>
                                      </div>
                                    ))}
                                    {Object.keys(stack.tags).length > 3 && (
                                      <p className="text-xs text-muted-foreground">
                                        +{Object.keys(stack.tags).length - 3} more tags
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {stack.outputs && stack.outputs.length > 0 && (
                                <div>
                                  <p className="font-medium mb-2">Outputs</p>
                                  <div className="space-y-1">
                                    {stack.outputs.slice(0, 3).map((output) => (
                                      <div key={output.outputKey} className="flex items-center justify-between">
                                        <span className="font-mono text-muted-foreground">{output.outputKey}</span>
                                        <Badge variant="outline" className="text-xs max-w-24 truncate">
                                          {output.outputValue}
                                        </Badge>
                                      </div>
                                    ))}
                                    {stack.outputs.length > 3 && (
                                      <p className="text-xs text-muted-foreground">
                                        +{stack.outputs.length - 3} more outputs
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {stack.parameters && Object.keys(stack.parameters).length > 0 && (
                                <div>
                                  <p className="font-medium mb-2">Parameters</p>
                                  <div className="space-y-1">
                                    {Object.entries(stack.parameters).slice(0, 3).map(([key, value]) => (
                                      <div key={key} className="flex items-center justify-between">
                                        <span className="font-mono text-muted-foreground">{key}</span>
                                        <Badge variant="outline" className="text-xs max-w-24 truncate">{value}</Badge>
                                      </div>
                                    ))}
                                    {Object.keys(stack.parameters).length > 3 && (
                                      <p className="text-xs text-muted-foreground">
                                        +{Object.keys(stack.parameters).length - 3} more parameters
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Drift;