
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import type { Message, Conversation, AppUser } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile, UserPlus, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { UserSelect } from "./user-select";
import { useToast } from "@/hooks/use-toast";


interface ChatWindowProps {
  conversation: Conversation | null;
  users: AppUser[];
  onConversationCreated: (conversationId: string) => void;
}

export function ChatWindow({ conversation, users, onConversationCreated }: ChatWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isNewConvoModalOpen, setIsNewConvoModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { db } = getFirebaseServices();

  useEffect(() => {
    if (conversation && db) {
      const messagesRef = collection(db, "conversations", conversation.id, "messages");
      const q = query(messagesRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
      });

      return () => {
        unsubscribe();
        setMessages([]); // Clear messages when conversation changes
      };
    } else {
        setMessages([]); // Clear messages if no conversation is selected
    }
  }, [conversation, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !user || !db || !conversation) return;

    const messagesRef = collection(db, "conversations", conversation.id, "messages");
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: user.uid,
      senderName: user.displayName,
      timestamp: serverTimestamp(),
    });

    const convoRef = doc(db, "conversations", conversation.id);
    await updateDoc(convoRef, {
      lastMessage: {
        text: newMessage,
        senderId: user.uid,
        timestamp: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    setNewMessage("");
  };

  const handleCreateConversation = async () => {
    if (!selectedUser || !user || !db) return;

    const convoId = [user.uid, selectedUser.uid].sort().join('_');
    const convoRef = doc(db, "conversations", convoId);
    const convoSnap = await getDoc(convoRef);

    if (convoSnap.exists()) {
        onConversationCreated(convoId);
    } else {
        await setDoc(convoRef, {
            id: convoId,
            participants: [user.uid, selectedUser.uid],
            participantNames: {
                [user.uid]: user.displayName || user.email || 'User',
                [selectedUser.uid]: selectedUser.displayName || selectedUser.email || 'User',
            },
            participantPhotos: {
                [user.uid]: user.photoURL || null,
                [selectedUser.uid]: selectedUser.photoURL || null,
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: null,
        });
        onConversationCreated(convoId);
    }

    setIsNewConvoModalOpen(false);
    setSelectedUser(null);
  };


  if (!user || !db) return null;

  const getOtherParticipant = () => {
    if (!conversation) return { name: "Select a chat", photoURL: null };
    const otherId = conversation.participants.find(p => p !== user.uid);
    if (!otherId) return { name: "Unknown", photoURL: null };
    return {
      name: conversation.participantNames[otherId] || "Unknown User",
      photoURL: conversation.participantPhotos[otherId] || null,
    };
  };

  const otherParticipant = getOtherParticipant();
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('') || '';

  return (
    <div className="flex flex-col h-full bg-card">
      <header className="flex items-center p-4 border-b shadow-sm gap-3">
        {conversation && (
          <Avatar>
            <AvatarImage src={otherParticipant.photoURL || undefined} data-ai-hint="user avatar" />
            <AvatarFallback>{getInitials(otherParticipant.name)}</AvatarFallback>
          </Avatar>
        )}
        <h2 className="text-lg font-semibold flex-grow">{conversation ? otherParticipant.name : "Select a conversation"}</h2>
         <Button variant="ghost" size="icon" onClick={() => setIsNewConvoModalOpen(true)}>
            <UserPlus className="h-5 w-5" />
            <span className="sr-only">New Conversation</span>
        </Button>
      </header>

      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {!conversation ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <p>Select a conversation or start a new one.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSender = msg.senderId === user.uid;
            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isSender ? "justify-end" : "justify-start")}>
                 {!isSender && (
                  <Avatar className="h-8 w-8">
                     <AvatarImage src={conversation.participantPhotos[msg.senderId] || undefined} data-ai-hint="user avatar" />
                     <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "p-3 rounded-lg max-w-xs md:max-w-md",
                  isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                )}>
                  <p className="text-sm">{msg.text}</p>
                   <p className={cn("text-xs mt-1", isSender ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                      {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : '...'}
                   </p>
                </div>
                 {isSender && (
                   <Avatar className="h-8 w-8">
                     <AvatarImage src={user.photoURL || undefined} data-ai-hint="user avatar" />
                     <AvatarFallback>{getInitials(user.displayName || 'Me')}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
         <div ref={messagesEndRef} />
      </div>

      {conversation && (
        <footer className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={newMessage.trim() === ""}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </footer>
      )}

      <Dialog open={isNewConvoModalOpen} onOpenChange={setIsNewConvoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>Select a user to start chatting with.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UserSelect users={users} selectedUser={selectedUser} onSelectUser={setSelectedUser} currentUser={user} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewConvoModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateConversation} disabled={!selectedUser}>Start Chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
