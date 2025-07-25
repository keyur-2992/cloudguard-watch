import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, MoreHorizontal, Database, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Account {
  id: string;
  name: string;
  region: string;
  lastScan: string;
  status: "healthy" | "warning" | "error";
  resourceCount: number;
  driftCount: number;
}

interface AccountCardProps {
  account: Account;
}

const AccountCard = ({ account }: AccountCardProps) => {
  const getStatusIcon = () => {
    switch (account.status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusColor = () => {
    switch (account.status) {
      case "healthy":
        return "bg-success/10 text-success border-success/20";
      case "warning":
        return "bg-warning/10 text-warning border-warning/20";
      case "error":
        return "bg-destructive/10 text-destructive border-destructive/20";
    }
  };

  return (
    <Card className="shadow-soft hover:shadow-medium transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{account.name}</h3>
            <Badge variant="outline" className={getStatusColor()}>
              {getStatusIcon()}
              {account.status}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Run Scan</DropdownMenuItem>
              <DropdownMenuItem>Edit Settings</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Remove Account</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-mono text-xs">{account.id}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{account.region}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {account.resourceCount} resources
              </span>
            </div>
            
            {account.driftCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {account.driftCount} drift{account.driftCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-1 border-t border-border">
            Last scan: {account.lastScan}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountCard;