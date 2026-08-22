import { Brain, BarChart3 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ConnectionStatus } from "./ConnectionStatus";
import { NavigationDropdown } from "./NavigationDropdown";
import { Badge } from "@/components/ui/badge";
import { Memory } from "@/lib/memoryApi";

interface MemoryHeaderProps {
  memories: Memory[];
}

export const MemoryHeader = ({ memories }: MemoryHeaderProps) => {
  const activeCount = memories.filter(m => m.isActive).length;
  const totalCount = memories.length;

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background">
      <div className="flex items-center space-x-4">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Memory Manager</h1>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="hidden md:flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <BarChart3 className="w-3 h-3" />
            {activeCount} active / {totalCount} total
          </Badge>
        </div>
        <ConnectionStatus />
        <NavigationDropdown />
      </div>
    </div>
  );
};
