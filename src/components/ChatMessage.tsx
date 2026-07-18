import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, ChevronRight, ChevronDown, RotateCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logger from '@/lib/logger';

const log = logger.child('ChatMessage');

interface ChatMessageProps {
  message: string;
  isBot?: boolean;
  onResubmit?: () => void;
  timestamp?: Date;
}

export const ChatMessage = ({ message, isBot = false, onResubmit, timestamp }: ChatMessageProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  // Format timestamp
  const formatTime = (date?: Date) => {
    if (!date) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Parse message to separate reasoning and main content
  const parseMessage = (text: string) => {
    const thinkMatch = text.match(/<think>(.*?)<\/think>/s);
    const reasoning = thinkMatch ? thinkMatch[1].trim() : null;
    const mainContent = text.replace(/<think>.*?<\/think>/s, "").trim();
    return { reasoning, mainContent };
  };

  const { reasoning, mainContent } = parseMessage(message);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        description: t.messageCopied,
      });
    } catch (error) {
      log.error('Failed to copy message:', error);
      toast({
        description: t.copyFailed,
        variant: "destructive",
      });
    }
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    log.info(`User ${type}d the message:`, message);
    // TODO: Implement actual feedback functionality
  };

  return (
    <div className={cn("flex w-full flex-col", isBot ? "items-start" : "items-end")}>
      {/* Reasoning section - only show for bot messages with reasoning */}
      {isBot && reasoning && (
        <div className={cn("mb-2 max-w-[80%]", isBot ? "self-start" : "self-end")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
            className={cn(
              "h-auto p-2 text-xs text-muted-foreground hover:text-foreground",
              "flex items-center gap-1"
            )}
          >
            {isReasoningExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            Reasoning
          </Button>
          {isReasoningExpanded && (
            <div className={cn(
              "mt-1 rounded-lg border px-3 py-2 text-xs",
              "bg-muted/50 text-muted-foreground"
            )}>
              <p className="whitespace-pre-wrap leading-relaxed">{reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* Main message bubble */}
      <div className={cn("flex w-full", isBot ? "justify-start" : "justify-end")}>
        <div
          className={cn(
            "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
            isBot
              ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
              : "bg-gray-300 text-gray-900 dark:bg-gray-600 dark:text-white"
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {mainContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Action buttons and timestamp */}
      <div className={cn("mt-1 flex items-center gap-2", isBot ? "self-start" : "self-end")}>
        {/* Timestamp */}
        {timestamp && (
          <span className="text-[10px] text-muted-foreground">
            {formatTime(timestamp)}
          </span>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className={cn(
            "h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600",
            "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
          aria-label={isBot ? t.copyAiMessage : t.copyUserMessage}
        >
          <Copy size={12} />
        </Button>
        
        {!isBot && onResubmit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResubmit}
            className={cn(
              "h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20",
              "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            )}
            aria-label="Resubmit message"
          >
            <RotateCw size={12} />
          </Button>
        )}
        
        {isBot && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('like')}
              className={cn(
                "h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/20",
                "text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
              )}
              aria-label={t.goodResponse}
            >
              <ThumbsUp size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('dislike')}
              className={cn(
                "h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20",
                "text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              )}
              aria-label={t.badResponse}
            >
              <ThumbsDown size={12} />
            </Button>
          </>
        )}
        </div>
      </div>
    </div>
  );
};
