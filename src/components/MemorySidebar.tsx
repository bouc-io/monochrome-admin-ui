import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Brain,
  Plus,
  Settings,
  LogOut,
  User,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SettingsOverlay } from "./SettingsOverlay";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/auth/authcontext";
import { Memory, categoryColors, categoryIcons } from "@/lib/memoryApi";
import { cn } from "@/lib/utils";

interface MemorySidebarProps {
  memories: Memory[];
  onNewMemory: () => void;
  isLoading?: boolean;
  selectedMemoryId?: string | null;
  onMemorySelect: (memory: Memory) => void;
  filterCategory?: Memory["category"] | "all";
  onFilterChange?: (category: Memory["category"] | "all") => void;
}

export const MemorySidebar = ({
  memories,
  onNewMemory,
  isLoading = false,
  selectedMemoryId,
  onMemorySelect,
  filterCategory = "all",
  onFilterChange,
}: MemorySidebarProps) => {
  const { t } = useLanguage();
  const { logoutUser, user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"settings" | "account">(
    "settings",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const handleSettingsClick = () => {
    setSettingsTab("settings");
    setSettingsOpen(true);
  };

  const handleAccountClick = () => {
    setSettingsTab("account");
    setSettingsOpen(true);
  };

  const handleLogout = () => {
    logoutUser();
  };

  // Filter memories based on search and category
  const filteredMemories = memories.filter((memory) => {
    const matchesSearch =
      searchQuery === "" ||
      memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    const matchesCategory =
      filterCategory === "all" || memory.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get user display information
  const userEmail = (user?.email ||
    user?.preferred_username ||
    "Unknown User") as string;
  const userName = (user?.name ||
    user?.preferred_username ||
    userEmail) as string;
  const userInitials = userName
    .split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const categories: Array<Memory["category"] | "all"> = [
    "all",
    "preference",
    "fact",
    "context",
    "instruction",
    "persona",
  ];

  return (
    <>
      <Sidebar className="border-r border-border bg-background">
        <SidebarHeader className="p-4 space-y-3 bg-background">
          {/* Header with brain icon */}
          <div className="flex items-center gap-2 px-2">
            <Brain className="w-5 h-5 text-foreground" />
            <span className="font-semibold text-foreground">AI Memory</span>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="capitalize">
                    {filterCategory === "all"
                      ? "All Categories"
                      : filterCategory}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onClick={() => onFilterChange?.(cat)}
                  className={cn(filterCategory === cat && "bg-accent")}
                >
                  <span className="mr-2">
                    {cat === "all" ? "📚" : categoryIcons[cat]}
                  </span>
                  <span className="capitalize">
                    {cat === "all" ? "All Categories" : cat}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={onNewMemory}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Memory
          </Button>
        </SidebarHeader>

        <SidebarContent className="px-2 bg-background">
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Brain className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  {searchQuery || filterCategory !== "all"
                    ? "No memories match your filters"
                    : "No memories yet. Add your first memory to help the AI understand you better."}
                </p>
              </div>
            ) : (
              <SidebarMenu>
                {filteredMemories.map((memory) => {
                  const isSelected = selectedMemoryId === memory.id;

                  return (
                    <SidebarMenuItem key={memory.id} className="relative group">
                      <SidebarMenuButton
                        className={cn(
                          "w-full h-auto p-3 flex flex-col items-start space-y-2 hover:bg-accent text-foreground cursor-pointer border-l-4",
                          isSelected && "bg-accent/50",
                          memory.isActive ? "opacity-100" : "opacity-50",
                          memory.importance === "critical"
                            ? "border-l-red-500"
                            : memory.importance === "high"
                              ? "border-l-orange-500"
                              : memory.importance === "medium"
                                ? "border-l-yellow-500"
                                : "border-l-muted-foreground/30",
                        )}
                        onClick={() => onMemorySelect(memory)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-sm">
                            {categoryIcons[memory.category]}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs capitalize",
                              categoryColors[memory.category],
                            )}
                          >
                            {memory.category}
                          </Badge>
                          {!memory.isActive && (
                            <Badge
                              variant="outline"
                              className="text-xs ml-auto"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground line-clamp-2 w-full text-left">
                          {memory.content}
                        </p>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex gap-1 flex-wrap">
                            {memory.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {memory.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{memory.tags.length - 2}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(memory.updatedAt)}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-border bg-background">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start p-2 h-auto hover:bg-accent text-foreground"
              >
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarFallback className="bg-accent text-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left flex-1">
                  <p className="font-medium text-sm truncate">{userEmail}</p>
                  <p className="text-xs text-muted-foreground">{t.freePlan}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-popover border-border"
            >
              <DropdownMenuItem onClick={handleSettingsClick}>
                <Settings className="w-4 h-4 mr-2" />
                {t.settings}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAccountClick}>
                <User className="w-4 h-4 mr-2" />
                {t.account}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                {t.logOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SettingsOverlay
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
      />
    </>
  );
};
