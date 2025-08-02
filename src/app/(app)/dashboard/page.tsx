
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where, getDocs, or } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, LeadStatus, AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, FileSpreadsheet, LoaderCircle, Sparkles } from 'lucide-react';
import { StatCards } from '@/components/dashboard/stat-cards';
import LeadsTable from '@/components/dashboard/leads-table';
import LeadForm from '@/components/dashboard/lead-form';
import LeadsMap from '@/components/dashboard/leads-map';
import { ForecastingDashboard } from '@/components/dashboard/forecasting-dashboard';
import ReengageDialog from '@/components/dashboard/reengage-dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { leadStatuses, structureLeadStatuses } from '@/types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';

const ClientLeadsChart = dynamic(() => import('@/components/dashboard/client-leads-chart'), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full flex items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
});


export default function DashboardPage() {
  const { user, isInitialized } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusFilters, setStatusFilters] = useState<Record<LeadStatus, boolean>>({});
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [isReengageDialogOpen, setIsReengageDialogOpen] = useState(false);


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
    if (!isInitialized || !user) {
        if(isInitialized) setLoading(false);
        return;
    }
    
    const { db } = getFirebaseServices();
    if (!db) {
        setLoading(false);
        return;
    }

    const usersCollection = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
        const usersData = snapshot.docs.map(doc => doc.data() as AppUser);
        setAllUsers(usersData);
    });
    
    let leadsQuery;
    if (user.role === 'Admin' || user.role === 'Viewer' || user.role === 'Director') {
        leadsQuery = query(collection(db, 'leads'));
    } else if (user.role === 'Sales Rep') {
        leadsQuery = query(collection(db, 'leads'), where('ownerId', '==', user.uid));
    } else if (user.role === 'Structure') {
        leadsQuery = query(collection(db, 'leads'), or(
            where('structureTeamMemberId', '==', user.uid),
            where('status', 'in', structureLeadStatuses)
        ));
    } else {
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

    return () => {
        unsubscribeUsers();
        unsubscribeLeads();
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
  
  const handleSelectionChange = useCallback((newSelectedLeads: Lead[]) => {
    setSelectedLeads(newSelectedLeads);
  }, []);
  
  const droppedLeadsSelected = useMemo(() => {
    return selectedLeads.length > 0 && selectedLeads.every(l => l.status === 'Dropped');
  }, [selectedLeads]);

  const filteredLeads = useMemo(() => {
    const activeFilters = Object.keys(statusFilters).filter(status => statusFilters[status as LeadStatus]);
    if (activeFilters.length === 0 || Object.keys(statusFilters).length === 0) return [];
    if (activeFilters.length === availableStatuses.length) return leads;
    return leads.filter(lead => statusFilters[lead.status]);
  }, [leads, statusFilters, availableStatuses]);

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


  if (!isInitialized || loading || !user || Object.keys(statusFilters).length === 0) {
    return (
       <div className="flex h-[calc(100vh-theme(spacing.16))] w-full items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.displayName}!</p>
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
                  checked={statusFilters[status] ?? false}
                  onCheckedChange={(checked) => setStatusFilters(prev => ({...prev, [status]: !!checked}))}
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
           {user.role === 'Admin' || user.role === 'Director' ? (
              <Button variant="outline" onClick={() => setIsReengageDialogOpen(true)} disabled={!droppedLeadsSelected}>
                <Sparkles className="mr-2 h-4 w-4" />
                Re-engage
              </Button>
           ) : null}
          <Button variant="outline" onClick={handleExport} disabled={filteredLeads.length === 0}>
             <FileSpreadsheet className="mr-2 h-4 w-4" />
             Export
          </Button>
          {user.role !== 'Viewer' && user.role !== 'Structure' && (
            <Button onClick={handleAddLead}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </header>
      
      {user.role === 'Director' ? (
        <ForecastingDashboard leads={filteredLeads} />
      ) : (
        <>
          <StatCards leads={filteredLeads} />

          <div className="grid gap-8 md:grid-cols-5">
            <div className="md:col-span-3">
              <ClientLeadsChart leads={filteredLeads} />
            </div>
            <div className="md:col-span-2">
              <LeadsMap leads={filteredLeads} />
            </div>
          </div>
          
          <LeadsTable leads={filteredLeads} onEdit={handleEditLead} onSelectionChange={handleSelectionChange} />
        </>
      )}

      <LeadForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        lead={selectedLead}
        users={allUsers}
      />
      
      <ReengageDialog
        isOpen={isReengageDialogOpen}
        setIsOpen={setIsReengageDialogOpen}
        leads={selectedLeads}
       />

    </div>
  );
}
