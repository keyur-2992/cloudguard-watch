import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  useApiService, 
  ApiError, 
  AwsAccountResponse,
  AwsResourceCounts,
  DriftStacksResponse,
  CostSummaryResponse 
} from "@/lib/api";
import { 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Cloud,
  Database,
  Plus,
  Loader2,
  RefreshCw,
  Activity,
  Shield,
  Layers,
  BarChart3
} from "lucide-react";
import AccountCard from "@/components/AccountCard";

// Helper function to format currency
const formatCurrency = (amount: string | number, unit: string = 'USD'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: unit,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

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

interface DashboardData {
  accounts: AwsAccountResponse[];
  resourceCounts: AwsResourceCounts | null;
  driftData: DriftStacksResponse | null;
  costData: CostSummaryResponse | null;
}

interface ActivityItem {
  id: string;
  type: 'drift' | 'cost' | 'resource' | 'account';
  message: string;
  time: string;
  status: 'success' | 'warning' | 'info' | 'error';
  icon: React.ReactNode;
}

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    accounts: [],
    resourceCounts: null,
    driftData: null,
    costData: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    getAwsAccounts, 
    getAwsResources, 
    getDriftStacks, 
    getCostSummary 
  } = useApiService();

  // Fetch all dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data in parallel for better performance
      const [accountsResult, resourcesResult, driftResult, costResult] = await Promise.allSettled([
        getAwsAccounts(),
        getAwsResources(),
        getDriftStacks(),
        getCostSummary({ days: 30 }) // Get last 30 days for monthly view
      ]);

      const newData: DashboardData = {
        accounts: [],
        resourceCounts: null,
        driftData: null,
        costData: null,
      };

      // Process accounts
      if (accountsResult.status === 'fulfilled' && accountsResult.value.success) {
        newData.accounts = accountsResult.value.data.accounts;
      }

      // Process resources
      if (resourcesResult.status === 'fulfilled' && resourcesResult.value.success) {
        newData.resourceCounts = resourcesResult.value.data;
      }

      // Process drift data
      if (driftResult.status === 'fulfilled' && driftResult.value.success) {
        newData.driftData = driftResult.value.data;
      }

      // Process cost data
      if (costResult.status === 'fulfilled' && costResult.value.success) {
        newData.costData = costResult.value.data;
      }

      setDashboardData(newData);
      setLastRefresh(new Date());

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      
      let errorMessage = "Failed to load dashboard data";
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          errorMessage = "No AWS accounts connected. Please connect an AWS account first.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
      toast({
        title: "Failed to Load Dashboard",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleQuickAction = (action: string, path?: string) => {
    if (path) {
      navigate(path);
    } else {
      toast({
        title: "Action triggered",
        description: `${action} has been initiated`,
      });
    }
  };

  // Calculate statistics from real data
  const stats = {
    accountsCount: dashboardData.accounts.length,
    totalResources: dashboardData.resourceCounts 
      ? dashboardData.resourceCounts.ec2Count + dashboardData.resourceCounts.s3Count + dashboardData.resourceCounts.lambdaCount + dashboardData.resourceCounts.rdsCount
      : 0,
    driftCount: dashboardData.driftData?.stacks.filter(stack => stack.driftStatus === 'DRIFTED').length || 0,
    totalStacks: dashboardData.driftData?.stacks.length || 0,
    monthlyCost: dashboardData.costData ? parseFloat(dashboardData.costData.totalAmount) : 0,
    costUnit: dashboardData.costData?.unit || 'USD',
  };

  // Generate recent activity from real data
  const generateRecentActivity = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    // Add drift activities
    if (dashboardData.driftData) {
      const driftedStacks = dashboardData.driftData.stacks.filter(s => s.driftStatus === 'DRIFTED');
      driftedStacks.slice(0, 2).forEach((stack, index) => {
        activities.push({
          id: `drift-${index}`,
          type: 'drift',
          message: `CloudFormation stack "${stack.stackName}" has configuration drift`,
          time: stack.lastUpdatedTime ? formatRelativeTime(stack.lastUpdatedTime) : 'Recently',
          status: 'warning',
          icon: <AlertTriangle className="w-5 h-5 text-warning" />
        });
      });
    }

    // Add cost activities
    if (dashboardData.costData && dashboardData.costData.topServices.length > 0) {
      const topService = dashboardData.costData.topServices[0];
      if (topService.percentage > 40) {
        activities.push({
          id: 'cost-1',
          type: 'cost',
          message: `${topService.service} accounts for ${topService.percentage.toFixed(1)}% of monthly costs`,
          time: 'Last 30 days',
          status: 'info',
          icon: <DollarSign className="w-5 h-5 text-blue-600" />
        });
      }
    }

    // Add resource activities
    if (dashboardData.resourceCounts) {
      if (dashboardData.resourceCounts.ec2Count > 0) {
        activities.push({
          id: 'resource-1',
          type: 'resource',
          message: `${dashboardData.resourceCounts.ec2Count} EC2 instances monitored across your account`,
          time: formatRelativeTime(lastRefresh.toISOString()),
          status: 'success',
          icon: <Database className="w-5 h-5 text-success" />
        });
      }
    }

    // Add account activities
    if (dashboardData.accounts.length > 0) {
      const recentAccount = dashboardData.accounts[0];
      activities.push({
        id: 'account-1',
        type: 'account',
        message: `AWS account "${recentAccount.name || recentAccount.accountId}" successfully connected`,
        time: formatRelativeTime(recentAccount.createdAt),
        status: 'success',
        icon: <CheckCircle className="w-5 h-5 text-success" />
      });
    }

    return activities.slice(0, 4); // Limit to 4 most recent activities
  };

  const recentActivities = generateRecentActivity();

  // Transform accounts for AccountCard component
  const transformedAccounts = dashboardData.accounts.map(account => ({
    id: account.accountId,
    name: account.name || `Account ${account.accountId}`,
    region: account.region || 'us-east-1',
    lastScan: formatRelativeTime(account.updatedAt),
    status: account.status === 'connected' ? 'healthy' as const : 'warning' as const,
    resourceCount: stats.totalResources, // This would ideally be per-account
    driftCount: 0 // This would ideally be per-account drift count
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AWS infrastructure at a glance</p>
          {lastRefresh && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {formatRelativeTime(lastRefresh.toISOString())}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="shadow-soft border-destructive/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Unable to load dashboard data</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AWS Accounts</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-lg">...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.accountsCount}</div>
                <p className="text-xs text-muted-foreground">Connected accounts</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-lg">...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalResources}</div>
                <p className="text-xs text-muted-foreground">
                  EC2, S3, Lambda, RDS resources
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drift Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-lg">...</span>
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold ${stats.driftCount > 0 ? 'text-warning' : 'text-success'}`}>
                  {stats.driftCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalStacks > 0 ? `of ${stats.totalStacks} stacks` : 'No stacks found'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-lg">...</span>
              </div>
            ) : stats.monthlyCost > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.monthlyCost, stats.costUnit)}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground">No cost data</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AWS Accounts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">AWS Accounts</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleQuickAction("Add Account", "/connect")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>
          
          {isLoading ? (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading AWS accounts...</p>
                </div>
              </CardContent>
            </Card>
          ) : transformedAccounts.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="text-center">
                  <Cloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    No AWS accounts connected
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your first AWS account to start monitoring
                  </p>
                  <Button onClick={() => navigate('/connect')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Connect AWS Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {transformedAccounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          
          <Card className="shadow-soft">
            <CardContent className="p-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading activity...</p>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    No recent activity
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Activity will appear here as you use CloudGuard
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      {activity.icon}
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                      
                      <Badge variant={activity.status === "warning" ? "destructive" : "secondary"}>
                        {activity.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to key sections of CloudGuard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleQuickAction("Drift Detection", "/drift")}
            >
              <Layers className="w-6 h-6" />
              <span className="text-sm">Drift Detection</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleQuickAction("Cost Analysis", "/costs")}
            >
              <BarChart3 className="w-6 h-6" />
              <span className="text-sm">Cost Analysis</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleQuickAction("Resources", "/resources")}
            >
              <Database className="w-6 h-6" />
              <span className="text-sm">View Resources</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleQuickAction("Settings", "/settings")}
            >
              <Shield className="w-6 h-6" />
              <span className="text-sm">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;