import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Resource {
  id: string;
  name: string;
  type: string;
  region: string;
  account: string;
  status: "healthy" | "warning" | "error";
  driftStatus: "none" | "drift" | "modified";
  lastModified: string;
}

interface ResourceTableProps {
  resources: Resource[];
}

const ResourceTable = ({ resources }: ResourceTableProps) => {
  const getStatusBadge = (status: Resource["status"]) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-success/10 text-success border-success/20">Healthy</Badge>;
      case "warning":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Warning</Badge>;
      case "error":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>;
    }
  };

  const getDriftBadge = (driftStatus: Resource["driftStatus"]) => {
    switch (driftStatus) {
      case "none":
        return <Badge variant="outline">No Drift</Badge>;
      case "drift":
        return <Badge variant="destructive">Drift Detected</Badge>;
      case "modified":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Modified</Badge>;
    }
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No resources found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Drift Status</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((resource) => (
            <TableRow key={resource.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{resource.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{resource.id}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{resource.type}</Badge>
              </TableCell>
              <TableCell>{resource.account}</TableCell>
              <TableCell>
                <Badge variant="secondary">{resource.region}</Badge>
              </TableCell>
              <TableCell>{getStatusBadge(resource.status)}</TableCell>
              <TableCell>{getDriftBadge(resource.driftStatus)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {resource.lastModified}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View in AWS Console
                    </DropdownMenuItem>
                    <DropdownMenuItem>View Configuration</DropdownMenuItem>
                    <DropdownMenuItem>Check Drift</DropdownMenuItem>
                    <DropdownMenuItem>View History</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ResourceTable;