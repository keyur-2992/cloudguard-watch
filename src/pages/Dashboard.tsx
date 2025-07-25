import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Cloud,
  Database,
  Plus
} from "lucide-react";
import AccountCard from "@/components/AccountCard";
import { useToast } from "@/hooks/use-toast";

// Mock data
const mockAccounts = [
  {
    id: "123456789012",
    name: "Production",
    region: "us-east-1",
    lastScan: "2 minutes ago",
    status: "healthy" as const,
    resourceCount: 247,
    driftCount: 0
  },
  {
    id: "123456789013", 
    name: "Staging",
    region: "us-west-2",
    lastScan: "5 minutes ago",
    status: "warning" as const,
    resourceCount: 89,
    driftCount: 3
  },
  {
    id: "123456789014",
    name: "Development",
    region: "eu-west-1", 
    lastScan: "10 minutes ago",
    status: "healthy" as const,
    resourceCount: 34,
    driftCount: 0
  }
];

const Dashboard = () => {
  const { toast } = useToast();

  const totalResources = mockAccounts.reduce((sum, account) => sum + account.resourceCount, 0);
  const totalDrift = mockAccounts.reduce((sum, account) => sum + account.driftCount, 0);

  const handleQuickAction = (action: string) => {
    toast({
      title: "Action triggered",
      description: `${action} has been initiated`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AWS infrastructure at a glance</p>
        </div>
        <Button onClick={() => handleQuickAction("Full scan")}>
          <TrendingUp className="w-4 h-4 mr-2" />
          Run Full Scan
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AWS Accounts</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAccounts.length}</div>
            <p className="text-xs text-muted-foreground">Connected accounts</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResources}</div>
            <p className="text-xs text-muted-foreground">Monitored resources</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drift Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{totalDrift}</div>
            <p className="text-xs text-muted-foreground">Configuration drifts</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,847</div>
            <p className="text-xs text-success">+12% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* AWS Accounts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">AWS Accounts</h2>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>
          
          <div className="space-y-3">
            {mockAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="space-y-4">
                {[
                  {
                    type: "drift",
                    message: "EC2 security group modified in staging",
                    time: "5 minutes ago",
                    status: "warning"
                  },
                  {
                    type: "cost",
                    message: "Unusual spike in RDS costs detected",
                    time: "1 hour ago", 
                    status: "info"
                  },
                  {
                    type: "compliance",
                    message: "All accounts passed compliance scan",
                    time: "2 hours ago",
                    status: "success"
                  }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    {activity.status === "warning" && <AlertTriangle className="w-5 h-5 text-warning" />}
                    {activity.status === "success" && <CheckCircle className="w-5 h-5 text-success" />}
                    {activity.status === "info" && <TrendingUp className="w-5 h-5 text-accent" />}
                    
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common operations for your AWS infrastructure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleQuickAction("Drift scan")}
            >
              <AlertTriangle className="w-6 h-6" />
              Run Drift Scan
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleQuickAction("Cost analysis")}
            >
              <DollarSign className="w-6 h-6" />
              Analyze Costs
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleQuickAction("Export report")}
            >
              <TrendingUp className="w-6 h-6" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;