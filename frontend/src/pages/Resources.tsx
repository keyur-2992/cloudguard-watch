import { useState } from "react";
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
  HardDrive
} from "lucide-react";
import ResourceTable from "@/components/ResourceTable";

// Mock data
const mockResources = [
  {
    id: "i-0123456789abcdef0",
    name: "web-server-01",
    type: "EC2 Instance",
    region: "us-east-1",
    account: "Production",
    status: "healthy" as const,
    driftStatus: "none" as const,
    lastModified: "2 hours ago"
  },
  {
    id: "sg-0123456789abcdef0",
    name: "web-sg",
    type: "Security Group",
    region: "us-east-1", 
    account: "Production",
    status: "healthy" as const,
    driftStatus: "drift" as const,
    lastModified: "5 minutes ago"
  },
  {
    id: "subnet-0123456789abcdef0",
    name: "public-subnet-1a",
    type: "Subnet",
    region: "us-east-1",
    account: "Production", 
    status: "healthy" as const,
    driftStatus: "none" as const,
    lastModified: "1 day ago"
  },
  {
    id: "rds-prod-mysql",
    name: "prod-mysql-db",
    type: "RDS Instance",
    region: "us-east-1",
    account: "Production",
    status: "warning" as const,
    driftStatus: "modified" as const,
    lastModified: "10 minutes ago"
  },
  {
    id: "i-0987654321fedcba0",
    name: "api-server-01",
    type: "EC2 Instance", 
    region: "us-west-2",
    account: "Staging",
    status: "healthy" as const,
    driftStatus: "none" as const,
    lastModified: "3 hours ago"
  }
];

const Resources = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const resourceTypes = [
    { value: "all", label: "All Resources", icon: Database },
    { value: "ec2", label: "EC2 Instances", icon: Server },
    { value: "rds", label: "RDS Databases", icon: HardDrive },
    { value: "vpc", label: "VPC Resources", icon: Cloud },
    { value: "security", label: "Security Groups", icon: Shield },
  ];

  const filteredResources = mockResources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || 
                       (selectedType === "ec2" && resource.type.includes("EC2")) ||
                       (selectedType === "rds" && resource.type.includes("RDS")) ||
                       (selectedType === "vpc" && (resource.type.includes("VPC") || resource.type.includes("Subnet"))) ||
                       (selectedType === "security" && resource.type.includes("Security"));
    return matchesSearch && matchesType;
  });

  const stats = {
    total: mockResources.length,
    healthy: mockResources.filter(r => r.status === "healthy").length,
    warning: mockResources.filter(r => r.status === "warning").length,
    drift: mockResources.filter(r => r.driftStatus !== "none").length
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
          <Button>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
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
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Database className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Healthy</p>
                <p className="text-2xl font-bold text-success">{stats.healthy}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-success"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-warning">{stats.warning}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-warning"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drift Detected</p>
                <p className="text-2xl font-bold text-destructive">{stats.drift}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-destructive"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

          <ResourceTable resources={filteredResources} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Resources;