
"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getFirebaseServices } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/hooks/use-auth";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, Sun, ChevronDown, Settings, MessageSquare } from "lucide-react";
import { LoaderCircle } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const handleLogout = async () => {
    const { auth } = getFirebaseServices();
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('');
  }

  if (!isInitialized || !user) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  return (
      <SidebarProvider>
      <Sidebar>
          <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
              <Sun className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold font-headline text-foreground group-data-[collapsible=icon]:hidden">SolarLeads</h1>
          </div>
          </SidebarHeader>
          <SidebarContent>
          <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard" isActive={pathname.startsWith('/dashboard')} tooltip="Dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/communication" isActive={pathname.startsWith('/communication')} tooltip="Communication">
                    <MessageSquare />
                    <span>Communication</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton href="/settings" isActive={pathname.startsWith('/settings')} tooltip="Settings">
                      <Settings />
                      <span>Settings</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start h-auto p-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:aspect-square">
                  <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} data-ai-hint="user avatar" />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="text-left group-data-[collapsible=icon]:hidden">
                      <p className="font-semibold text-sm">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                  </div>
              </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                  </p>
                  </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
              </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
          </SidebarFooter>
      </Sidebar>
      <SidebarInset>
          <div className="min-h-screen">
          {children}
          </div>
      </SidebarInset>
      </SidebarProvider>
  )
}
