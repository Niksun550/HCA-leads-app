"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Lead, AppUser, LeadStatus, LeadSource } from "@/types";
import { leadStatuses, leadSources } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, LoaderCircle, LocateFixed, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface LeadFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  lead: Lead | null;
  users: AppUser[];
}

const formSchema = z.object({
  customerName: z.string().min(2, { message: "Customer name is required" }),
  mobileNumber: z.string().min(10, { message: "Valid mobile number is required" }),
  address: z.string().min(5, { message: "Address is required" }),
  kwRequirement: z.coerce.number().positive({ message: "KW requirement must be positive" }),
  ownerId: z.string().min(1, { message: "Lead owner is required" }),
  leadBy: z.enum(leadSources, { required_error: "Lead source is required" }),
  status: z.enum(leadStatuses, { required_error: "Status is required" }),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).nullable(),
  visitDates: z.array(z.date()),
});

export default function LeadForm({ isOpen, setIsOpen, lead, users }: LeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      mobileNumber: "",
      address: "",
      kwRequirement: 0,
      ownerId: user?.uid,
      leadBy: 'Canopy',
      status: 'New',
      location: null,
      visitDates: [],
    },
  });

  useEffect(() => {
    if (lead) {
      form.reset({
        ...lead,
        kwRequirement: lead.kwRequirement || 0,
        visitDates: lead.visitDates ? lead.visitDates.map(ts => ts.toDate()) : [],
      });
    } else {
      form.reset({
        customerName: "",
        mobileNumber: "",
        address: "",
        kwRequirement: 0,
        ownerId: user?.uid,
        leadBy: 'Canopy',
        status: 'New',
        location: null,
        visitDates: [],
      });
    }
  }, [lead, user, form, isOpen]);

  const handleLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("location", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        toast({ title: "Location captured successfully." });
        setIsLocating(false);
      },
      (error) => {
        toast({ variant: "destructive", title: "Could not get location", description: error.message });
        setIsLocating(false);
      }
    );
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ variant: "destructive", title: "You must be logged in" });
      return;
    }
    setIsSubmitting(true);
    try {
      const owner = users.find(u => u.uid === values.ownerId) || user;
      const data = {
        ...values,
        ownerName: owner.displayName,
        visitDates: values.visitDates.map(d => Timestamp.fromDate(d)),
        createdAt: lead ? lead.createdAt : Timestamp.now(),
      };

      if (lead) {
        await setDoc(doc(db, "leads", lead.id), data, { merge: true });
        toast({ title: "Lead updated successfully!" });
      } else {
        await addDoc(collection(db, "leads"), data);
        toast({ title: "Lead added successfully!" });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          <DialogDescription>
            {lead ? "Update the details for this lead." : "Fill in the details for the new lead."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-1 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="customerName" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="mobileNumber" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField name="address" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl><Textarea {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
             <FormItem>
                <FormLabel>Live Location</FormLabel>
                 <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={handleLocation} disabled={isLocating}>
                        {isLocating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <LocateFixed className="mr-2 h-4 w-4" />}
                        Get Current Location
                    </Button>
                    {form.watch("location") && (
                        <p className="text-sm text-muted-foreground">
                        Lat: {form.getValues("location.latitude")?.toFixed(4)}, Lng: {form.getValues("location.longitude")?.toFixed(4)}
                        </p>
                    )}
                 </div>
              </FormItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="kwRequirement" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>KW Requirement</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="status" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{leadStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="leadBy" control={form.control} render={({ field }) => (
                    <FormItem>
                    <FormLabel>Lead Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{leadSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                {user?.role === 'Admin' && (
                    <FormField name="ownerId" control={form.control} render={({ field }) => (
                        <FormItem>
                        <FormLabel>Lead Owner</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{users.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                )}
            </div>
            <FormField name="visitDates" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Visit Dates</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value?.length && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Add visit dates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      onSelect={(date) => {
                        if (date && !field.value.some(d => d.getTime() === date.getTime())) {
                          field.onChange([...field.value, date]);
                        }
                      }}
                      disabled={(date) => field.value.some(d => d.getTime() === date.getTime())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((date, i) => (
                        <Badge key={i} className="flex items-center gap-1">
                            {format(date, 'PPP')}
                            <button type="button" onClick={() => field.onChange(field.value.filter((_, idx) => idx !== i))} className="rounded-full hover:bg-muted-foreground/20">
                                <X className="h-3 w-3"/>
                            </button>
                        </Badge>
                    ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {lead ? "Save Changes" : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
