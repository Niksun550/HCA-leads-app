
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, LeadStatus, AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter } from 'lucide-react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { LeadsChart } from '@/components/dashboard/leads-chart';
import { LeadsTable } from '@/components/dashboard/leads-table';
import LeadForm from '@/components/dashboard/lead-form';
import LeadsMap from '@/components/dashboard/leads-map';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { leadStatuses } from '@/types';

export default function DashboardPage() {
  const { user, isInitialized } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [statusFilters, setStatusFilters] = useState<Record<LeadStatus, boolean>>(() => {
    const initialFilters: Partial<Record<LeadStatus, boolean>> = {};
    leadStatuses.forEach(status => initialFilters[status] = true);
    return initialFilters as Record<LeadStatus, boolean>;
  });

  useEffect(() => {
    if (!isInitialized || !user) {
      // Wait for auth context to be initialized and user to be available
      return;
    }

    setLoading(true);

    const fetchUsersAndLeads = async () => {
      // Set the current user immediately. For Admins, fetch others.
      setAllUsers([user]);

      if (user.role === 'Admin') {
        try {
          const usersCollection = collection(db, 'users');
          const usersSnapshot = await getDocs(usersCollection);
          const usersData = usersSnapshot.docs.map(doc => doc.data() as AppUser);
          setAllUsers(usersData);
        } catch (error) {
          console.error("Error fetching users:", error);
          // Fallback to only the current user if fetching fails
          setAllUsers([user]);
        }
      }

      // Determine the query based on the user's role
      const leadsQuery = user.role === 'Admin'
        ? query(collection(db, 'leads'))
        : query(collection(db, 'leads'), where('ownerId', '==', user.uid));

      // Subscribe to lead updates
      const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
        setLeads(leadsData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching leads:", error);
        setLoading(false);
      });

      // Return the cleanup function for the subscription
      return unsubscribeLeads;
    };

    let unsubscribe: (() => void) | undefined;
    fetchUsersAndLeads().then(unsub => {
        unsubscribe = unsub;
    });

    // Cleanup subscription on component unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };

  }, [user, isInitialized]);

  const handleAddLead = () => {
    setSelectedLead(null);
    setIsFormOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsFormOpen(true);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => statusFilters[lead.status]);
  }, [leads, statusFilters]);

  if (!isInitialized || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
           <div className="md:col-span-3">
             <Skeleton className="h-80" />
           </div>
           <div className="md:col-span-2">
             <Skeleton className="h-80" />
           </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.displayName}!</p>
        </div>
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ListFilter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {leadStatuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilters[status]}
                  onCheckedChange={(checked) => setStatusFilters(prev => ({...prev, [status]: !!checked}))}
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {user?.role !== 'Viewer' && (
            <Button onClick={handleAddLead}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </header>

      <StatCards leads={filteredLeads} />

      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <LeadsChart leads={filteredLeads} />
        </div>
        <div className="md:col-span-2">
          <LeadsMap leads={filteredLeads} />
        </div>
      </div>
      
      <LeadsTable leads={filteredLeads} onEdit={handleEditLead} />

      <LeadForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        lead={selectedLead}
        users={allUsers}
      />
    </div>
  );
}
