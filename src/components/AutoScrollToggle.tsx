import { ArrowDownToLine, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AutoScrollToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export const AutoScrollToggle = ({ enabled, onToggle }: AutoScrollToggleProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "h-8 w-8 p-0",
              enabled 
                ? "text-primary bg-primary/10 hover:bg-primary/20" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {enabled ? (
              <ArrowDownToLine size={16} />
            ) : (
              <ArrowDown size={16} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Auto-scroll: {enabled ? "On" : "Off"}</p>
          <p className="text-xs text-muted-foreground">
            {enabled ? "New messages will scroll into view" : "Manual scrolling only"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
