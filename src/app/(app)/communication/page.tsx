
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
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
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

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
      setConversations(prevConvs => {
        const incomingConvs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
        
        // Handle notifications
        if (prevConvs.length > 0) { // Only notify after initial load
            incomingConvs.forEach(newConv => {
                const oldConv = prevConvs.find(c => c.id === newConv.id);
                // Notify if it's a new conversation or there's a new message in an existing one
                const isNewMessage = !oldConv || (newConv.lastMessage && newConv.lastMessage.id !== oldConv.lastMessage?.id);

                if (isNewMessage && newConv.lastMessage && newConv.lastMessage.authorId !== user.uid) {
                    // Don't show notification if we are already viewing that chat
                    if(selectedConversation?.id !== newConv.id) {
                      const otherParticipantId = newConv.participants.find(p => p !== user.uid);
                      const senderName = otherParticipantId ? newConv.participantNames[otherParticipantId] : 'Someone';
                      toast({
                          title: `New message from ${senderName}`,
                          description: newConv.lastMessage?.text,
                      });
                    }
                }
            });
        }
        
        // Safe sorting
        incomingConvs.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
        return incomingConvs;
      });

      setLoading(false);
    }, (error) => {
      console.error("Error fetching conversations:", error);
      setLoading(false);
    });

    return unsubscribeConversations;
  }, [user, toast, selectedConversation?.id]);


  useEffect(() => {
    const unsubscribe = fetchConversations();
    return () => unsubscribe?.();
  }, [fetchConversations]);

  const handleSelectUser = async (selectedUser: AppUser) => {
    if (!user) return;
    setIsCreatingConversation(true);

    // Check if a conversation with this user already exists
    const existingConversation = conversations.find(c => 
      c.participants.length === 2 && c.participants.includes(selectedUser.uid)
    );

    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setIsCreatingConversation(false);
      return;
    }

    // If no conversation exists, create a new one
    const { db } = getFirebaseServices();
    if (!db) {
      setIsCreatingConversation(false);
      return;
    };
    
    const sortedParticipants = [user.uid, selectedUser.uid].sort();
    const conversationId = sortedParticipants.join('_');
    const conversationRef = doc(db, 'conversations', conversationId);

    try {
        const docSnap = await getDoc(conversationRef);
        if(docSnap.exists()) {
             const convData = { id: docSnap.id, ...docSnap.data() } as Conversation;
             setSelectedConversation(convData);
        } else {
            const newConversation: Omit<Conversation, 'id'> = {
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
            await setDoc(conversationRef, newConversation);
            const createdConv = { id: conversationRef.id, ...newConversation } as Conversation;
            
            // Add to local state immediately
            setConversations(prev => [createdConv, ...prev]);
            setSelectedConversation(createdConv);
        }
    } catch(error) {
        console.error("Error creating or fetching conversation:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not start the conversation.'
        });
    } finally {
        setIsCreatingConversation(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const getLayout = () => {
    if (isMobile) {
      return (
        <div className="h-full w-full">
          { !selectedConversation ? (
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
              key={selectedConversation?.id}
              conversation={selectedConversation}
              onBack={() => {
                setSelectedConversation(null);
              }}
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
              loading={loading || isCreatingConversation}
            />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
           {selectedConversation ? (
            <ChatWindow
              key={selectedConversation?.id}
              conversation={selectedConversation}
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
