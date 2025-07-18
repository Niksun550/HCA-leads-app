
"use client";

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
import { MoreHorizontal, Trash2, Edit, MapPin } from "lucide-react";
import type { Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

interface LeadsTableProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
}

export function LeadsTable({ leads, onEdit }: LeadsTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDelete = async (leadId: string) => {
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

  const getStatusVariant = (status: Lead['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'New':
      case 'Proposal Sent':
      case 'Closed':
        return 'default';
      case 'Contacted':
        return 'secondary';
      case 'Visited':
      case 'Structure Pending':
        return 'outline';
      case 'Dropped':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="rounded-lg border shadow-sm bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">KW Req.</TableHead>
            <TableHead className="hidden lg:table-cell">Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length > 0 ? (
            leads.map((lead) => {
              const latestRemark = (lead.remarks && lead.remarks.length > 0)
                ? lead.remarks.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0]
                : null;
              
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium">{lead.customerName}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {latestRemark?.text || lead.mobileNumber}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{lead.ownerName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(lead.status)}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{lead.kwRequirement} KW</TableCell>
                  <TableCell className="hidden lg:table-cell">{lead.propertyType}</TableCell>
                  <TableCell className="text-right">
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
                            </DialogDescription>
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
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No leads found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
