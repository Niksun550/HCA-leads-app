
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, setDoc, Timestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Lead, AppUser, Remark, Attachment, Message } from "@/types";
import { leadStatuses, leadSources, meterTypes, propertyTypes, structureLeadStatuses } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { generateMarketingImage } from "@/ai/flows/generate-image-flow";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { buttonVariants } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, LoaderCircle, LocateFixed, X, Paperclip, Download, UploadCloud, File as FileIcon, MessageSquare, ListTodo, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LeadChat } from "./lead-chat";
import TaskForm from "@/components/tasks/task-form";

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
  meterType: z.enum(meterTypes, { required_error: "Meter type is required" }),
  propertyType: z.enum(propertyTypes, { required_error: "Property type is required" }),
  ownerId: z.string().min(1, { message: "Lead owner is required" }),
  leadBy: z.enum(leadSources, { required_error: "Lead source is required" }),
  status: z.enum(leadStatuses, { required_error: "Status is required" }),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).nullable(),
  visitDates: z.array(z.date()),
  newRemark: z.string().optional(),
  structureTeamMemberId: z.string().optional().nullable(),
});

export default function LeadForm({ isOpen, setIsOpen, lead, users }: LeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const leadIdRef = useRef<string>(lead?.id || uuidv4());
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      mobileNumber: "",
      address: "",
      kwRequirement: 0,
      meterType: '1 Phase',
      propertyType: 'Residential',
      ownerId: user?.uid,
      leadBy: 'Canopy',
      status: 'New',
      location: null,
      visitDates: [],
      newRemark: "",
      structureTeamMemberId: null,
    },
  });

  const status = form.watch("status");

  const structureTeamUsers = useMemo(() => {
    return users.filter(u => u.role === 'Structure');
  }, [users]);
  
  const isStructureForm = user?.role === 'Structure';
  
  const availableStatuses = useMemo(() => {
    if (isStructureForm) {
      return structureLeadStatuses;
    }
    return leadStatuses.filter(s => !structureLeadStatuses.includes(s) || s === 'Structure Pending');
  }, [isStructureForm]);
  
  const canGenerateImage = useMemo(() => {
    if (!user) return false;
    return ['Sales Rep', 'Admin', 'Director'].includes(user.role);
  }, [user]);

  useEffect(() => {
    if (lead) {
      leadIdRef.current = lead.id;
      form.reset({
        ...lead,
        kwRequirement: lead.kwRequirement || 0,
        meterType: lead.meterType || '1 Phase',
        propertyType: lead.propertyType || 'Residential',
        visitDates: lead.visitDates ? lead.visitDates.map(ts => ts.toDate()) : [],
        structureTeamMemberId: lead.structureTeamMemberId || null,
        newRemark: "",
      });
      setAttachments(lead.attachments || []);
    } else {
      leadIdRef.current = uuidv4();
      form.reset({
        customerName: "",
        mobileNumber: "",
        address: "",
        kwRequirement: 0,
        meterType: '1 Phase',
        propertyType: 'Residential',
        ownerId: user?.uid,
        leadBy: 'Canopy',
        status: 'New',
        location: null,
        visitDates: [],
        newRemark: "",
        structureTeamMemberId: null,
      });
      setAttachments([]);
    }
    setGeneratedImage(null);
  }, [lead, user, form, isOpen]);

  useEffect(() => {
    if (status !== 'Structure Pending' && !isStructureForm) {
      form.setValue('structureTeamMemberId', null);
    }
  }, [status, form, isStructureForm]);

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
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { storage } = getFirebaseServices();
    if (!storage) {
        toast({ variant: "destructive", title: "Storage Error", description: "Firebase Storage is not configured."});
        return;
    }

    setUploadProgress(0);
    const fileId = uuidv4();
    const filePath = `attachments/${leadIdRef.current}/${fileId}-${file.name}`;
    const fileRef = storageRef(storage, filePath);

    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            console.error("Upload failed", error);
            toast({ variant: "destructive", title: "Upload Failed", description: error.message });
            setUploadProgress(null);
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                const newAttachment: Attachment = {
                    name: file.name,
                    url: downloadURL,
                    type: file.type,
                    uploadedAt: Timestamp.now(),
                };
                setAttachments(prev => [...prev, newAttachment]);
                setUploadProgress(null);
                toast({ title: "File uploaded successfully!" });
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
            });
        }
    );
  };

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
      const owner = users.find(u => u.uid === values.ownerId) || user;
      const structureTeamMember = users.find(u => u.uid === values.structureTeamMemberId);

      const remarks = lead?.remarks ? [...lead.remarks] : [];
      if (values.newRemark) {
        const newRemark: Remark = {
          text: values.newRemark,
          createdAt: Timestamp.now(),
          authorName: user.displayName || 'Unknown User',
          authorId: user.uid,
        };
        remarks.push(newRemark);
      }
      
      const leadId = leadIdRef.current;

      const data: Omit<Lead, 'id'> & { id?: string } = {
        customerName: values.customerName,
        mobileNumber: values.mobileNumber,
        address: values.address,
        kwRequirement: values.kwRequirement,
        meterType: values.meterType,
        propertyType: values.propertyType,
        ownerId: values.ownerId,
        ownerName: owner.displayName || '',
        leadBy: values.leadBy,
        status: values.status,
        location: values.location,
        visitDates: values.visitDates.map(d => Timestamp.fromDate(d)),
        createdAt: lead ? lead.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
        remarks: remarks,
        attachments: attachments,
        messages: lead?.messages || [],
        closedAt: lead?.closedAt || null,
        structureTeamMemberId: values.structureTeamMemberId || null,
        structureTeamMemberName: structureTeamMember?.displayName || null,
      };

      if (values.status === 'Quotation Send') {
        data.structureTeamMemberId = null;
        data.structureTeamMemberName = null;
      }

      if (values.status === 'Closed' && lead?.status !== 'Closed') {
        data.closedAt = Timestamp.now();
      } else if (values.status !== 'Closed') {
        data.closedAt = null;
      }
      
      const docRef = doc(db, "leads", leadId);

      if (lead) {
        await setDoc(docRef, data, { merge: true });
        toast({ title: "Lead updated successfully!" });
      } else {
        data.id = leadId;
        await setDoc(docRef, data);
        toast({ title: "Lead added successfully!" });
      }
      setIsOpen(false);
    } catch (error: any)
{
      toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
     if (!user || !lead) {
      toast({ variant: "destructive", title: "Cannot send message" });
      return;
    }
    const { db } = getFirebaseServices();
    if (!db) {
      toast({ variant: "destructive", title: "Submission Failed", description: "Firebase is not configured." });
      return;
    }

    setIsSubmitting(true);
    try {
        const newMessage: Message = {
            id: uuidv4(),
            text,
            authorId: user.uid,
            createdAt: Timestamp.now(),
        };

        const leadRef = doc(db, "leads", lead.id);
        await updateDoc(leadRef, {
            messages: arrayUnion(newMessage),
            updatedAt: Timestamp.now(),
        });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Message Failed", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleGenerateImage = async () => {
    const propertyType = form.getValues("propertyType");
    if (!propertyType) {
        toast({ variant: 'destructive', title: 'Cannot generate image', description: 'Please select a property type first.'});
        return;
    }
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    try {
        const result = await generateMarketingImage({ propertyType: propertyType });
        if (result.imageUrl) {
            setGeneratedImage(result.imageUrl);
            toast({ title: "Image generated successfully!" });
        } else {
            throw new Error("The AI didn't return an image.");
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Image Generation Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setIsGeneratingImage(false);
    }
  };
  
  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] flex flex-col p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0 flex flex-row items-start justify-between shrink-0">
            <div>
                <DialogTitle className="font-headline">{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
                <DialogDescription>
                    {lead ? "Update the details for this lead." : "Fill in the details for the new lead."}
                </DialogDescription>
            </div>
            {lead && (
                <Button variant="outline" size="sm" onClick={() => setIsTaskFormOpen(true)}>
                    <ListTodo className="mr-2" />
                    Create Task
                </Button>
            )}
        </DialogHeader>
        <div className="grid md:grid-cols-2 overflow-y-auto flex-1">
            <div className="overflow-y-auto px-6 pb-6">
                <Tabs defaultValue="details">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="attachments">Attachments</TabsTrigger>
                        <TabsTrigger value="marketing" disabled={!canGenerateImage}>Marketing</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} id="lead-form" className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="customerName" control={form.control} render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Customer Name</FormLabel>
                                    <FormControl><Input {...field} disabled={isStructureForm} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="mobileNumber" control={form.control} render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Mobile Number</FormLabel>
                                    <FormControl><Input {...field} disabled={isStructureForm} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                                </div>
                                <FormField name="address" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl><Textarea {...field} disabled={isStructureForm} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                                <FormItem>
                                    <FormLabel>Live Location</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" onClick={handleLocation} disabled={isLocating || isStructureForm}>
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField name="kwRequirement" control={form.control} render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>KW Requirement</FormLabel>
                                        <FormControl><Input type="number" {...field} disabled={isStructureForm} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField name="meterType" control={form.control} render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Meter</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isStructureForm}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{meterTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField name="propertyType" control={form.control} render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isStructureForm}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{propertyTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="status" control={form.control} render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{availableStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="leadBy" control={form.control} render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Lead Source</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isStructureForm}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{leadSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                {user?.role === 'Admin' && (
                                    <FormField name="ownerId" control={form.control} render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Lead Owner</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isStructureForm}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{users.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                                
                                {status === 'Structure Pending' && !isStructureForm && (
                                <FormField name="structureTeamMemberId" control={form.control} render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Assign to Structure Team</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a team member" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                        {structureTeamUsers.length > 0 ? (
                                            structureTeamUsers.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)
                                        ) : (
                                            <SelectItem value="-" disabled>No structure team members found</SelectItem>
                                        )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                                )}

                                <FormField name="visitDates" control={form.control} render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Visit Dates</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            "justify-start text-left font-normal",
                                            !field.value?.length && "text-muted-foreground"
                                        )}
                                        >
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
                                                <button type="button" disabled={isStructureForm} onClick={() => field.onChange(field.value.filter((_, idx) => idx !== i))} className="rounded-full hover:bg-muted-foreground/20">
                                                    <X className="h-3 w-3"/>
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )} />

                                <FormField name="newRemark" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remark</FormLabel>
                                    <FormControl><Textarea placeholder="Add a new remark about status changes or other updates..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                            </form>
                        </Form>
                    </TabsContent>
                     <TabsContent value="attachments">
                         <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2">
                                <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="file-upload" disabled={uploadProgress !== null}/>
                                <Button asChild type="button" variant="outline" disabled={uploadProgress !== null}>
                                <label htmlFor="file-upload" className="cursor-pointer flex items-center">
                                    <UploadCloud className="mr-2" /> Upload File
                                </label>
                                </Button>
                            </div>
                            {uploadProgress !== null && <Progress value={uploadProgress} className="w-full" />}

                            {attachments.length > 0 && (
                            <div className="space-y-2 rounded-md border p-2">
                                {attachments.map((att, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 p-1 rounded-md hover:bg-muted">
                                    <div className="flex items-center gap-2 truncate">
                                    <FileIcon className="h-4 w-4 flex-shrink-0"/>
                                    <span className="truncate text-sm">{att.name}</span>
                                    </div>
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-7 w-7")}>
                                    <Download className="h-4 w-4" />
                                    </a>
                                </div>
                                ))}
                            </div>
                            )}
                         </div>
                    </TabsContent>
                    <TabsContent value="marketing">
                        <div className="space-y-4 pt-4">
                             <div className="p-4 border-dashed border-2 rounded-lg text-center">
                                <p className="font-semibold">AI Marketing Image Generator</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Create a unique, beautiful image to share with your customer.
                                </p>
                                <Button
                                    type="button"
                                    onClick={handleGenerateImage}
                                    disabled={isGeneratingImage}
                                    className="mt-4"
                                >
                                    {isGeneratingImage ? (
                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Wand2 className="mr-2 h-4 w-4" />
                                    )}
                                    Generate Image
                                </Button>
                            </div>

                            {isGeneratingImage && (
                                <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-lg">
                                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                                    <p className="mt-2 text-sm text-muted-foreground">Generating... this may take a moment.</p>
                                </div>
                            )}

                            {generatedImage && (
                                <div className="space-y-2">
                                    <p className="font-medium text-sm">Generated Image:</p>
                                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                                        <Image
                                            src={generatedImage}
                                            alt="AI-generated marketing image"
                                            layout="fill"
                                            objectFit="cover"
                                        />
                                    </div>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                    >
                                        <a href={generatedImage} download={`solar-concept-${form.getValues('customerName').replace(/\s+/g, '-')}.png`}>
                                            <Download className="mr-2" /> Download Image
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                <div className="p-6 pt-0 mt-4 flex justify-end gap-2 sticky bottom-0 bg-background">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" form="lead-form" disabled={isSubmitting || uploadProgress !== null}>
                        {(isSubmitting || uploadProgress !== null) && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        {lead ? "Save Changes" : "Create Lead"}
                    </Button>
                </div>
            </div>
            <div className="md:border-l h-full">
                {lead ? (
                    <LeadChat 
                        messages={lead.messages || []}
                        onSendMessage={handleSendMessage}
                        users={users}
                        isSubmitting={isSubmitting}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/50">
                        <MessageSquare className="h-16 w-16 mb-4" />
                        <p className="font-semibold">Conversation</p>
                        <p className="text-sm text-center px-4">Save the lead to start the conversation.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
    {lead && (
        <TaskForm 
            isOpen={isTaskFormOpen}
            setIsOpen={setIsTaskFormOpen}
            task={null}
            users={users}
            leads={[lead]}
            defaultLeadId={lead.id}
        />
    )}
    </>
  );
}

    