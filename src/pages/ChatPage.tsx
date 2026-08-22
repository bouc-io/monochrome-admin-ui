
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatHeader } from "@/components/ChatHeader";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Message as OllamaMessage, useOllamaApi } from "@/lib/ollamaApi";
import { getAvailableModels } from "@/lib/models";
import { useChatbotApi, Chat, Message } from "@/lib/chatbotApi";
import logger from '@/lib/logger';

const log = logger.child('ChatPage');

interface DisplayMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const availableModels = getAvailableModels();
  
  // Get model from localStorage or default to first model
  const getInitialModel = () => {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel && availableModels.find(m => m.id === savedModel)) {
      return savedModel;
    }
    return availableModels[0]?.id || "llama3.2";
  };
  
  const [selectedModel, setSelectedModel] = useState(getInitialModel());
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [chatTitle, setChatTitle] = useState<string>("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThinkingContent, setStreamingThinkingContent] = useState("");
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  const { sendMessage, sendMessageStreaming, stopGeneration } = useOllamaApi();
  const { getAllChats, getChatById, getAllMessagesByChat, deleteChat, createMessage, updateChat } = useChatbotApi();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<(number | null)[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<{ open: () => void }>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Focus input with / key (when not already focused on an input)
      if (e.key === "/" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Ctrl+N for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
      
      // Ctrl+F for search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.open();
      }
      
      // ? for keyboard shortcuts help (when not in input)
      if (e.key === "?" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setShowShortcutsHelp(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Save selected model to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  const scrollToBottom = () => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, autoScroll, streamingContent]);

  // Load all chats for sidebar
  const loadChats = useCallback(async () => {
    log.info('Loading chats...');
    try {
      const fetchedChats = await getAllChats();
      const sortedChats = fetchedChats.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setChats(sortedChats);
    } catch (error) {
      log.error('Failed to load chats:', error);
      setChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, [getAllChats]);

  // Function to update chat timestamp and reorder
  const updateChatTimestamp = useCallback(async (chatIdNum: number) => {
    try {
      // Get the current chat to preserve its data
      const currentChat = chats.find(chat => chat.id === chatIdNum);
      if (!currentChat) return;

      // Update the chat's updatedAt timestamp
      const updatedChat = await updateChat(chatIdNum, {
        title: currentChat.title,
        summary: currentChat.summary
      });

      // Update the local chats state with the new timestamp and reorder
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => 
          chat.id === chatIdNum ? updatedChat : chat
        );
        // Sort by updatedAt in descending order
        return updatedChats.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });

      log.info(`Chat ${chatIdNum} timestamp updated and reordered`);
    } catch (error) {
      log.error(`Failed to update chat ${chatIdNum} timestamp:`, error);
    }
  }, [chats, updateChat]);

  // Load specific chat and its messages
  const loadChat = useCallback(async (id: string) => {
    if (!id) return;
    
    setIsChatLoading(true);
    setError(null);
    
    try {
      const chatIdNum = parseInt(id, 10);
      if (isNaN(chatIdNum)) {
        throw new Error('Invalid chat ID');
      }

      log.info(`Loading chat ${chatIdNum}...`);
      
      // Load chat metadata
      const chat = await getChatById(chatIdNum);
      setChatTitle(chat.title || "Untitled Chat");
      
      // Load chat messages
      const chatMessages = await getAllMessagesByChat(chatIdNum);
      
      // Sort messages by creation date
      const sortedMessages = chatMessages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Convert to display format and store message IDs
      const displayMessages: DisplayMessage[] = sortedMessages.map(msg => ({
        text: msg.content,
        isBot: msg.role === 'assistant',
        timestamp: new Date(msg.createdAt)
      }));
      
      messageIdsRef.current = sortedMessages.map(msg => msg.id);
      
      setMessages(displayMessages);
      log.info(`Chat ${chatIdNum} loaded with ${displayMessages.length} messages`);
      
    } catch (error) {
      log.error('Failed to load chat:', error);
      setError('Failed to load chat. Please try again.');
      setChatTitle("Error Loading Chat");
      setMessages([]);
    } finally {
      setIsChatLoading(false);
    }
  }, [getChatById, getAllMessagesByChat]);

  // Load chats and specific chat when component mounts or chatId changes
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (chatId) {
      loadChat(chatId);
    }
  }, [chatId, loadChat]);

  // Handle initial message from navigation state - only run once per navigation
  useEffect(() => {
    const state = location.state as { initialMessage?: string; selectedModel?: string } | null;
    if (state?.initialMessage && chatId) {
      log.info('Processing initial message from navigation state');
      
      // Set the model if provided
      if (state.selectedModel) {
        setSelectedModel(state.selectedModel);
      }
      
      // Send the initial message
      handleSendMessage(state.initialMessage);
      
      // Clear the navigation state to prevent re-sending on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [chatId]); // Only depend on chatId, not location.state to prevent infinite loops

  const handleDeleteChat = useCallback(async (chatIdToDelete: number) => {
    log.info(`Deleting chat with ID: ${chatIdToDelete}`);
    
    try {
      await deleteChat(chatIdToDelete);
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatIdToDelete));
      
      // If we're currently viewing the deleted chat, navigate to home
      if (chatId && parseInt(chatId, 10) === chatIdToDelete) {
        navigate('/');
      }
      
      log.info(`Chat ${chatIdToDelete} deleted successfully`);
    } catch (error) {
      log.error(`Failed to delete chat ${chatIdToDelete}:`, error);
    }
  }, [deleteChat, chatId, navigate]);

  const handleSendMessage = async (message: string) => {
    if (!chatId) return;
    
    const chatIdNum = parseInt(chatId, 10);
    if (isNaN(chatIdNum)) return;

    setMessages(prev => [...prev, {
      text: message,
      isBot: false,
      timestamp: new Date()
    }]);
    setIsLoading(true);
    setStreamingContent("");
    setStreamingThinkingContent("");

    try {
      // Save user message to database
      const userMsg = await createMessage(chatIdNum, {
        role: 'user',
        content: message
      });
      messageIdsRef.current.push(userMsg.id);
      log.info('User message saved to database');

      // Convert messages to Ollama format
      const ollamaMessages: OllamaMessage[] = messages.map(msg => ({
        role: msg.isBot ? 'assistant' as const : 'user' as const,
        content: msg.text
      })).concat({
        role: 'user' as const,
        content: message
      });

      let fullResponse = "";
      let thinkingContent = "";

      await sendMessageStreaming(ollamaMessages, selectedModel, {
        onToken: (token) => {
          fullResponse += token;
          setStreamingContent(fullResponse);
        },
        onThinking: (thinking) => {
          thinkingContent = thinking;
          setStreamingThinkingContent(thinking);
        },
        onDone: async () => {
          // Combine thinking and response if present
          const finalContent = thinkingContent 
            ? `<think>${thinkingContent}</think>\n\n${fullResponse}`
            : fullResponse;

          setMessages(prev => [...prev, {
            text: finalContent,
            isBot: true,
            timestamp: new Date()
          }]);
          setStreamingContent("");
          setStreamingThinkingContent("");
          setIsLoading(false);

          // Save AI response to database
          if (finalContent) {
            try {
              const aiMsg = await createMessage(chatIdNum, {
                role: 'assistant',
                content: finalContent
              });
              messageIdsRef.current.push(aiMsg.id);
              log.info('AI response saved to database');
              await updateChatTimestamp(chatIdNum);
            } catch (err) {
              log.error('Failed to save AI response:', err);
            }
          }
        },
        onError: (error) => {
          log.error('Error getting response from Ollama:', error);
          setMessages(prev => [...prev, {
            text: "Sorry, I encountered an error while processing your request.",
            isBot: true,
            timestamp: new Date()
          }]);
          setStreamingContent("");
          setStreamingThinkingContent("");
          setIsLoading(false);
        }
      });

    } catch (error) {
      log.error('Error in handleSendMessage:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error while processing your request.",
        isBot: true,
        timestamp: new Date()
      }]);
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  const handleStopGeneration = () => {
    stopGeneration();
    if (streamingContent) {
      setMessages(prev => [...prev, {
        text: streamingContent + "\n\n*[Generation stopped]*",
        isBot: true,
        timestamp: new Date()
      }]);
    }
    setStreamingContent("");
    setIsLoading(false);
  };

  const handleNewChat = () => {
    navigate('/');
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    log.info(`Model changed to: ${modelId}`);
  };

  const handleResubmit = async (messageIndex: number) => {
    if (!chatId) return;
    
    const chatIdNum = parseInt(chatId, 10);
    if (isNaN(chatIdNum)) return;

    const messageToResubmit = messages[messageIndex];
    if (!messageToResubmit || messageToResubmit.isBot) return;

    log.info(`Resubmitting message at index ${messageIndex}`);

    const truncatedMessages = messages.slice(0, messageIndex + 1);
    setMessages(truncatedMessages);
    messageIdsRef.current = messageIdsRef.current.slice(0, messageIndex + 1);
    
    setIsLoading(true);
    setStreamingContent("");

    try {
      const ollamaMessages: OllamaMessage[] = truncatedMessages.map(msg => ({
        role: msg.isBot ? 'assistant' as const : 'user' as const,
        content: msg.text
      }));

      let fullResponse = "";
      let thinkingContent = "";

      await sendMessageStreaming(ollamaMessages, selectedModel, {
        onToken: (token) => {
          fullResponse += token;
          setStreamingContent(fullResponse);
        },
        onThinking: (thinking) => {
          thinkingContent = thinking;
        },
        onDone: async () => {
          const finalContent = thinkingContent 
            ? `<think>${thinkingContent}</think>\n\n${fullResponse}`
            : fullResponse;

          setMessages(prev => [...prev, {
            text: finalContent,
            isBot: true,
            timestamp: new Date()
          }]);
          setStreamingContent("");
          setIsLoading(false);

          if (finalContent) {
            try {
              const aiMsg = await createMessage(chatIdNum, {
                role: 'assistant',
                content: finalContent
              });
              messageIdsRef.current.push(aiMsg.id);
              log.info('AI response saved to database (resubmit)');
              await updateChatTimestamp(chatIdNum);
            } catch (err) {
              log.error('Failed to save AI response:', err);
            }
          }
        },
        onError: (error) => {
          log.error('Error getting response from Ollama:', error);
          setMessages(prev => [...prev, {
            text: "Sorry, I encountered an error while processing your request.",
            isBot: true,
            timestamp: new Date()
          }]);
          setStreamingContent("");
          setIsLoading(false);
        }
      });

    } catch (error) {
      log.error('Error getting response from Ollama:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error while processing your request.",
        isBot: true,
        timestamp: new Date()
      }]);
      setStreamingContent("");
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-white">
          <ChatSidebar 
            chats={chats} 
            onNewChat={handleNewChat}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            isLoading={isLoadingChats}
            onDeleteChat={handleDeleteChat}
          />
          <SidebarInset className="flex flex-col h-screen">
            <div className="sticky top-0 z-10 bg-white border-b border-border">
              <ChatHeader onNewChat={handleNewChat} />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-white">
        <ChatSidebar 
          chats={chats} 
          onNewChat={handleNewChat}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          isLoading={isLoadingChats}
          onDeleteChat={handleDeleteChat}
        />
        <SidebarInset className="flex flex-col h-screen">
          {/* Fixed Header with ChatHeader component */}
          <div className="sticky top-0 z-10 bg-white">
            <ChatHeader 
              ref={searchRef}
              onNewChat={handleNewChat} 
              autoScroll={autoScroll}
              onAutoScrollToggle={() => setAutoScroll(!autoScroll)}
              messages={messages}
              onHighlightMessage={setHighlightedMessageIndex}
            />
            <div className="flex items-center justify-between p-4 border-b border-border bg-background">
              <h1 className="text-lg font-semibold text-foreground">
                {isChatLoading ? "Loading..." : chatTitle}
              </h1>
            </div>
          </div>
          
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto w-full px-4 py-4">
                {isChatLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <TypingIndicator />
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    {messages.map((message, index) => (
                      <div 
                        key={index}
                        className={`transition-all duration-300 ${highlightedMessageIndex === index ? 'ring-2 ring-primary rounded-lg' : ''}`}
                        ref={highlightedMessageIndex === index ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
                      >
                        <ChatMessage
                          message={message.text}
                          isBot={message.isBot}
                          timestamp={message.timestamp}
                          onResubmit={!message.isBot ? () => handleResubmit(index) : undefined}
                        />
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex w-full justify-start">
                        <div className="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm bg-gray-100 dark:bg-gray-700">
                          {/* Typing indicator at top */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex space-x-1">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                                  style={{
                                    animationDelay: `${i * 0.15}s`,
                                    animationDuration: "0.6s",
                                  }}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground ml-1">AI is thinking...</span>
                          </div>
                          {/* Streaming content below */}
                          {streamingContent && (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-gray-900 dark:text-white">
                              {streamingThinkingContent && (
                                <div className="mb-2 text-xs text-muted-foreground italic">
                                  Reasoning: {streamingThinkingContent.slice(0, 100)}...
                                </div>
                              )}
                              {streamingContent}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          {/* Fixed Input Area */}
          <div className="sticky bottom-0 z-10 bg-white">
            <div className="max-w-4xl mx-auto w-full px-4 py-4">
              <ChatInput 
                onSend={handleSendMessage} 
                disabled={isLoading || isChatLoading} 
                inputRef={inputRef}
                isStreaming={isLoading}
                onStop={handleStopGeneration}
              />
            </div>
          </div>
        </SidebarInset>
      </div>
      
      <KeyboardShortcutsHelp 
        isOpen={showShortcutsHelp} 
        onClose={() => setShowShortcutsHelp(false)} 
      />
    </SidebarProvider>
  );
};

export default ChatPage;