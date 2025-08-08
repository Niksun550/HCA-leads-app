
"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getFirebaseServices } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/hooks/use-auth";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LogOut, Settings, LayoutDashboard, Menu, Shield, CheckSquare, CalendarDays, LayoutGrid, Wrench, MoreHorizontal, SunMoon, ChevronDown, ClipboardList, MessageCircle } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HcaLogo } from "@/components/icons/hca-logo";
import { doc, onSnapshot } from "firebase/firestore";
import Image from 'next/image';

const NavLink = ({ href, children, isActive, onClick }: { href: string; children: React.ReactNode; isActive: boolean, onClick?: () => void }) => (
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
  </Link>
);

const SidebarContent = ({ onLinkClick, logoUrl }: { onLinkClick?: () => void, logoUrl?: string | null }) => {
    const pathname = usePathname();
    const { user } = useAuth();
    const router = useRouter();
    const [isUtilityOpen, setIsUtilityOpen] = useState(pathname.startsWith('/tasks') || pathname.startsWith('/planner'));

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
    
    const navItems = user?.permissions?.navItems;

    return (
        <>
            <div className="flex h-16 shrink-0 items-center border-b px-6">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                {logoUrl ? <Image src={logoUrl} alt="App Logo" width={32} height={32} className="h-8 w-8 object-contain" /> : <HcaLogo className="h-8 w-8 text-primary" />}
                <span className="font-headline text-lg">HCASolar CRM</span>
              </Link>
            </div>
            <nav className="flex-1 flex flex-col gap-2 p-4">
              {navItems?.dashboard && (
                <NavLink href="/dashboard" isActive={pathname.startsWith('/dashboard')} onClick={onLinkClick}>
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                </NavLink>
              )}
              {navItems?.communication && (
                <NavLink href="/communication" isActive={pathname.startsWith('/communication')} onClick={onLinkClick}>
                    <MessageCircle className="h-5 w-5" />
                    Communication
                </NavLink>
              )}
              {navItems?.utility && (
                <Collapsible open={isUtilityOpen} onOpenChange={setIsUtilityOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&[data-state=open]>div>svg]:rotate-180">
                       <div className="flex items-center gap-3">
                          <ClipboardList className="h-5 w-5" />
                          Utility
                       </div>
                        <div className="flex items-center gap-3">
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                       </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pt-1">
                        {navItems.tasks && (
                          <NavLink href="/tasks" isActive={pathname.startsWith('/tasks')} onClick={onLinkClick}>
                            <CheckSquare className="h-5 w-5 ml-5" />
                            Tasks
                          </NavLink>
                        )}
                        {navItems.planner && (
                          <NavLink href="/planner" isActive={pathname.startsWith('/planner')} onClick={onLinkClick}>
                            <CalendarDays className="h-5 w-5 ml-5" />
                            Planner
                          </NavLink>
                        )}
                    </CollapsibleContent>
                </Collapsible>
              )}
              {navItems?.tools && (
                <NavLink href="/tools" isActive={pathname.startsWith('/tools')} onClick={onLinkClick}>
                    <Wrench className="h-5 w-5" />
                    Tools
                </NavLink>
              )}
               {navItems?.board && (
                 <NavLink href="/board" isActive={pathname.startsWith('/board')} onClick={onLinkClick}>
                    <LayoutGrid className="h-5 w-5" />
                    Board
                 </NavLink>
               )}
              {navItems?.settings && (
                <NavLink href="/settings" isActive={pathname.startsWith('/settings')} onClick={onLinkClick}>
                    <Settings className="h-5 w-5" />
                    Settings
                </NavLink>
              )}
              {navItems?.admin && (
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

const MobileBottomNavLink = ({ href, children, isActive }: { href: string; children: React.ReactNode; isActive: boolean; }) => (
    <Link href={href} className={cn("flex flex-col items-center justify-center flex-1 p-2 rounded-full transition-colors", isActive ? "text-primary" : "text-muted-foreground hover:text-primary")}>
        <div className="relative">
            {children}
        </div>
    </Link>
);


const MobileBottomNav = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    
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

    if (!user || !user.permissions) return null;
    
    const navItems = user.permissions.navItems;

    const mainNavItems = [
        { key: 'dashboard', href: "/dashboard", icon: <LayoutDashboard className="h-6 w-6" />, label: "Dashboard" },
        { key: 'communication', href: "/communication", icon: <MessageCircle className="h-6 w-6" />, label: "Chat" },
        { key: 'board', href: "/board", icon: <LayoutGrid className="h-6 w-6" />, label: "Board" },
    ].filter(item => navItems[item.key as keyof typeof navItems]);

    
    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t shadow-lg z-50 flex sm:hidden items-center justify-around">
            {mainNavItems.map(item => (
                <MobileBottomNavLink key={item.href} href={item.href} isActive={pathname.startsWith(item.href)}>
                    {item.icon}
                </MobileBottomNavLink>
            ))}
            <Popover>
                <PopoverTrigger asChild>
                     <button className={cn("flex flex-col items-center justify-center flex-1 p-2 rounded-full transition-colors text-muted-foreground hover:text-primary")}>
                       <MoreHorizontal className="h-6 w-6" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 mb-20" align="end">
                    <div className="flex flex-col space-y-1">
                         <div className="flex items-center gap-3 p-2 mb-2 border-b pb-3">
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
                         </div>
                        {navItems.tasks && <NavLink href="/tasks" isActive={pathname.startsWith('/tasks')}><CheckSquare className="h-5 w-5" /> Tasks</NavLink>}
                        {navItems.planner && <NavLink href="/planner" isActive={pathname.startsWith('/planner')}><CalendarDays className="h-5 w-5" /> Planner</NavLink>}
                        {navItems.tools && <NavLink href="/tools" isActive={pathname.startsWith('/tools')}><Wrench className="h-5 w-5" /> Tools</NavLink>}
                        {navItems.settings && <NavLink href="/settings" isActive={pathname.startsWith('/settings')}><Settings className="h-5 w-5" /> Settings</NavLink>}
                        {navItems.admin && <NavLink href="/admin" isActive={pathname.startsWith('/admin')}><Shield className="h-5 w-5" /> Admin</NavLink>}
                         <DropdownMenuSeparator />
                         <button onClick={handleLogout} className="flex items-center gap-3 rounded-lg px-3 py-2 text-destructive transition-colors hover:bg-destructive/10 w-full text-left">
                            <LogOut className="h-5 w-5" />
                            <span>Log out</span>
                         </button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const { db } = getFirebaseServices();
    if (!db) return;

    const settingsRef = doc(db, 'settings', 'branding');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            setLogoUrl(docSnap.data().logoUrl);
        } else {
            setLogoUrl(null);
        }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading || !user) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <div className="grid min-h-screen w-full">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <SidebarContent logoUrl={logoUrl}/>
      </aside>
      <div className="flex flex-col sm:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            {logoUrl ? <Image src={logoUrl} alt="App Logo" width={32} height={32} className="h-8 w-8 object-contain"/> : <HcaLogo className="h-8 w-8 text-primary" />}
            <span className="font-headline text-lg">HCASolar CRM</span>
          </Link>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-8 pb-20 sm:pb-8">
            {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
