"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import Link from "next/link";

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    description?: string | null;
    status?: string;
    created_at: string;
  };
  onDelete: (id: string) => void;
}

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    generating: "bg-blue-100 text-blue-800",
    generated: "bg-green-100 text-green-800",
    published: "bg-purple-100 text-purple-800",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="line-clamp-1">{workspace.name}</CardTitle>
            {workspace.description && (
              <CardDescription className="mt-1.5 line-clamp-2">
                {workspace.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/sites/${workspace.id}`}>Open</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(workspace.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Created {new Date(workspace.created_at).toLocaleDateString()}</span>
          {workspace.status && (
            <Badge className={statusColors[workspace.status as keyof typeof statusColors] || ""}>
              {workspace.status}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
