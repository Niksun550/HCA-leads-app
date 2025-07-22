
"use client";

import { useState } from "react";
import type { AppUser, Conversation } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

interface UserListProps {
  users: AppUser[];
  conversations: Conversation[];
  onSelectUser: (user: AppUser) => void;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string | null;
  loading: boolean;
}

export function UserList({
  users,
  conversations,
  onSelectUser,
  onSelectConversation,
  selectedConversationId,
  loading
}: UserListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      <Tabs defaultValue="conversations" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="conversations" className="flex-1">Conversations</TabsTrigger>
          <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1">
          <TabsContent value="conversations" className="m-0">
             {loading && (
                <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
            )}
            {!loading && conversations.map((conv) => {
              if (!user) return null;
              const otherParticipantId = conv.participants.find(p => p !== user.uid);
              if (!otherParticipantId) return null;
              const name = conv.participantNames[otherParticipantId];
              const photo = conv.participantPhotos[otherParticipantId];
              
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={cn(
                    "flex items-center gap-3 p-3 m-2 rounded-lg cursor-pointer transition-colors",
                    selectedConversationId === conv.id ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <Avatar>
                    <AvatarImage src={photo || undefined} data-ai-hint="user avatar" />
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">
                    <p className="font-semibold truncate">{name}</p>
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage?.text || "No messages yet"}</p>
                  </div>
                   {conv.lastMessage && conv.updatedAt?.toDate && (
                     <p className="text-xs text-muted-foreground self-start">
                        {formatDistanceToNowStrict(conv.updatedAt.toDate())}
                    </p>
                   )}
                </div>
              );
            })}
             {!loading && conversations.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</p>
            )}
          </TabsContent>
          <TabsContent value="users" className="m-0">
             {loading && (
                <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
            )}
            {!loading && filteredUsers.map((u) => (
              <div
                key={u.uid}
                onClick={() => onSelectUser(u)}
                className="flex items-center gap-3 p-3 m-2 rounded-lg cursor-pointer hover:bg-muted/50"
              >
                <Avatar>
                  <AvatarImage src={u.photoURL || undefined} data-ai-hint="user avatar" />
                  <AvatarFallback>{getInitials(u.displayName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <p className="font-semibold truncate">{u.displayName}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>
            ))}
             {!loading && filteredUsers.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No users found.</p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
