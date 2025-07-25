import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cloud, Shield, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Connect = () => {
  const [roleArn, setRoleArn] = useState("");
  const [region, setRegion] = useState("");
  const [accountName, setAccountName] = useState("");
  const { toast } = useToast();

  const handleConnect = () => {
    if (!roleArn || !region || !accountName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "AWS Account Connected",
      description: `Successfully connected ${accountName} in ${region}`,
    });

    // Reset form
    setRoleArn("");
    setRegion("");
    setAccountName("");
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
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="e.g., Production, Staging"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-arn">IAM Role ARN</Label>
              <Input
                id="role-arn"
                placeholder="arn:aws:iam::123456789012:role/CloudWatchMonitoringRole"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Primary Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AWS region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleConnect}>
              <Shield className="w-4 h-4 mr-2" />
              Connect AWS Account
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