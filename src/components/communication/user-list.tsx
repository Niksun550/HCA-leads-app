
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
import { Badge } from "@/components/ui/badge";

const UserListSkeleton = () => (
    <div className="space-y-1 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        ))}
    </div>
)

interface UserListProps {
  users: AppUser[];
  conversations: Conversation[];
  onSelectUser: (user: AppUser) => void;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string | null;
  usersLoading: boolean;
  conversationsLoading: boolean;
}

export function UserList({
  users,
  conversations,
  onSelectUser,
  onSelectConversation,
  selectedConversationId,
  usersLoading,
  conversationsLoading
}: UserListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("conversations");

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredConversations = conversations.filter(conv => {
    if (!user) return false;
    const otherParticipantId = conv.participants.find(p => p !== user.uid);
    if (!otherParticipantId) return false;
    const name = conv.participantNames[otherParticipantId];
    return name?.toLowerCase().includes(searchTerm.toLowerCase());
  });


  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b">
        <Input
          placeholder={activeTab === 'conversations' ? "Search conversations..." : "Search users..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      <Tabs defaultValue="conversations" onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2">
          <TabsTrigger value="conversations">Chats</TabsTrigger>
          <TabsTrigger value="users">New Chat</TabsTrigger>
        </TabsList>
        <ScrollArea className="h-full">
            <TabsContent value="conversations" className="m-0">
               {conversationsLoading ? <UserListSkeleton /> : (
                <div className="pt-2 px-4 space-y-1">
                    {filteredConversations.map((conv) => {
                        if (!user) return null;
                        const otherParticipantId = conv.participants.find(p => p !== user.uid);
                        if (!otherParticipantId) return null;
                        const name = conv.participantNames[otherParticipantId];
                        const photo = conv.participantPhotos[otherParticipantId];
                        const unreadCount = conv.unreadCounts?.[user.uid] || 0;
                        
                        return (
                        <div
                            key={conv.id}
                            onClick={() => onSelectConversation(conv)}
                            className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            selectedConversationId === conv.id ? "bg-muted" : "hover:bg-muted/50"
                            )}
                        >
                            <Avatar>
                            <AvatarImage src={photo || undefined} data-ai-hint="user avatar" />
                            <AvatarFallback>{getInitials(name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 truncate">
                            <p className={cn("font-semibold truncate", unreadCount > 0 && "font-bold")}>{name}</p>
                            <p className={cn("text-sm text-muted-foreground truncate", unreadCount > 0 && "text-foreground")}>{conv.lastMessage?.text || "No messages yet"}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 self-start">
                            {conv.updatedAt?.toDate && (
                            <p className="text-xs text-muted-foreground shrink-0">
                                {formatDistanceToNowStrict(conv.updatedAt.toDate())}
                            </p>
                            )}
                            {unreadCount > 0 && (
                                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>
                            )}
                            </div>
                        </div>
                        );
                    })}
                    {filteredConversations.length === 0 && (
                        <p className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</p>
                    )}
                </div>
               )}
            </TabsContent>
            <TabsContent value="users" className="m-0">
              {usersLoading ? <UserListSkeleton /> : (
                 <div className="pt-2 px-4 space-y-1">
                    {filteredUsers.map((u) => (
                        <div
                        key={u.uid}
                        onClick={() => onSelectUser(u)}
                        className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50"
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
                    {filteredUsers.length === 0 && (
                        <p className="p-4 text-center text-sm text-muted-foreground">No users found.</p>
                    )}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
      </Tabs>
    </div>
  );
}
