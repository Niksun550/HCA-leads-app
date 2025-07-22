
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, doc, addDoc, onSnapshot, query, orderBy, Timestamp, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { AppUser, Conversation, Message } from "@/types";
import { v4 as uuidv4 } from 'uuid';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, LoaderCircle, ArrowLeft, MessageSquare, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";


interface ChatWindowProps {
  conversation: Conversation | null;
  onBack?: () => void;
}

export function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const activeConversationId = conversation?.id;

  useEffect(() => {
    // Clear messages when conversation changes to prevent showing old data
    setMessages([]);
    setIsLoading(true);

    if (!activeConversationId) {
        setIsLoading(false);
        return;
    }
    
    const { db } = getFirebaseServices();
    if (!db) return;
    
    const messagesQuery = query(collection(db, `conversations/${activeConversationId}/messages`), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const incomingMessages = snapshot.docs.map(doc => doc.data() as Message);
      setMessages(incomingMessages);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching messages:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeConversationId]);


  useEffect(() => {
    // Debounce scroll to allow images to load
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);
  
  const getParticipantInfo = () => {
    if (!conversation || !user) return null;

    const otherParticipantId = conversation.participants.find(p => p !== user.uid);
    if (!otherParticipantId) return { name: 'Group Chat', photo: null };

    return {
        name: conversation.participantNames[otherParticipantId],
        photo: conversation.participantPhotos[otherParticipantId]
    }
  }
  
  const participantInfo = getParticipantInfo();
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !user || !activeConversationId) return;

    setIsSending(true);
    const { db } = getFirebaseServices();
    if (!db) return;
    
    try {
        const messageId = uuidv4();
        const newMessageData: Message = {
            id: messageId,
            text: newMessage,
            authorId: user.uid,
            createdAt: Timestamp.now(),
        };
        
        const messagesRef = collection(db, `conversations/${activeConversationId}/messages`);
        const conversationRef = doc(db, 'conversations', activeConversationId);
        
        const batch = writeBatch(db);
        
        const newMessageRef = doc(messagesRef, messageId);
        
        batch.set(newMessageRef, newMessageData);
        batch.update(conversationRef, {
            lastMessage: newMessageData,
            updatedAt: serverTimestamp()
        });
        
        await batch.commit();

        setNewMessage("");
    } catch (error) {
        console.error("Error sending message:", error);
    } finally {
        setIsSending(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  if (!conversation) {
      return null;
  }

  return (
    <div className="flex flex-col h-full bg-card">
        <div className="p-4 border-b flex items-center gap-4">
            {isMobile && onBack && (
                 <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft />
                </Button>
            )}
            <Avatar>
                <AvatarImage src={participantInfo?.photo || undefined} data-ai-hint="user avatar" />
                <AvatarFallback>{getInitials(participantInfo?.name)}</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold">{participantInfo?.name || 'Conversation'}</h3>
        </div>

      <ScrollArea className="flex-grow p-4">
        {isLoading && messages.length === 0 ? (
             <div className="flex items-center justify-center h-full">
                <LoaderCircle className="animate-spin text-primary" />
            </div>
        ) : (
            <div className="space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-16">
                        <MessageSquare className="h-16 w-16 mb-4" />
                        <p className="font-semibold">No messages yet</p>
                        <p className="text-sm">Be the first to send a message.</p>
                    </div>
                ) : (
                messages.map((msg) => {
                    const isSender = msg.authorId === user?.uid;
                    return (
                    <div key={msg.id} className={cn("flex items-end gap-2", isSender ? "justify-end" : "justify-start")}>
                        <div className="flex flex-col gap-1">
                            <div className={cn(
                            "p-3 rounded-lg max-w-xs md:max-w-md",
                            isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                            )}>
                                <p className="text-sm break-words">{msg.text}</p>
                                <p className={cn("text-xs mt-1 text-right", isSender ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                                    {msg.createdAt ? format(msg.createdAt.toDate(), 'p') : '...'}
                                </p>
                            </div>
                        </div>
                    </div>
                    );
                })
                )}
                <div ref={messagesEndRef} />
            </div>
        )}
      </ScrollArea>

      <Separator />

      <footer className="p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={newMessage.trim() === "" || isSending}>
                {isSending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
        </form>
      </footer>
    </div>
  );
}
