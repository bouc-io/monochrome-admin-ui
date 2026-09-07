import { forwardRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ConnectionStatus } from "./ConnectionStatus";
import { AutoScrollToggle } from "./AutoScrollToggle";
import { MessageSearch, MessageSearchRef } from "./MessageSearch";
import { NavigationDropdown } from "./NavigationDropdown";

interface ChatHeaderProps {
  onNewChat: () => void;
  autoScroll?: boolean;
  onAutoScrollToggle?: () => void;
  messages?: { text: string; isBot: boolean; timestamp: Date }[];
  onHighlightMessage?: (index: number | null) => void;
}

export const ChatHeader = forwardRef<MessageSearchRef, ChatHeaderProps>(
  (
    {
      onNewChat,
      autoScroll = true,
      onAutoScrollToggle,
      messages = [],
      onHighlightMessage,
    },
    ref,
  ) => {
    return (
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center space-x-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold text-foreground">ChatBot</h1>
        </div>
        <div className="flex items-center space-x-2">
          {messages.length > 0 && onHighlightMessage && (
            <MessageSearch
              ref={ref}
              messages={messages}
              onHighlightMessage={onHighlightMessage}
            />
          )}
          <Button
            onClick={onNewChat}
            variant="outline"
            size="sm"
            className="md:hidden"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {onAutoScrollToggle && (
            <AutoScrollToggle
              enabled={autoScroll}
              onToggle={onAutoScrollToggle}
            />
          )}
          <ConnectionStatus />
          <NavigationDropdown />
        </div>
      </div>
    );
  },
);

ChatHeader.displayName = "ChatHeader";
