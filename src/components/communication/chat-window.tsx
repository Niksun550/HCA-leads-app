
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, doc, addDoc, setDoc, onSnapshot, query, orderBy, Timestamp, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
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
  selectedUser: AppUser | null; // For starting new chats
  onBack?: () => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export function ChatWindow({ conversation, selectedUser, onBack, onConversationCreated }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const activeConversationId = conversation?.id;

  useEffect(() => {
    // Clear messages when conversation changes
    setMessages([]);

    if (!activeConversationId) {
        return;
    }
    
    setIsLoading(true);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const getParticipantInfo = () => {
    if (!conversation) return { name: selectedUser?.displayName, photo: selectedUser?.photoURL };
    if (!user) return null;

    const otherParticipantId = conversation.participants.find(p => p !== user.uid);
    if (!otherParticipantId) return null;

    return {
        name: conversation.participantNames[otherParticipantId],
        photo: conversation.participantPhotos[otherParticipantId]
    }
  }
  
  const participantInfo = getParticipantInfo();
  
  const handleCreateConversation = async () => {
    if (!user || !selectedUser) return;
    const { db } = getFirebaseServices();
    if (!db) return;

    setIsLoading(true);

    try {
        const sortedParticipants = [user.uid, selectedUser.uid].sort();
        const conversationId = sortedParticipants.join('_');
        
        const conversationsRef = collection(db, 'conversations');
        
        // Check if conversation already exists
        const q = query(conversationsRef, 
            where('participants', '==', sortedParticipants)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Conversation exists
            const existingConv = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Conversation;
            onConversationCreated(existingConv);
        } else {
             // Create new conversation
            const newConversationData: Omit<Conversation, 'id'> = {
                participants: sortedParticipants,
                participantNames: {
                    [user.uid]: user.displayName || user.email || 'User',
                    [selectedUser.uid]: selectedUser.displayName || selectedUser.email || 'User',
                },
                participantPhotos: {
                    [user.uid]: user.photoURL || null,
                    [selectedUser.uid]: selectedUser.photoURL || null,
                },
                lastMessage: null,
                updatedAt: Timestamp.now(),
            };
            
            const newConvRef = doc(conversationsRef, conversationId);
            await setDoc(newConvRef, newConversationData);
            onConversationCreated({ id: newConvRef.id, ...newConversationData });
        }
    } catch (error) {
        console.error("Error creating conversation:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !user) return;

    if (!activeConversationId && selectedUser) {
        // This should be handled by creating the conversation first.
        // As a fallback, we could trigger creation here, but the UI flow should prevent this.
        console.warn("No active conversation. Message not sent.");
        return;
    }
    
    if (!activeConversationId) return;

    setIsSending(true);
    const { db } = getFirebaseServices();
    if (!db) return;
    
    try {
        const newMessageData: Omit<Message, 'id'> = {
            text: newMessage,
            authorId: user.uid,
            createdAt: Timestamp.now(),
        };
        
        const messagesRef = collection(db, `conversations/${activeConversationId}/messages`);
        const conversationRef = doc(db, 'conversations', activeConversationId);
        
        const batch = writeBatch(db);
        
        const messageId = uuidv4();
        const newMessageRef = doc(messagesRef, messageId);
        
        batch.set(newMessageRef, { ...newMessageData, id: messageId });
        batch.update(conversationRef, {
            lastMessage: { ...newMessageData, id: messageId },
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
  
  if (!conversation && selectedUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-card">
         {isMobile && onBack && (
            <div className="w-full p-2 border-b">
                 <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft />
                </Button>
            </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={selectedUser.photoURL || undefined} data-ai-hint="user avatar" />
                <AvatarFallback>{getInitials(selectedUser.displayName)}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{selectedUser.displayName}</h2>
            <p className="text-muted-foreground">{selectedUser.email}</p>
            <Button onClick={handleCreateConversation} className="mt-6" disabled={isLoading}>
                {isLoading ? <LoaderCircle className="animate-spin mr-2" /> : <MessageSquare className="mr-2"/>}
                Start Chat
            </Button>
        </div>
      </div>
    );
  }

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
                <LoaderCircle className="animate-spin" />
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
                                <p className="text-sm">{msg.text}</p>
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
