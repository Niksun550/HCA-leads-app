
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseServices } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, getDocs } from "firebase/firestore";
import type { Conversation, AppUser } from "@/types";
import { ConversationList } from "@/components/communication/conversation-list";
import { ChatWindow } from "@/components/communication/chat-window";
import { Skeleton } from "@/components/ui/skeleton";
import { LoaderCircle } from "lucide-react";

export default function CommunicationPage() {
  const { user, isInitialized } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { db } = getFirebaseServices();

  useEffect(() => {
    if (!isInitialized || !user || !db) {
        if (isInitialized) setLoading(false);
        return;
    }

    const fetchUsers = async () => {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersData = usersSnapshot.docs.map(doc => doc.data() as AppUser);
        setAllUsers(usersData);
    };
    fetchUsers();

    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef,
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(convos);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching conversations:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isInitialized, db]);
  
  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  if (!isInitialized || loading) {
    return (
       <div className="flex h-[calc(100vh-theme(spacing.16))] w-full items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex border-t">
      <aside className="w-1/3 min-w-[280px] max-w-[350px] border-r">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </aside>
      <main className="flex-1">
        <ChatWindow 
            conversation={selectedConversation} 
            users={allUsers}
            onConversationCreated={handleConversationCreated}
        />
      </main>
    </div>
  );
}
