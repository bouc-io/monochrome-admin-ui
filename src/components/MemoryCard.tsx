import { useState } from "react";
import {
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Clock,
  Tag,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Memory,
  categoryColors,
  categoryIcons,
  importanceColors,
} from "@/lib/memoryApi";
import { cn } from "@/lib/utils";

interface MemoryCardProps {
  memory: Memory;
  onEdit: (memory: Memory) => void;
  onDelete: (memoryId: string) => void;
  onToggleActive: (memoryId: string) => void;
  isSelected?: boolean;
}

export const MemoryCard = ({
  memory,
  onEdit,
  onDelete,
  onToggleActive,
  isSelected = false,
}: MemoryCardProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const importanceLabels: Record<Memory["importance"], string> = {
    low: "Low Priority",
    medium: "Medium Priority",
    high: "High Priority",
    critical: "Critical",
  };

  const sourceLabels: Record<Memory["source"], string> = {
    manual: "Added by you",
    imported: "Imported",
    inferred: "AI inferred",
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-l-4",
        importanceColors[memory.importance],
        isSelected && "ring-2 ring-primary",
        !memory.isActive && "opacity-60",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{categoryIcons[memory.category]}</span>
            <Badge
              variant="secondary"
              className={cn("capitalize", categoryColors[memory.category])}
            >
              {memory.category}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                memory.importance === "critical" &&
                  "border-red-500 text-red-600",
                memory.importance === "high" &&
                  "border-orange-500 text-orange-600",
                memory.importance === "medium" &&
                  "border-yellow-500 text-yellow-600",
                memory.importance === "low" &&
                  "border-muted-foreground text-muted-foreground",
              )}
            >
              {importanceLabels[memory.importance]}
            </Badge>
            {!memory.isActive && (
              <Badge variant="destructive" className="gap-1">
                <PowerOff className="w-3 h-3" />
                Inactive
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleActive(memory.id)}
              className={cn(
                "h-8 w-8",
                memory.isActive
                  ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={memory.isActive ? "Deactivate memory" : "Activate memory"}
            >
              {memory.isActive ? (
                <Power className="w-4 h-4" />
              ) : (
                <PowerOff className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(memory)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Edit memory"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete memory"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Delete Memory
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this memory? This action
                    cannot be undone. The AI will no longer have access to this
                    information.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(memory.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="text-foreground leading-relaxed">{memory.content}</p>

        {memory.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {memory.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Updated {formatDate(memory.updatedAt)}
        </span>
        <span className="italic">{sourceLabels[memory.source]}</span>
      </CardFooter>
    </Card>
  );
};
