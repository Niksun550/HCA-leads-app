
"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Task, AppUser, Lead } from "@/types";
import { taskStatuses, taskPriorities } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { CalendarIcon, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  task: Task | null;
  users: AppUser[];
  leads: Lead[];
  defaultLeadId?: string;
}

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  dueDate: z.date({ required_error: "A due date is required." }),
  assigneeId: z.string().min(1, "Assignee is required."),
  leadId: z.string().nullable().optional(),
});

export default function TaskForm({ isOpen, setIsOpen, task, users, leads, defaultLeadId }: TaskFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "To Do",
      priority: "Medium",
      assigneeId: user?.uid,
      leadId: defaultLeadId || null,
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        ...task,
        dueDate: task.dueDate.toDate(),
      });
    } else {
      form.reset({
        title: "",
        description: "",
        status: "To Do",
        priority: "Medium",
        assigneeId: user?.uid || "",
        dueDate: new Date(),
        leadId: defaultLeadId || null,
      });
    }
  }, [task, user, form, isOpen, defaultLeadId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ variant: "destructive", title: "You must be logged in" });
      return;
    }
    const { db } = getFirebaseServices();
    if (!db) {
      toast({ variant: "destructive", title: "Submission Failed", description: "Firebase is not configured." });
      return;
    }

    setIsSubmitting(true);
    try {
      const assignee = users.find(u => u.uid === values.assigneeId);
      const selectedLead = leads.find(l => l.id === values.leadId);

      const data = {
        title: values.title,
        description: values.description || "",
        status: values.status,
        priority: values.priority,
        dueDate: Timestamp.fromDate(values.dueDate),
        assigneeId: values.assigneeId,
        assigneeName: assignee?.displayName || "Unknown",
        leadId: values.leadId || null,
        leadCustomerName: selectedLead?.customerName || null,
        updatedAt: Timestamp.now(),
      };

      if (task) {
        await setDoc(doc(db, "tasks", task.id), data, { merge: true });
        toast({ title: "Task updated successfully!" });
      } else {
        const newTaskRef = doc(collection(db, "tasks"));
        await setDoc(newTaskRef, {
          ...data,
          id: newTaskRef.id,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
        });
        toast({ title: "Task added successfully!" });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">{task ? "Edit Task" : "Add New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the details for this task." : "Fill in the details for the new task."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="task-form" className="space-y-4 pt-4">
                <FormField name="title" control={form.control} render={({ field }) => (
                    <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                 <FormField name="description" control={form.control} render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Add more details about the task..." /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                    <FormField name="status" control={form.control} render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="priority" control={form.control} render={({ field }) => (
                        <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{taskPriorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField name="dueDate" control={form.control} render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="assigneeId" control={form.control} render={({ field }) => (
                        <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select an assignee" /></SelectTrigger></FormControl>
                            <SelectContent>{users.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                 </div>
                 <FormField name="leadId" control={form.control} render={({ field }) => (
                    <FormItem>
                    <FormLabel>Related Lead (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.customerName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />

            </form>
        </Form>
        <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" form="task-form" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {task ? "Save Changes" : "Create Task"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
