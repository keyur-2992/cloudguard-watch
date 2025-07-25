import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cloud, Shield, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApiService, ApiError } from "@/lib/api";

const Connect = () => {
  const [roleArn, setRoleArn] = useState("");
  const [externalId, setExternalId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [region, setRegion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { connectAws } = useApiService();

  const handleConnect = async () => {
    // Validate required fields
    if (!roleArn || !externalId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Role ARN and External ID)",
        variant: "destructive",
      });
      return;
    }

    // Validate Role ARN format
    if (!/^arn:aws:iam::\d{12}:role\/.+$/.test(roleArn)) {
      toast({
        title: "Invalid Role ARN",
        description: "Please enter a valid IAM Role ARN",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await connectAws({
        roleArn,
        externalId,
        name: accountName || undefined,
        region: region || undefined,
      });

      if (result.success) {
        toast({
          title: "AWS Account Connected",
          description: `Successfully connected ${result.data?.name || result.data?.accountId || 'AWS Account'}`,
        });

        // Reset form
        setRoleArn("");
        setExternalId("");
        setAccountName("");
        setRegion("");

        // Navigate to dashboard after successful connection
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to connect AWS account:", error);
      
      if (error instanceof ApiError) {
        // Handle specific API errors
        if (error.statusCode === 401) {
          toast({
            title: "Authentication Error",
            description: "Please sign in again to continue",
            variant: "destructive",
          });
        } else if (error.statusCode === 409) {
          toast({
            title: "Account Already Connected",
            description: "This AWS account is already connected to your profile",
            variant: "destructive",
          });
        } else if (error.statusCode === 400 && error.details) {
          // Handle validation errors
          const firstError = error.details[0];
          toast({
            title: "Validation Error",
            description: firstError ? `${firstError.field}: ${firstError.message}` : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Connection Failed",
            description: error.message || "Failed to connect AWS account",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Connection Failed", 
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-aws rounded-full">
            <Cloud className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Connect AWS Account</h1>
        <p className="text-muted-foreground">Securely connect your AWS account for monitoring</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="shadow-large">
          <CardHeader>
            <CardTitle>IAM Role Configuration</CardTitle>
            <CardDescription>
              We use cross-account IAM roles for secure, read-only access to your AWS resources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">


            <div className="space-y-2">
              <Label htmlFor="role-arn">IAM Role ARN *</Label>
              <Input
                id="role-arn"
                placeholder="arn:aws:iam::123456789012:role/CloudGuardMonitoringRole"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cross-account IAM role for monitoring access
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="external-id">External ID *</Label>
              <Input
                id="external-id"
                placeholder="unique-secure-external-id"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                maxLength={1224}
              />
              <p className="text-xs text-muted-foreground">
                Unique security token for role assumption
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name (Optional)</Label>
              <Input
                id="account-name"
                placeholder="e.g., Production, Staging"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Friendly name to identify this account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Primary Region (Optional)</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AWS region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                  <SelectItem value="eu-central-1">Europe (Frankfurt)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Primary region for resource monitoring
              </p>
            </div>

            <Button className="w-full" onClick={handleConnect} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Connect AWS Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Security & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                <span>Read-only access to AWS resources</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                <span>No ability to modify or delete resources</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                <span>Encrypted data transmission and storage</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                <span>SOC 2 Type II compliant infrastructure</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Connect;