
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs, or } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
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
import { ForecastingDashboard } from '@/components/dashboard/forecasting-dashboard';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { leadStatuses, structureLeadStatuses } from '@/types';

export default function DashboardPage() {
  const { user, isInitialized } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const availableStatuses = useMemo(() => {
    return user?.role === 'Structure' ? structureLeadStatuses : leadStatuses;
  }, [user]);

  const [statusFilters, setStatusFilters] = useState<Record<LeadStatus, boolean>>(() => {
    const initialFilters: Partial<Record<LeadStatus, boolean>> = {};
    const statusesToUse = user?.role === 'Structure' ? structureLeadStatuses : leadStatuses;
    statusesToUse.forEach(status => initialFilters[status] = true);
    return initialFilters as Record<LeadStatus, boolean>;
  });
  
  useEffect(() => {
    if (!user) return;
    const initialFilters: Partial<Record<LeadStatus, boolean>> = {};
    availableStatuses.forEach(status => initialFilters[status] = true);
    setStatusFilters(initialFilters as Record<LeadStatus, boolean>);
  }, [availableStatuses, user]);


  useEffect(() => {
    if (!isInitialized || !user) {
        if(isInitialized) setLoading(false);
        return;
    }
    
    const { db } = getFirebaseServices();
    if (!db) {
        setLoading(false);
        return;
    }

    setLoading(true);

    const fetchUsersAndLeads = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersData = usersSnapshot.docs.map(doc => doc.data() as AppUser);
        setAllUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
        setAllUsers([user]); // Fallback to current user
      }

      let leadsQuery;
      if (user.role === 'Admin' || user.role === 'Viewer' || user.role === 'Director') {
          leadsQuery = query(collection(db, 'leads'));
      } else if (user.role === 'Sales Rep') {
          leadsQuery = query(collection(db, 'leads'), where('ownerId', '==', user.uid));
      } else if (user.role === 'Structure') {
          leadsQuery = query(collection(db, 'leads'), where('structureTeamMemberId', '==', user.uid));
      } else {
          // Default to no leads if role is unrecognized
          leadsQuery = query(collection(db, 'leads'), where('ownerId', '==', 'invalid'));
      }

      const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
        setLeads(leadsData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching leads:", error);
        setLoading(false);
      });

      return unsubscribeLeads;
    };

    let unsubscribe: (() => void) | undefined;
    fetchUsersAndLeads().then(unsub => {
        unsubscribe = unsub;
    });

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
          <h1 className="text-3xl font-bold font-headline tracking-tight">{user?.role === 'Director' ? 'Director Dashboard' : 'Dashboard'}</h1>
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
              {availableStatuses.map((status) => (
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
          {user?.role !== 'Viewer' && user?.role !== 'Structure' && user?.role !== 'Director' && (
            <Button onClick={handleAddLead}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </header>
      
      {user?.role === 'Director' ? (
        <ForecastingDashboard leads={filteredLeads} />
      ) : (
        <>
          <StatCards leads={filteredLeads} />

          <div className="grid gap-8 md:grid-cols-5">
            <div className="md:col-span-3">
              <LeadsChart leads={filteredLeads} />
            </div>
            <div className="md:col-span-2">
              <LeadsMap leads={filteredLeads} />
            </div>
          </div>
        </>
      )}

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
