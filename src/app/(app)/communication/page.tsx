
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AppUser, Conversation } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { UserList } from '@/components/communication/user-list';
import { ChatWindow } from '@/components/communication/chat-window';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageSquare } from 'lucide-react';

export default function CommunicationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const { db } = getFirebaseServices();
    if (!db || !user) return;

    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => doc.data() as AppUser)
        .filter(u => u.uid !== user.uid);
      setUsers(usersData);
    });

    return () => unsubscribeUsers();
  }, [user]);
  
  const fetchConversations = useCallback(() => {
    if (!user) return;
    const { db } = getFirebaseServices();
    if (!db) return;
    
    setLoading(true);
    const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
    
    const unsubscribeConversations = onSnapshot(conversationsQuery, (snapshot) => {
      const incomingConvs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      incomingConvs.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

      setConversations(prevConvs => {
        // Check for new messages to show a toast
        if (prevConvs.length > 0 && incomingConvs.length >= prevConvs.length) {
            incomingConvs.forEach(newConv => {
                const oldConv = prevConvs.find(c => c.id === newConv.id);
                // If it's a new conversation or the last message is new
                if ((!oldConv || (newConv.lastMessage && newConv.lastMessage.id !== oldConv.lastMessage?.id)) && newConv.lastMessage?.authorId !== user.uid) {
                     const otherParticipantId = newConv.participants.find(p => p !== user.uid);
                     const senderName = otherParticipantId ? newConv.participantNames[otherParticipantId] : 'Someone';
                     toast({
                         title: `New message from ${senderName}`,
                         description: newConv.lastMessage?.text,
                     });
                }
            });
        }
        return incomingConvs;
      });
      setLoading(false);
    }, (error) => {
      console.error("Error fetching conversations:", error);
      setLoading(false);
    });

    return unsubscribeConversations;
  }, [user, toast]);


  useEffect(() => {
    const unsubscribe = fetchConversations();
    return () => unsubscribe?.();
  }, [fetchConversations]);

  const handleSelectUser = (user: AppUser) => {
    setSelectedUser(user);
    const existingConversation = conversations.find(c => 
      c.participants.length === 2 && c.participants.includes(user.uid)
    );
    setSelectedConversation(existingConversation || null);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedUser(null);
  };
  
  const handleConversationCreated = (conversation: Conversation) => {
    if (!conversations.some(c => c.id === conversation.id)) {
        setConversations(prev => [conversation, ...prev]);
    }
    setSelectedConversation(conversation);
    setSelectedUser(null); // Clear selected user once conversation is created/selected
  };

  const getLayout = () => {
    if (isMobile) {
      return (
        <div className="h-full w-full">
          { !selectedConversation && !selectedUser ? (
             <UserList
                users={users}
                conversations={conversations}
                onSelectUser={handleSelectUser}
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversation?.id}
                loading={loading}
              />
          ) : (
             <ChatWindow
              key={selectedConversation?.id || selectedUser?.uid}
              conversation={selectedConversation}
              selectedUser={selectedUser}
              onBack={() => {
                setSelectedConversation(null);
                setSelectedUser(null);
              }}
              onConversationCreated={handleConversationCreated}
            />
          )}
        </div>
      );
    }
    return (
       <ResizablePanelGroup
        direction="horizontal"
        className="h-full max-h-full items-stretch"
      >
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
           <UserList
              users={users}
              conversations={conversations}
              onSelectUser={handleSelectUser}
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?.id}
              loading={loading}
            />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
           {selectedConversation || selectedUser ? (
            <ChatWindow
              key={selectedConversation?.id || selectedUser?.uid}
              conversation={selectedConversation}
              selectedUser={selectedUser}
              onConversationCreated={handleConversationCreated}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-card text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Select a conversation or user</p>
              <p className="text-sm">Choose from the list to start chatting.</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <div className="h-[calc(100vh_-_theme(spacing.24))] rounded-lg border shadow-sm bg-card overflow-hidden">
        {getLayout()}
    </div>
  );
}
