"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getFirebaseServices } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from "@/hooks/use-auth";
import type { Conversation } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Sun, Settings, LayoutDashboard, Menu, MessageSquare, Shield, CheckSquare, CalendarDays, LayoutGrid, Wrench } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NavLink = ({ href, children, isActive, onClick, unreadCount }: { href: string; children: React.ReactNode; isActive: boolean, onClick?: () => void, unreadCount?: number }) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn(
      "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
      isActive && "bg-muted text-primary"
    )}
  >
    <div className="flex items-center gap-3">
        {children}
    </div>
    {unreadCount !== undefined && unreadCount > 0 && (
        <Badge className="h-6 w-6 shrink-0 justify-center rounded-full p-0">{unreadCount}</Badge>
    )}
  </Link>
);

const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
    const pathname = usePathname();
    const { user } = useAuth();
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const { db } = getFirebaseServices();
        if (!db) return;

        const q = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalUnread = 0;
            snapshot.forEach(doc => {
                const conv = doc.data() as Omit<Conversation, 'id'>;
                totalUnread += conv.unreadCounts?.[user.uid] || 0;
            });
            setUnreadCount(totalUnread);
        });

        return () => unsubscribe();
    }, [user]);

    const handleLogout = async () => {
        const { auth } = getFirebaseServices();
        if (!auth) return;
        await signOut(auth);
        router.push("/login");
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    
    if (!user) return null;

    return (
        <>
            <div className="flex h-16 shrink-0 items-center border-b px-6">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <Sun className="h-6 w-6 text-primary" />
                <span className="font-headline text-lg">SolarLeads</span>
              </Link>
            </div>
            <nav className="flex-1 flex flex-col gap-2 p-4">
              <NavLink href="/dashboard" isActive={pathname.startsWith('/dashboard')} onClick={onLinkClick}>
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </NavLink>
              <NavLink href="/tasks" isActive={pathname.startsWith('/tasks')} onClick={onLinkClick}>
                <CheckSquare className="h-5 w-5" />
                Tasks
              </NavLink>
              <NavLink href="/tools" isActive={pathname.startsWith('/tools')} onClick={onLinkClick}>
                <Wrench className="h-5 w-5" />
                Tools
              </NavLink>
               <NavLink href="/board" isActive={pathname.startsWith('/board')} onClick={onLinkClick}>
                <LayoutGrid className="h-5 w-5" />
                Board
              </NavLink>
               <NavLink href="/planner" isActive={pathname.startsWith('/planner')} onClick={onLinkClick}>
                <CalendarDays className="h-5 w-5" />
                Planner
              </NavLink>
               <NavLink href="/communication" isActive={pathname.startsWith('/communication')} onClick={onLinkClick} unreadCount={unreadCount}>
                <MessageSquare className="h-5 w-5" />
                Communication
              </NavLink>
              <NavLink href="/settings" isActive={pathname.startsWith('/settings')} onClick={onLinkClick}>
                <Settings className="h-5 w-5" />
                Settings
              </NavLink>
              {user.role === 'Admin' && (
                <NavLink href="/admin" isActive={pathname.startsWith('/admin')} onClick={onLinkClick}>
                    <Shield className="h-5 w-5" />
                    Admin
                </NavLink>
              )}
            </nav>
            <div className="mt-auto p-4 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.photoURL || undefined} data-ai-hint="user avatar" />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </>
    );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || !user) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <SidebarContent />
      </aside>
      <div className="flex flex-col sm:pl-64 w-full">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs flex flex-col p-0">
               <SheetHeader className="p-4 border-b">
                 <SheetTitle>Menu</SheetTitle>
               </SheetHeader>
               <SidebarContent onLinkClick={() => setIsSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold sm:hidden">
            <Sun className="h-6 w-6 text-primary" />
            <span className="font-headline text-lg">SolarLeads</span>
          </Link>
        </header>
        <main className="flex-1 p-4 sm:p-8">
            {children}
        </main>
      </div>
    </div>
  );
}
