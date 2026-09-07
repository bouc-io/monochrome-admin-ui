import { useState, useEffect, useCallback, useRef } from "react";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Search,
  X,
} from "lucide-react";
import { MemorySidebar } from "@/components/MemorySidebar";
import { MemoryHeader } from "@/components/MemoryHeader";
import { MemoryCard } from "@/components/MemoryCard";
import { MemoryEditor } from "@/components/MemoryEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import {
  Memory,
  useMemoryApi,
  CreateMemoryRequest,
  UpdateMemoryRequest,
} from "@/lib/memoryApi";
import logger from "@/lib/logger";

const log = logger.child("Index");

const Index = () => {
  const { toast } = useToast();
  const {
    getAllMemories,
    createMemory,
    updateMemory,
    deleteMemory,
    toggleMemoryActive,
    searchMemories,
  } = useMemoryApi();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<
    Memory["category"] | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMemories = useCallback(async () => {
    try {
      const response = await getAllMemories();
      setMemories(response.memories);
    } catch (error) {
      log.error("Failed to load memories:", error);
      toast({
        title: "Error",
        description: "Failed to load memories. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAllMemories, toast]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleNewMemory = () => {
    setEditingMemory(null);
    setEditorOpen(true);
  };

  const handleEditMemory = (memory: Memory) => {
    setEditingMemory(memory);
    setEditorOpen(true);
  };

  const handleMemorySelect = (memory: Memory) => {
    setSelectedMemory(memory.id === selectedMemory?.id ? null : memory);
  };

  const handleSaveMemory = async (
    data: CreateMemoryRequest | UpdateMemoryRequest,
  ) => {
    setIsSaving(true);
    try {
      if (editingMemory) {
        const updated = await updateMemory(
          editingMemory.id,
          data as UpdateMemoryRequest,
        );
        setMemories((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
        toast({
          title: "Memory updated",
          description: "Your memory has been updated successfully.",
        });
      } else {
        const created = await createMemory(data as CreateMemoryRequest);
        setMemories((prev) => [created, ...prev]);
        toast({
          title: "Memory created",
          description: "Your new memory has been added.",
        });
      }
      setEditorOpen(false);
      setEditingMemory(null);
    } catch (error) {
      log.error("Failed to save memory:", error);
      toast({
        title: "Error",
        description: "Failed to save memory. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await deleteMemory(memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      if (selectedMemory?.id === memoryId) {
        setSelectedMemory(null);
      }
      toast({
        title: "Memory deleted",
        description: "The memory has been permanently removed.",
      });
    } catch (error) {
      log.error("Failed to delete memory:", error);
      toast({
        title: "Error",
        description: "Failed to delete memory. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (memoryId: string) => {
    try {
      const updated = await toggleMemoryActive(memoryId);
      setMemories((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      toast({
        title: updated.isActive ? "Memory activated" : "Memory deactivated",
        description: updated.isActive
          ? "This memory is now being used by the AI."
          : "This memory is now inactive and won't be used.",
      });
    } catch (error) {
      log.error("Failed to toggle memory:", error);
      toast({
        title: "Error",
        description: "Failed to update memory status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Semantic search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchMemories(searchQuery, 20, 0.3);
        setSearchResults(results.map((r) => r.memoryId));
      } catch (err) {
        log.error("Semantic search failed, falling back to text filter:", err);
        // Fallback: text substring match
        const query = searchQuery.toLowerCase();
        setSearchResults(
          memories
            .filter((m) => m.content.toLowerCase().includes(query))
            .map((m) => m.id),
        );
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, searchMemories, memories]);

  // Filter memories for the main view
  const displayedMemories = memories.filter((memory) => {
    const categoryMatch =
      filterCategory === "all" || memory.category === filterCategory;
    const searchMatch =
      searchResults === null || searchResults.includes(memory.id);
    return categoryMatch && searchMatch;
  });

  // Stats for empty state
  const stats = [
    {
      icon: Sparkles,
      label: "Personalized responses",
      description: "AI tailored to your preferences",
    },
    {
      icon: TrendingUp,
      label: "Improved accuracy",
      description: "Better context understanding",
    },
    {
      icon: Shield,
      label: "Your data, your control",
      description: "Edit or delete anytime",
    },
    {
      icon: Zap,
      label: "Instant updates",
      description: "Changes apply immediately",
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <MemorySidebar
          memories={memories}
          onNewMemory={handleNewMemory}
          isLoading={isLoading}
          selectedMemoryId={selectedMemory?.id}
          onMemorySelect={handleMemorySelect}
          filterCategory={filterCategory}
          onFilterChange={setFilterCategory}
        />
        <SidebarInset className="flex flex-col h-screen">
          {/* Fixed Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border">
            <MemoryHeader memories={memories} />
            {/* Semantic Search Bar */}
            <div className="px-4 pt-2 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search memories semantically..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              {isSearching && (
                <p className="text-xs text-muted-foreground mt-1">
                  Searching...
                </p>
              )}
              {searchResults !== null && !isSearching && (
                <p className="text-xs text-muted-foreground mt-1">
                  {searchResults.length} result
                  {searchResults.length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto w-full px-4 py-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                      <Brain className="w-12 h-12 text-muted-foreground animate-pulse" />
                      <p className="text-muted-foreground">
                        Loading memories...
                      </p>
                    </div>
                  </div>
                ) : displayedMemories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                      <Brain className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">
                      {filterCategory !== "all"
                        ? "No memories in this category"
                        : "No memories yet"}
                    </h2>
                    <p className="text-muted-foreground text-center max-w-md mb-8">
                      {filterCategory !== "all"
                        ? "Try selecting a different category or add a new memory."
                        : "Add memories to help the AI understand your preferences, context, and how you like to work."}
                    </p>

                    {filterCategory === "all" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                        {stats.map((stat, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card"
                          >
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <stat.icon className="w-5 h-5 text-foreground" />
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">
                                {stat.label}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {stat.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedMemories.map((memory) => (
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        onEdit={handleEditMemory}
                        onDelete={handleDeleteMemory}
                        onToggleActive={handleToggleActive}
                        isSelected={selectedMemory?.id === memory.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SidebarInset>
      </div>

      {/* Memory Editor Dialog */}
      <MemoryEditor
        memory={editingMemory}
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingMemory(null);
        }}
        onSave={handleSaveMemory}
        isLoading={isSaving}
      />
    </SidebarProvider>
  );
};

export default Index;
