import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useApiService, ApiError, AwsAccountResponse } from "@/lib/api";
import { Loader2, Trash2, Calendar, MapPin } from "lucide-react";

const Settings = () => {
  const [awsAccounts, setAwsAccounts] = useState<AwsAccountResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { getAwsAccounts, deleteAwsAccount } = useApiService();

  // Fetch AWS accounts on component mount
  useEffect(() => {
    fetchAwsAccounts();
  }, []);

  const fetchAwsAccounts = async () => {
    try {
      setIsLoading(true);
      const result = await getAwsAccounts();
      
      if (result.success && result.data) {
        setAwsAccounts(result.data.accounts);
      }
    } catch (error) {
      console.error("Failed to fetch AWS accounts:", error);
      
      if (error instanceof ApiError) {
        toast({
          title: "Failed to Load AWS Accounts",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: string, accountName?: string) => {
    try {
      setIsDeleting(accountId);
      
      const result = await deleteAwsAccount(accountId);
      
      if (result.success) {
        // Remove account from local state
        setAwsAccounts(prev => prev.filter(account => account.accountId !== accountId));
        
        toast({
          title: "AWS Account Disconnected",
          description: `Successfully disconnected ${accountName || accountId}`,
        });
      }
    } catch (error) {
      console.error("Failed to delete AWS account:", error);
      
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          toast({
            title: "Account Not Found",
            description: "This AWS account is no longer connected",
            variant: "destructive",
          });
          // Remove from local state anyway
          setAwsAccounts(prev => prev.filter(account => account.accountId !== accountId));
        } else {
          toast({
            title: "Failed to Disconnect Account",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and monitoring preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure how you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-alerts">Email Alerts</Label>
              <Switch id="email-alerts" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="slack-alerts">Slack Notifications</Label>
              <Switch id="slack-alerts" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cost-alerts">Cost Anomaly Alerts</Label>
              <Switch id="cost-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Scan Settings</CardTitle>
            <CardDescription>Configure monitoring frequency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scan-frequency">Drift Scan Frequency</Label>
              <Input id="scan-frequency" placeholder="Every 5 minutes" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-analysis">Cost Analysis Frequency</Label>
              <Input id="cost-analysis" placeholder="Daily" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Connected AWS Accounts</CardTitle>
          <CardDescription>Manage your AWS account connections</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">Loading AWS accounts...</span>
            </div>
          ) : awsAccounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No AWS accounts connected yet</p>
              <Button 
                onClick={() => window.location.href = '/connect'}
                variant="outline"
              >
                Connect Your First Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {awsAccounts.map((account) => (
                <div 
                  key={account.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">
                        {account.name || `AWS Account ${account.accountId}`}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        account.status === 'connected' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {account.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground font-mono mb-2">
                      Account ID: {account.accountId}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {account.region && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{account.region}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Connected {formatDate(account.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteAccount(account.accountId, account.name)}
                    disabled={isDeleting === account.accountId}
                    className="ml-4"
                  >
                    {isDeleting === account.accountId ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;