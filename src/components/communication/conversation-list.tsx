
"use client";

import { useAuth } from "@/hooks/use-auth";
import type { Conversation, AppUser } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationList({ conversations, selectedConversationId, onSelectConversation }: ConversationListProps) {
  const { user } = useAuth();

  if (!user) return null;

  const getOtherParticipant = (convo: Conversation) => {
    const otherId = convo.participants.find(p => p !== user.uid);
    if (!otherId) return { name: "Unknown", photoURL: null };
    return {
      name: convo.participantNames[otherId] || "Unknown User",
      photoURL: convo.participantPhotos[otherId] || null,
    };
  };
  
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Chats</h2>
      </div>
      <div className="flex-grow overflow-y-auto">
        {conversations.map((convo) => {
          const otherParticipant = getOtherParticipant(convo);
          return (
            <button
              key={convo.id}
              onClick={() => onSelectConversation(convo.id)}
              className={cn(
                "flex items-center gap-3 p-3 w-full text-left hover:bg-muted/50 transition-colors",
                selectedConversationId === convo.id && "bg-muted"
              )}
            >
              <Avatar>
                <AvatarImage src={otherParticipant.photoURL || undefined} data-ai-hint="user avatar" />
                <AvatarFallback>{getInitials(otherParticipant.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow truncate">
                <p className="font-semibold truncate">{otherParticipant.name}</p>
                {convo.lastMessage && (
                  <p className="text-sm text-muted-foreground truncate">{convo.lastMessage.text}</p>
                )}
              </div>
              {convo.lastMessage && (
                 <p className="text-xs text-muted-foreground self-start flex-shrink-0">
                    {formatDistanceToNow(convo.lastMessage.timestamp.toDate(), { addSuffix: true })}
                 </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
