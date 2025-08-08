
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, LeadStatus, AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, FileSpreadsheet, LoaderCircle, Sparkles, User as UserIcon, TrendingUp } from 'lucide-react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { LeadsTable } from '@/components/dashboard/leads-table';
import LeadForm from '@/components/dashboard/lead-form';
import LeadsMap from '@/components/dashboard/leads-map';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { leadStatuses, structureLeadStatuses } from '@/types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ClientLeadsChart = dynamic(() => import('@/components/dashboard/client-leads-chart'), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full flex items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
});


export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusFilters, setStatusFilters] = useState<Record<LeadStatus, boolean>>({});
  const [selectedUserId, setSelectedUserId] = useState<string>('all');


  const availableStatuses = useMemo(() => {
    if (!user) return [];
    return user.role === 'Structure' ? structureLeadStatuses : leadStatuses;
  }, [user]);

  useEffect(() => {
    if (availableStatuses.length > 0) {
      const initialFilters = availableStatuses.reduce((acc, status) => {
        acc[status] = true;
        return acc;
      }, {} as Record<LeadStatus, boolean>);
      setStatusFilters(initialFilters);
    }
  }, [availableStatuses]);


  useEffect(() => {
    if (isAuthLoading || !user) {
        if(!isAuthLoading) setLoading(false);
        return;
    }
    
    const { db } = getFirebaseServices();
    if (!db) {
        setLoading(false);
        return;
    }

    setLoading(true);

    const usersCollection = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
        const usersData = snapshot.docs.map(doc => doc.data() as AppUser);
        setAllUsers(usersData);
    });
    
    let unsubscribeLeads: () => void = () => {};

    if (user.role === 'Admin' || user.role === 'Viewer' || user.role === 'Director') {
        const leadsQuery = query(collection(db, 'leads'));
        unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
          const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
          setLeads(leadsData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching leads:", error);
          setLoading(false);
        });
    } else if (user.role === 'Sales Rep') {
        const leadsQuery = query(collection(db, 'leads'), where('ownerId', '==', user.uid));
        unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
          const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
          setLeads(leadsData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching leads:", error);
          setLoading(false);
        });
    } else if (user.role === 'Structure') {
        // For structure role, we listen to two separate queries and merge them.
        const q1 = query(collection(db, 'leads'), where('structureTeamMemberId', '==', user.uid));
        const q2 = query(collection(db, 'leads'), where('status', 'in', structureLeadStatuses));
        
        const unsub1 = onSnapshot(q1, (assignedSnapshot) => {
          const assignedLeads = assignedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
          setLeads(prevLeads => {
            const combined = [...prevLeads.filter(p => p.structureTeamMemberId !== user.uid), ...assignedLeads];
            const uniqueLeads = Array.from(new Map(combined.map(item => [item['id'], item])).values());
            return uniqueLeads;
          });
          setLoading(false);
        }, (error) => {
          console.error("Error fetching assigned structure leads:", error);
          setLoading(false);
        });

        const unsub2 = onSnapshot(q2, (statusSnapshot) => {
          const statusLeads = statusSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
           setLeads(prevLeads => {
            const combined = [...prevLeads.filter(p => !structureLeadStatuses.includes(p.status)), ...statusLeads];
            const uniqueLeads = Array.from(new Map(combined.map(item => [item['id'], item])).values());
            return uniqueLeads;
          });
          setLoading(false);
        }, (error) => {
          console.error("Error fetching status structure leads:", error);
          setLoading(false);
        });

        unsubscribeLeads = () => {
          unsub1();
          unsub2();
        }

    } else {
        setLeads([]);
        setLoading(false);
    }

    return () => {
        unsubscribeUsers();
        if (unsubscribeLeads) {
            unsubscribeLeads();
        }
    };

  }, [user, isAuthLoading]);

  const handleAddLead = () => {
    setSelectedLead(null);
    setIsFormOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsFormOpen(true);
  };
  
  const filteredLeads = useMemo(() => {
    const activeFilters = Object.keys(statusFilters).filter(status => statusFilters[status as LeadStatus]);
    if (activeFilters.length === 0 || Object.keys(statusFilters).length === 0) return [];

    let statusFilteredLeads = leads.filter(lead => statusFilters[lead.status]);

    if ((user?.role === 'Director' || user?.role === 'Admin') && selectedUserId !== 'all') {
        statusFilteredLeads = statusFilteredLeads.filter(lead => lead.ownerId === selectedUserId || lead.structureTeamMemberId === selectedUserId);
    }
    
    return statusFilteredLeads;
  }, [leads, statusFilters, user, selectedUserId]);

  const handleExport = () => {
    const dataToExport = filteredLeads.map(lead => ({
      'Customer Name': lead.customerName,
      'Mobile Number': lead.mobileNumber,
      'Address': lead.address,
      'KW Requirement': lead.kwRequirement,
      'Status': lead.status,
      'Lead Owner': lead.ownerName,
      'Assigned To': lead.structureTeamMemberName || lead.ownerName,
      'Created At': lead.createdAt && lead.createdAt.toDate ? format(lead.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
      'Closed At': lead.closedAt && lead.closedAt.toDate ? format(lead.closedAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Lead Source': lead.leadBy,
      'Property Type': lead.propertyType,
      'Meter Type': lead.meterType
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Leads');
    XLSX.writeFile(workbook, `SolarLeads_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const areAllStatusesSelected = useMemo(() => {
    return availableStatuses.every(status => statusFilters[status]);
  }, [statusFilters, availableStatuses]);

  const handleSelectAll = (checked: boolean) => {
    const newFilters = { ...statusFilters };
    availableStatuses.forEach(status => {
      newFilters[status] = checked;
    });
    setStatusFilters(newFilters);
  };


  if (isAuthLoading || loading || !user || Object.keys(statusFilters).length === 0) {
    return (
       <div className="flex h-[calc(100vh-theme(spacing.16))] w-full items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isDirectorOrAdmin = user.role === 'Director' || user.role === 'Admin';
  const canAddLead = user.role !== 'Viewer' && user.role !== 'Structure';

  return (
    <div className="py-4 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.displayName}!</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
           {isDirectorOrAdmin && (
             <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {allUsers.map(u => (
                        <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
           )}
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ListFilter className="mr-2 h-4 w-4" />
                Filter Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                  checked={areAllStatusesSelected}
                  onCheckedChange={handleSelectAll}
                >
                  Select All
                </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {availableStatuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilters[status] ?? false}
                  onCheckedChange={(checked) => setStatusFilters(prev => ({...prev, [status]: !!checked}))}
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleExport} disabled={filteredLeads.length === 0}>
             <FileSpreadsheet className="mr-2 h-4 w-4" />
             Export
          </Button>
          {canAddLead && (
            <Button onClick={handleAddLead} className="hidden sm:inline-flex">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </header>
      
      {isDirectorOrAdmin ? (
         <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="forecasting"><TrendingUp className="mr-2"/>Forecasting</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6">
                <div className="space-y-8">
                    <StatCards leads={filteredLeads} />
                    <div className="grid gap-8 md:grid-cols-5">
                      <div className="md:col-span-3">
                        <ClientLeadsChart leads={filteredLeads} key={filteredLeads.map(l => l.id).join(',') + selectedUserId} />
                      </div>
                      <div className="md:col-span-2">
                        <LeadsMap leads={filteredLeads} />
                      </div>
                    </div>
                    <LeadsTable leads={filteredLeads} onEdit={handleEditLead} />
                </div>
            </TabsContent>
            <TabsContent value="forecasting" className="mt-6">
                <ForecastingDashboard leads={leads} />
            </TabsContent>
          </Tabs>
      ) : (
        <div className="space-y-8">
          <StatCards leads={filteredLeads} />

          <div className="grid gap-8 md:grid-cols-5">
            <div className="md:col-span-3">
              <ClientLeadsChart leads={filteredLeads} key={filteredLeads.map(l => l.id).join(',')} />
            </div>
            <div className="md:col-span-2">
              <LeadsMap leads={filteredLeads} />
            </div>
          </div>
          
          <LeadsTable leads={filteredLeads} onEdit={handleEditLead} />
        </div>
      )}

      {canAddLead && (
         <Button 
          onClick={handleAddLead}
          className="sm:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <PlusCircle className="h-7 w-7" />
          <span className="sr-only">Add Lead</span>
        </Button>
      )}

      <LeadForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        lead={selectedLead}
        users={allUsers}
      />
      
    </div>
  );
}

const ForecastingDashboard = ({ leads }: { leads: Lead[] }) => (
    <div className="space-y-8">
        <p className="text-muted-foreground">This is a placeholder for the forecasting dashboard.</p>
    </div>
);
