import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useApiService, ApiError, CostSummaryResponse, CostTrendsResponse, CostSummaryRequest } from "@/lib/api";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Loader2,
  Calendar,
  RefreshCw,
  BarChart3,
  PieChart
} from "lucide-react";

// Helper function to format currency
const formatCurrency = (amount: string | number, unit: string = 'USD'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: unit,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

// Helper function to format percentage
const formatPercentage = (percent: number): string => {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
};

// Helper function to get trend color
const getTrendColor = (percent: number): string => {
  if (percent > 10) return 'text-destructive';
  if (percent > 5) return 'text-warning';
  if (percent < -5) return 'text-success';
  return 'text-muted-foreground';
};

// Helper function to get trend icon
const getTrendIcon = (percent: number) => {
  if (percent > 0) return <TrendingUp className="w-4 h-4" />;
  if (percent < 0) return <TrendingDown className="w-4 h-4" />;
  return <DollarSign className="w-4 h-4" />;
};

const Costs = () => {
  const [costSummary, setCostSummary] = useState<CostSummaryResponse | null>(null);
  const [costTrends, setCostTrends] = useState<CostTrendsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [granularity, setGranularity] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  
  const { toast } = useToast();
  const { getCostSummary, getCostTrends } = useApiService();

  // Fetch cost data
  useEffect(() => {
    fetchCostData();
  }, [timeRange, granularity]);

  const fetchCostData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: CostSummaryRequest = {
        granularity,
        days: parseInt(timeRange),
      };

      // Fetch both cost summary and trends in parallel
      const [summaryResult, trendsResult] = await Promise.all([
        getCostSummary(params),
        getCostTrends(params),
      ]);
      
      if (summaryResult.success && summaryResult.data) {
        setCostSummary(summaryResult.data);
      }
      
      if (trendsResult.success && trendsResult.data) {
        setCostTrends(trendsResult.data);
      }
      
    } catch (err) {
      console.error("Failed to fetch cost data:", err);
      
      let errorMessage = "Failed to load cost data";
      
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          errorMessage = "No AWS accounts connected. Please connect an AWS account first.";
        } else if (err.statusCode === 403) {
          errorMessage = "AWS access denied. Please ensure your IAM role has Cost Explorer permissions.";
        } else if (err.statusCode === 503) {
          errorMessage = "Cost Explorer functionality is temporarily unavailable.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
      toast({
        title: "Failed to Load Cost Data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchCostData();
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  const handleGranularityChange = (value: 'DAILY' | 'MONTHLY') => {
    setGranularity(value);
  };

  // Calculate statistics from cost data
  const stats = {
    currentTotal: costSummary ? parseFloat(costSummary.totalAmount) : 0,
    unit: costSummary?.unit || 'USD',
    topServices: costSummary?.topServices || [],
    totalEntries: costSummary?.entries.length || 0,
    avgDailyCost: costSummary ? parseFloat(costSummary.totalAmount) / parseInt(timeRange) : 0,
  };

  // Calculate cost trends and anomalies
  const trendData = costTrends?.trends || [];
  const recentTrend = trendData.length > 1 ? trendData[trendData.length - 1] : null;
  const changePercent = recentTrend?.changePercent || 0;

  // Identify cost anomalies (services with significant increases)
  const anomalies = stats.topServices
    .filter(service => service.percentage > 20) // Services using more than 20% of budget
    .slice(0, 3); // Top 3 services

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cost Monitoring</h1>
          <p className="text-muted-foreground">Track AWS spending and detect cost anomalies</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={granularity} onValueChange={handleGranularityChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="shadow-soft border-destructive/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Unable to load cost data</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Cost ({timeRange} days)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-lg">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.currentTotal, stats.unit)}
                </div>
                {recentTrend && recentTrend.changePercent !== undefined && (
                  <p className={`text-xs flex items-center gap-1 ${getTrendColor(recentTrend.changePercent)}`}>
                    {getTrendIcon(recentTrend.changePercent)}
                    {formatPercentage(recentTrend.changePercent)} from previous period
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-lg">...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.avgDailyCost, stats.unit)}
                </div>
                <p className="text-xs text-muted-foreground">Per day average</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Service</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-lg">...</span>
              </div>
            ) : stats.topServices.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {stats.topServices[0].service.replace('Amazon ', '')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.topServices[0].amount, stats.unit)} ({stats.topServices[0].percentage.toFixed(1)}%)
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground">No data available</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-lg">...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.topServices.length}</div>
                <p className="text-xs text-muted-foreground">Active services</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Services Breakdown */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Top Services</CardTitle>
          <CardDescription>Highest cost AWS services in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading cost breakdown...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
              <p>Unable to load service breakdown</p>
            </div>
          ) : stats.topServices.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No cost data found
              </p>
              <p className="text-sm text-muted-foreground">
                Cost data may not be available yet or your account has no charges.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.topServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" style={{
                      backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                    }} />
                    <div>
                      <h3 className="font-semibold">{service.service}</h3>
                      <p className="text-sm text-muted-foreground">
                        {service.percentage.toFixed(1)}% of total spend
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(service.amount, stats.unit)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Rank #{index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Costs;