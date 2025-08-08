
"use client";

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AppUser } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { UserList } from '@/components/communication/user-list';
import { WhatsAppChatWindow } from '@/components/communication/whatsapp-chat-window';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageSquare } from 'lucide-react';

export default function CommunicationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const { db } = getFirebaseServices();
    if (!db || !user) return;

    setLoading(true);
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => doc.data() as AppUser)
        .filter(u => u.uid !== user.uid);
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
    });

    return () => unsubscribeUsers();
  }, [user]);

  const handleSelectUser = (userToChat: AppUser) => {
    setSelectedUser(userToChat);
  };

  const getLayout = () => {
    if (isMobile) {
      return (
        <div className="h-full w-full">
          { !selectedUser ? (
             <UserList
                users={users}
                onSelectUser={handleSelectUser}
                selectedUserId={selectedUser?.uid}
                loading={loading}
              />
          ) : (
             <WhatsAppChatWindow
              key={selectedUser?.uid}
              userToChat={selectedUser}
              onBack={() => {
                setSelectedUser(null);
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
              onSelectUser={handleSelectUser}
              selectedUserId={selectedUser?.uid}
              loading={loading}
            />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
           {selectedUser ? (
            <WhatsAppChatWindow
              key={selectedUser?.uid}
              userToChat={selectedUser}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-card text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Select a user to chat with</p>
              <p className="text-sm">Choose from the list to start a WhatsApp chat.</p>
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
