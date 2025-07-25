import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye,
  RefreshCw,
  Filter
} from "lucide-react";

// Mock drift data
const mockDriftEvents = [
  {
    id: "drift-001",
    resourceId: "sg-0123456789abcdef0",
    resourceName: "web-sg",
    resourceType: "Security Group",
    account: "Production",
    region: "us-east-1",
    driftType: "configuration_change",
    severity: "high" as const,
    description: "Inbound rule modified: Port 22 SSH access opened to 0.0.0.0/0",
    detectedAt: "5 minutes ago",
    status: "unresolved" as const,
    changes: [
      {
        field: "inbound_rules[0].cidr_blocks",
        from: "10.0.0.0/8",
        to: "0.0.0.0/0"
      }
    ]
  },
  {
    id: "drift-002", 
    resourceId: "rds-prod-mysql",
    resourceName: "prod-mysql-db",
    resourceType: "RDS Instance",
    account: "Production",
    region: "us-east-1",
    driftType: "parameter_change",
    severity: "medium" as const,
    description: "Database parameter group modified",
    detectedAt: "10 minutes ago",
    status: "investigating" as const,
    changes: [
      {
        field: "parameter_group",
        from: "default.mysql8.0",
        to: "custom-mysql-params"
      }
    ]
  },
  {
    id: "drift-003",
    resourceId: "i-0123456789abcdef0", 
    resourceName: "web-server-01",
    resourceType: "EC2 Instance",
    account: "Staging",
    region: "us-west-2",
    driftType: "tag_change",
    severity: "low" as const,
    description: "Resource tags updated",
    detectedAt: "1 hour ago",
    status: "resolved" as const,
    changes: [
      {
        field: "tags.Environment",
        from: "staging",
        to: "development"
      }
    ]
  }
];

const Drift = () => {
  const [selectedTab, setSelectedTab] = useState("all");

  const getSeverityBadge = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low":
        return <Badge className="bg-success/10 text-success border-success/20">Low</Badge>;
      case "medium":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      case "high":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">High</Badge>;
    }
  };

  const getStatusBadge = (status: "unresolved" | "investigating" | "resolved") => {
    switch (status) {
      case "unresolved":
        return <Badge variant="destructive">Unresolved</Badge>;
      case "investigating":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Investigating</Badge>;
      case "resolved":
        return <Badge className="bg-success/10 text-success border-success/20">Resolved</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "unresolved":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "investigating":
        return <Clock className="w-5 h-5 text-warning" />;
      case "resolved":
        return <CheckCircle className="w-5 h-5 text-success" />;
    }
  };

  const filteredEvents = mockDriftEvents.filter(event => {
    if (selectedTab === "all") return true;
    if (selectedTab === "unresolved") return event.status === "unresolved";
    if (selectedTab === "investigating") return event.status === "investigating";
    if (selectedTab === "resolved") return event.status === "resolved";
    return true;
  });

  const stats = {
    total: mockDriftEvents.length,
    unresolved: mockDriftEvents.filter(e => e.status === "unresolved").length,
    investigating: mockDriftEvents.filter(e => e.status === "investigating").length,
    resolved: mockDriftEvents.filter(e => e.status === "resolved").length
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
          <Button>
            <RefreshCw className="w-4 h-4 mr-2" />
            Scan Now
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Drift Events</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unresolved</p>
                <p className="text-2xl font-bold text-destructive">{stats.unresolved}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Investigating</p>
                <p className="text-2xl font-bold text-warning">{stats.investigating}</p>
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-success">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drift Events */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Drift Events</CardTitle>
          <CardDescription>Configuration changes detected across your infrastructure</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="unresolved">Unresolved ({stats.unresolved})</TabsTrigger>
              <TabsTrigger value="investigating">Investigating ({stats.investigating})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({stats.resolved})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <Card key={event.id} className="shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          {getStatusIcon(event.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-foreground">{event.resourceName}</h3>
                              {getSeverityBadge(event.severity)}
                              {getStatusBadge(event.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{event.resourceType}</span>
                              <span>{event.account}</span>
                              <span>{event.region}</span>
                              <span>Detected {event.detectedAt}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>

                      {/* Changes Details */}
                      <div className="bg-muted/30 rounded-lg p-4 mt-4">
                        <h4 className="text-sm font-medium mb-3">Configuration Changes</h4>
                        <div className="space-y-2">
                          {event.changes.map((change, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="font-mono text-muted-foreground">{change.field}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {change.from}
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {change.to}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Drift;