
"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Trash2, Edit, MapPin, Flame, Snowflake, PauseCircle } from "lucide-react";
import type { Lead, LeadLabel } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { doc, deleteDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
)

const labelIcons: Record<LeadLabel, React.ReactNode> = {
  Hot: <Flame className="h-4 w-4 text-red-500" />,
  Cold: <Snowflake className="h-4 w-4 text-blue-500" />,
  Hold: <PauseCircle className="h-4 w-4 text-gray-500" />,
  None: null
};

interface LeadsTableProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
}

export function LeadsTable({ leads, onEdit }: LeadsTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async (leadId: string) => {
    const { db } = getFirebaseServices();
    if (!db) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured.' });
        return;
    }

    try {
      await deleteDoc(doc(db, "leads", leadId));
      toast({
        title: "Lead Deleted",
        description: "The lead has been successfully deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the lead.",
      });
    }
  };

  const handleViewOnMap = (address: string) => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(googleMapsUrl, '_blank');
  };
  
  const handleSendWhatsApp = (leadId: string) => {
    router.push(`/tools?leadId=${leadId}`);
  };

  return (
    <div className="rounded-lg border shadow-sm bg-card">
      <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Assigned To</TableHead>
            <TableHead className="hidden lg:table-cell">Lead Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">KW Req.</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length > 0 ? (
            leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                     {lead.label && lead.label !== 'None' && (
                       <Tooltip>
                          <TooltipTrigger>
                            {labelIcons[lead.label]}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{lead.label} Lead</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    <div>
                      <div className="font-medium">{lead.customerName}</div>
                      <div className="text-sm text-muted-foreground">{lead.mobileNumber}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {lead.structureTeamMemberName ? (
                    <div>
                      <span className="font-medium">{lead.structureTeamMemberName}</span>
                      <Badge variant="outline" className="ml-1">Structure</Badge>
                    </div>
                  ) : (
                    <span className="font-medium">{lead.ownerName}</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">{lead.ownerName}</TableCell>
                <TableCell>
                  <Badge variant={lead.status === 'Dropped' ? 'destructive' : 'secondary'}>{lead.status}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{lead.kwRequirement} KW</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSendWhatsApp(lead.id)}>
                        <WhatsAppIcon />
                        <span className="sr-only">Send WhatsApp</span>
                     </Button>
                      {user?.role !== 'Viewer' && (
                         <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit(lead)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleViewOnMap(lead.address)}>
                                <MapPin className="mr-2 h-4 w-4" /> View on Map
                              </DropdownMenuItem>
                              {user?.role === 'Admin' && (
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this lead
                                and remove its data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(lead.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No leads found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </TooltipProvider>
    </div>
  );
}
