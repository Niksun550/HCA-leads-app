
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Message, AppUser } from "@/types";
import { summarizeConversation } from "@/ai/flows/summarize-flow";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, LoaderCircle, Sparkles, MessageSquare, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LeadChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  users: AppUser[];
  isSubmitting: boolean;
}

export function LeadChat({ messages = [], onSendMessage, users, isSubmitting }: LeadChatProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const usersMap = new Map(users.map(u => [u.uid, u]));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !user) return;
    onSendMessage(newMessage);
    setNewMessage("");
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummary(null);
    try {
      const serializableMessages = messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toDate().toISOString(),
      }));
      const result = await summarizeConversation(serializableMessages);
      setSummary(result.summary);
    } catch (error) {
      console.error("Error summarizing conversation:", error);
      setSummary("Sorry, I couldn't generate a summary for this conversation.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
        <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Lead Conversation</h3>
            <Button variant="outline" size="sm" onClick={handleSummarize} disabled={isSummarizing || messages.length === 0}>
                {isSummarizing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Summarize
            </Button>
        </div>

        {(isSummarizing || summary) && (
             <div className="p-4 border-b bg-muted/50">
                {isSummarizing ? (
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span>Generating summary...</span>
                    </div>
                ) : (
                    <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Conversation Summary</AlertTitle>
                        <AlertDescription className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                            {summary}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        )}

      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-16">
                    <MessageSquare className="h-16 w-16 mb-4" />
                    <p className="font-semibold">No messages yet</p>
                    <p className="text-sm">Start the conversation about this lead.</p>
                </div>
            ) : (
            messages.map((msg) => {
                const sender = usersMap.get(msg.authorId);
                const isSender = msg.authorId === user.uid;
                return (
                <div key={msg.id} className={cn("flex items-end gap-2", isSender ? "justify-end" : "justify-start")}>
                    {!isSender && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={sender?.photoURL || undefined} data-ai-hint="user avatar" />
                        <AvatarFallback>{getInitials(sender?.displayName)}</AvatarFallback>
                    </Avatar>
                    )}
                    <div className="flex flex-col gap-1">
                        {!isSender && <p className="text-xs text-muted-foreground ml-3">{sender?.displayName || 'Unknown User'}</p>}
                        <div className={cn(
                        "p-3 rounded-lg max-w-xs md:max-w-md",
                        isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                        )}>
                            <p className="text-sm">{msg.text}</p>
                            <p className={cn("text-xs mt-1 text-right", isSender ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                                {msg.createdAt ? format(msg.createdAt.toDate(), 'p') : '...'}
                            </p>
                        </div>
                    </div>
                    {isSender && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL || undefined} data-ai-hint="user avatar" />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    )}
                </div>
                );
            })
            )}
            <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <Separator />

      <footer className="p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            disabled={isSubmitting}
            />
            <Button type="submit" size="icon" disabled={newMessage.trim() === "" || isSubmitting}>
                {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
        </form>
      </footer>
    </div>
  );
}
