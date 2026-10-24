import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Memory,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  categoryIcons,
} from "@/lib/memoryApi";

interface MemoryEditorProps {
  memory?: Memory | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateMemoryRequest | UpdateMemoryRequest) => void;
  isLoading?: boolean;
}

export const MemoryEditor = ({
  memory,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: MemoryEditorProps) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Memory["category"]>("preference");
  const [importance, setImportance] = useState<Memory["importance"]>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const isEditing = !!memory;

  useEffect(() => {
    if (memory) {
      setContent(memory.content);
      setCategory(memory.category);
      setImportance(memory.importance);
      setTags([...memory.tags]);
    } else {
      setContent("");
      setCategory("preference");
      setImportance("medium");
      setTags([]);
    }
    setNewTag("");
  }, [memory, isOpen]);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    if (!content.trim()) return;

    const data: CreateMemoryRequest | UpdateMemoryRequest = {
      content: content.trim(),
      category,
      importance,
      tags,
    };

    onSave(data);
  };

  const categories: Array<{
    value: Memory["category"];
    label: string;
    icon: string;
  }> = [
    {
      value: "preference",
      label: "Preference",
      icon: categoryIcons.preference,
    },
    { value: "fact", label: "Fact", icon: categoryIcons.fact },
    { value: "context", label: "Context", icon: categoryIcons.context },
    {
      value: "instruction",
      label: "Instruction",
      icon: categoryIcons.instruction,
    },
    { value: "persona", label: "Persona", icon: categoryIcons.persona },
  ];

  const importanceLevels: Array<{
    value: Memory["importance"];
    label: string;
    color: string;
  }> = [
    { value: "low", label: "Low", color: "text-muted-foreground" },
    { value: "medium", label: "Medium", color: "text-yellow-600" },
    { value: "high", label: "High", color: "text-orange-600" },
    { value: "critical", label: "Critical", color: "text-red-600" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Memory" : "Add New Memory"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this memory to change how the AI understands and responds to you."
              : "Create a new memory to help the AI understand your preferences, context, or instructions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Memory Content</Label>
            <Textarea
              id="content"
              placeholder="Describe what the AI should remember about you..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be specific and clear. This will be used to personalize AI
              responses.
            </p>
          </div>

          {/* Category and Importance Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as Memory["category"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importance">Importance</Label>
              <Select
                value={importance}
                onValueChange={(v) => setImportance(v as Memory["importance"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select importance" />
                </SelectTrigger>
                <SelectContent>
                  {importanceLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <span className={level.color}>{level.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || isLoading}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isLoading
              ? "Saving..."
              : isEditing
                ? "Update Memory"
                : "Add Memory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
