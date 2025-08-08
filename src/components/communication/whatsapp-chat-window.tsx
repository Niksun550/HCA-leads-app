
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/types";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
)

interface WhatsAppChatWindowProps {
  userToChat: AppUser | null;
  onBack?: () => void;
}

export function WhatsAppChatWindow({ userToChat, onBack }: WhatsAppChatWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const isMobile = useIsMobile();
  
  if (!userToChat) {
      return null;
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === "" || !user) return;

    if (!userToChat.whatsappNumber) {
        toast({
            variant: "destructive",
            title: "Missing WhatsApp Number",
            description: `${userToChat.displayName} has not provided their WhatsApp number.`
        });
        return;
    }
    
    const url = `https://wa.me/${userToChat.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setMessage("");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  return (
    <div className="flex flex-col h-full bg-card">
        <div className="p-4 border-b flex items-center gap-4">
            {isMobile && onBack && (
                 <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft />
                </Button>
            )}
            <Avatar>
                <AvatarImage src={userToChat?.photoURL || undefined} data-ai-hint="user avatar" />
                <AvatarFallback>{getInitials(userToChat?.displayName)}</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold">{userToChat?.displayName || 'Conversation'}</h3>
        </div>

      <div className="flex-grow p-4 flex flex-col items-center justify-center text-center bg-muted/30">
          <MessageSquare className="h-20 w-20 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold">Send a WhatsApp Message</h2>
          <p className="text-muted-foreground max-w-sm">
            You are about to start a conversation with <strong>{userToChat.displayName}</strong>. 
            Type your message below and click send to open WhatsApp.
          </p>
          {!userToChat.whatsappNumber && (
            <Alert variant="destructive" className="mt-6 text-left">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing Number</AlertTitle>
              <AlertDescription>
                This user has not yet added their WhatsApp number in their settings.
              </AlertDescription>
            </Alert>
          )}
      </div>

      <Separator />

      <footer className="p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message ${userToChat.displayName}...`}
              disabled={!userToChat.whatsappNumber}
              className="min-h-0 h-12"
            />
            <Button type="submit" size="icon" disabled={message.trim() === "" || !userToChat.whatsappNumber}>
                <WhatsAppIcon />
            </Button>
        </form>
      </footer>
    </div>
  );
}
