
"use client";

import { useState } from "react";
import type { AppUser } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
  onSelectUser: (user: AppUser) => void;
  selectedUserId?: string | null;
  loading: boolean;
}

export function UserList({
  users,
  onSelectUser,
  selectedUserId,
  loading
}: UserListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b">
        <Input
          placeholder="Search users to chat with..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      <ScrollArea className="h-full">
        {loading ? <UserListSkeleton /> : (
            <div className="pt-2 px-4 space-y-1">
            {filteredUsers.map((u) => (
                <div
                key={u.uid}
                onClick={() => onSelectUser(u)}
                className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    selectedUserId === u.uid ? "bg-muted" : "hover:bg-muted/50"
                )}
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
      </ScrollArea>
    </div>
  );
}
