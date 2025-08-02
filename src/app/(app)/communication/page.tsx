
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { getFunctions, httpsCallable } from "firebase/functions";
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
  const [usersLoading, setUsersLoading] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const isMobile = useIsMobile();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const conversationsRef = useRef<Conversation[]>([]);
  const isInitialLoadRef = useRef(true);


  useEffect(() => {
    const { db } = getFirebaseServices();
    if (!db || !user) return;

    setUsersLoading(true);
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => doc.data() as AppUser)
        .filter(u => u.uid !== user.uid);
      setUsers(usersData);
      setUsersLoading(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        setUsersLoading(false);
    });

    return () => unsubscribeUsers();
  }, [user]);
  
  useEffect(() => {
    if (!user) return;
    const { db } = getFirebaseServices();
    if (!db) return;
    
    setConversationsLoading(true);
    const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
    
    const unsubscribeConversations = onSnapshot(conversationsQuery, (snapshot) => {
      const incomingConvs = snapshot.docs.map(doc => {
        const data = doc.data();
        // When reading from onSnapshot, the timestamp is already a Firestore Timestamp
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.now();
        return { id: doc.id, ...data, updatedAt } as Conversation;
      });
      const previousConversations = conversationsRef.current;
      
      if (!isInitialLoadRef.current) {
          incomingConvs.forEach(newConv => {
              const oldConv = previousConversations.find(c => c.id === newConv.id);
              const isNewMessage = !oldConv || (newConv.lastMessage && newConv.lastMessage.id !== oldConv?.lastMessage?.id);

              if (isNewMessage && newConv.lastMessage && newConv.lastMessage.authorId !== user.uid) {
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

      incomingConvs.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      setConversations(incomingConvs);
      conversationsRef.current = incomingConvs;
      setConversationsLoading(false);
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }

    }, (error) => {
      console.error("Error fetching conversations:", error);
      setConversationsLoading(false);
    });

    return () => {
        unsubscribeConversations();
        isInitialLoadRef.current = true;
    }
  }, [user, toast, selectedConversation?.id]);

  const handleSelectUser = async (selectedUser: AppUser) => {
    if (!user) return;
    setIsCreatingConversation(true);

    try {
        const functions = getFunctions();
        const createConversation = httpsCallable(functions, 'createConversation');
        const result = await createConversation({ otherUserId: selectedUser.uid });
        
        const { conversation: convData } = result.data as { conversation: any };
        
        // Manually convert plain object timestamps from Firebase function to Firestore Timestamp objects
        const updatedAt = convData.updatedAt && convData.updatedAt._seconds ? new Timestamp(convData.updatedAt._seconds, convData.updatedAt._nanoseconds) : Timestamp.now();
        
        const lastMessage = convData.lastMessage && convData.lastMessage.createdAt && convData.lastMessage.createdAt._seconds ? {
            ...convData.lastMessage,
            createdAt: new Timestamp(convData.lastMessage.createdAt._seconds, convData.lastMessage.createdAt._nanoseconds)
        } : convData.lastMessage;

        const conversation: Conversation = {
            ...convData,
            updatedAt,
            lastMessage,
        };

        setSelectedConversation(conversation);
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

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (user && conversation.unreadCounts && conversation.unreadCounts[user.uid] > 0) {
      const { db } = getFirebaseServices();
      if (!db) return;
      const conversationRef = doc(db, 'conversations', conversation.id);
      await updateDoc(conversationRef, {
        [`unreadCounts.${user.uid}`]: 0
      });
    }
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
                usersLoading={usersLoading || isCreatingConversation}
                conversationsLoading={conversationsLoading || isCreatingConversation}
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
              usersLoading={usersLoading || isCreatingConversation}
              conversationsLoading={conversationsLoading || isCreatingConversation}
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
