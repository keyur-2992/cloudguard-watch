import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
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
          <div className="space-y-4">
            {["Production", "Staging", "Development"].map((account, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <h3 className="font-semibold">{account}</h3>
                  <p className="text-sm text-muted-foreground">123456789{index + 1}2</p>
                </div>
                <Button variant="destructive" size="sm">Remove</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;