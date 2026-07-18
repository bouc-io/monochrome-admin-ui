import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare, Plus, Settings, LogOut, User, ChevronDown, MoreHorizontal, Loader2, X, Check } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SettingsOverlay } from "./SettingsOverlay";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/auth/authcontext";
import { getAvailableModels, LLMModel } from "@/lib/models";
import { Chat, useChatbotApi } from "@/lib/chatbotApi";
import { cn } from "@/lib/utils";
import logger from '@/lib/logger';

const log = logger.child('ChatSidebar');

interface ChatSidebarProps {
  chats: Chat[];
  onNewChat: () => void;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  isLoading?: boolean;
  onDeleteChat?: (chatId: number) => void;
  onChatUpdated?: (updatedChat: Chat) => void;
}

export const ChatSidebar = ({ chats, onNewChat, selectedModel, onModelChange, isLoading = false, onDeleteChat, onChatUpdated }: ChatSidebarProps) => {
  const { t } = useLanguage();
  const { logoutUser, user } = useAuth();
  const { updateChat } = useChatbotApi();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();
  const availableModels = getAvailableModels();
  const [currentModel, setCurrentModel] = useState(selectedModel || availableModels[0]?.id || "llama3.2");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"settings" | "account">("settings");
  const [renamingChatId, setRenamingChatId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  
  const currentChatId = chatId ? parseInt(chatId, 10) : null;
  
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId);
    onModelChange?.(modelId);
    log.info(`Switched to model: ${modelId}`);
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

  const handleChatClick = (chatId: number) => {
    navigate(`/chats/${chatId}`);
  };

  const handleChatAction = (chatId: number, action: 'rename' | 'delete', event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation when clicking action buttons
    log.info(`${action} chat with id: ${chatId}`);
    
    if (action === 'delete' && onDeleteChat) {
      onDeleteChat(chatId);
    } else if (action === 'rename') {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setRenamingChatId(chatId);
        setRenameValue(chat.title);
      }
    }
  };

  const handleRenameCancel = () => {
    setRenamingChatId(null);
    setRenameValue("");
  };

  const handleRenameSubmit = async (chatId: number) => {
    if (!renameValue.trim()) {
      return;
    }

    try {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;

      const updatedChat = await updateChat(chatId, {
        title: renameValue.trim(),
        summary: chat.summary
      });

      onChatUpdated?.(updatedChat);
      setRenamingChatId(null);
      setRenameValue("");
      log.info(`Chat ${chatId} renamed successfully to: ${renameValue.trim()}`);
    } catch (error) {
      log.error('Failed to rename chat:', error);
      alert('Failed to rename chat. Please try again.');
      setRenamingChatId(null);
      setRenameValue("");
    }
  };

  const handleRenameKeyDown = (event: React.KeyboardEvent, chatId: number) => {
    if (event.key === 'Enter') {
      handleRenameSubmit(chatId);
    } else if (event.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const currentModelData = availableModels.find(model => model.id === currentModel) || availableModels[0];

  // Get user display information with proper type handling
  const userEmail = (user?.email || user?.preferred_username || "Unknown User") as string;
  const userName = (user?.name || user?.preferred_username || userEmail) as string;
  const userInitials = userName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Sidebar className="border-r border-border bg-background">
        <SidebarHeader className="p-4 space-y-3 bg-background">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto bg-background hover:bg-accent text-foreground">
                <div className="text-left flex-1 min-w-0 mr-2">
                  <p className="font-medium text-sm truncate">{currentModelData?.name || "Unknown Model"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                    {currentModelData?.description || t.aiModel}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-popover border-border">
              {availableModels.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={`flex flex-col items-start p-3 ${currentModel === model.id ? "bg-accent" : ""}`}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.description}</div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            onClick={onNewChat}
            className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.newChat}
          </Button>
        </SidebarHeader>
        
        <SidebarContent className="px-2 bg-background">
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : chats.length === 0 ? (
              <div className="flex items-center justify-center py-8 px-4">
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  {t.noChats}
                </p>
              </div>
            ) : (
              <SidebarMenu>
                {chats.map((chat) => {
                  const isSelected = currentChatId === chat.id;
                  const isRenaming = renamingChatId === chat.id;
                  
                  return (
                    <SidebarMenuItem key={chat.id} className="relative group">
                      <SidebarMenuButton 
                        className={cn(
                          "w-full h-auto p-3 flex flex-col items-start space-y-1 hover:bg-accent text-foreground cursor-pointer",
                          isSelected && "bg-accent/50 border-l-2 border-primary"
                        )}
                        onClick={() => !isRenaming && handleChatClick(chat.id)}
                      >
                        <div className="flex items-center w-full">
                          <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                          {isRenaming ? (
                            <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded px-2 py-1">
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                                className="flex-1 h-6 border-0 p-0 focus-visible:ring-0 text-sm bg-transparent"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameCancel();
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameSubmit(chat.id);
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium text-sm truncate flex-1">
                              {chat.title}
                            </span>
                          )}
                        </div>
                        {!isRenaming && (
                          <div className="w-full text-left">
                            <p className="text-xs text-muted-foreground truncate">
                              {chat.summary}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(chat.updatedAt)}
                            </p>
                          </div>
                        )}
                      </SidebarMenuButton>
                      
                      {!isRenaming && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-accent/50 dark:hover:bg-accent/50"
                                aria-label={t.chatActions}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32 bg-popover border-border">
                              <DropdownMenuItem 
                                onClick={(e) => handleChatAction(chat.id, 'rename', e)}
                                className="text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                {t.rename}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => handleChatAction(chat.id, 'delete', e)}
                                className="text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                              >
                                {t.delete}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
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
              <Button variant="ghost" className="w-full justify-start p-2 h-auto hover:bg-accent text-foreground">
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
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
              <DropdownMenuItem onClick={handleSettingsClick}>
                <Settings className="w-4 h-4 mr-2" />
                {t.settings}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAccountClick}>
                <User className="w-4 h-4 mr-2" />
                {t.account}
              </DropdownMenuItem>
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
