
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Lead } from "@/types";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { LoaderCircle, Wand2, Clipboard, ClipboardCheck, Users, Upload, FileText, Bot, Type, Image as ImageIcon, MessageSquare, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import Image from 'next/image';

import { generateWelcomeMessage, WelcomeMessageInput } from "@/ai/flows/welcome-flow";

interface CampaignLead {
    id: string;
    customerName: string;
    mobileNumber?: string;
}

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
)


export default function ToolsPage() {
    const { user, isInitialized } = useAuth();
    const { toast } = useToast();
    const [dbLeads, setDbLeads] = useState<Lead[]>([]);
    const [uploadedLeads, setUploadedLeads] = useState<CampaignLead[]>([]);
    const [selectedLeads, setSelectedLeads] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [message, setMessage] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [senderNumber, setSenderNumber] = useState("");
    const [copied, setCopied] = useState(false);


    useEffect(() => {
        if (!isInitialized || !user) {
            if (isInitialized) setLoading(false);
            return;
        }

        const { db } = getFirebaseServices();
        if (!db) {
            setLoading(false);
            return;
        }

        const leadsQuery = query(collection(db, 'leads'), where('status', '==', 'New'));
        const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
            const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
            setDbLeads(leadsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching new leads:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, isInitialized]);

    const handleSelectLead = (leadId: string, checked: boolean) => {
        setSelectedLeads(prev => ({ ...prev, [leadId]: checked }));
    };

    const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    toast({ variant: 'destructive', title: 'Empty File', description: 'The uploaded file appears to be empty.' });
                    return;
                }
                const header = Object.keys(json[0]);
                const nameKey = header.find(h => h.toLowerCase().includes('name')) || header[0];
                const mobileKey = header.find(h => h.toLowerCase().includes('mobile') || h.toLowerCase().includes('phone'));

                if (!nameKey) {
                    toast({ variant: 'destructive', title: 'Invalid Format', description: 'Could not find a suitable column for customer names.' });
                    return;
                }

                const newLeads = json.map((row, index) => ({
                    id: `file-${index}-${row[nameKey]}`,
                    customerName: String(row[nameKey]),
                    mobileNumber: mobileKey ? String(row[mobileKey]).replace(/\D/g, '') : undefined,
                }));
                
                setUploadedLeads(newLeads);
                toast({ title: 'File Processed', description: `${newLeads.length} contacts were imported.` });
            } catch (error) {
                console.error("Error parsing file:", error);
                toast({ variant: 'destructive', title: 'Parsing Error', description: 'Could not read the uploaded file. Please ensure it is a valid Excel file.' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const allLeadsForCampaign: CampaignLead[] = useMemo(() => [
        ...dbLeads.map(l => ({ id: l.id, customerName: l.customerName, mobileNumber: l.mobileNumber })),
        ...uploadedLeads
    ], [dbLeads, uploadedLeads]);

    const selectedLeadIds = Object.keys(selectedLeads).filter(id => selectedLeads[id]);
    
    const leadsToProcess = useMemo(() => {
        return allLeadsForCampaign.filter(lead => selectedLeadIds.includes(lead.id));
    }, [allLeadsForCampaign, selectedLeadIds]);

    const handleGenerateAIWelcome = async () => {
        setIsGenerating(true);
        try {
            const result = await generateWelcomeMessage({ customerName: "{{customerName}}" }); 
            setMessage(result.welcomeMessage);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleBulkWhatsApp = useCallback(() => {
        if (leadsToProcess.length === 0) {
            toast({ variant: 'destructive', title: 'No customers selected', description: 'Please select at least one customer to target.' });
            return;
        }
        if (!message) {
            toast({ variant: 'destructive', title: 'No message', description: 'Please write a message to send.' });
            return;
        }

        leadsToProcess.forEach(lead => {
            if (!lead.mobileNumber) {
                toast({
                    variant: 'destructive',
                    title: 'Missing Number',
                    description: `Cannot send to ${lead.customerName} as no mobile number is available.`,
                });
                return;
            }

            let personalizedMessage = message.replace(/{{customerName}}/gi, lead.customerName);
            
            if (senderNumber) {
                const replyLink = `https://wa.me/${senderNumber}`;
                personalizedMessage += `\n\nFor more details, click here to reply: ${replyLink}`;
            }
            
            const url = `https://wa.me/${lead.mobileNumber}?text=${encodeURIComponent(personalizedMessage)}`;
            window.open(url, '_blank');
        });
    }, [leadsToProcess, message, senderNumber, toast]);

    
    const LeadCheckboxList = ({ leads }: { leads: CampaignLead[] }) => (
        <div className="space-y-2">
            {leads.map(lead => (
                <div key={lead.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                    <Checkbox
                        id={lead.id}
                        checked={selectedLeads[lead.id] || false}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                    />
                    <div className="flex-1">
                        <Label htmlFor={lead.id} className="font-normal cursor-pointer flex-1">{lead.customerName}</Label>
                        {lead.mobileNumber && <p className="text-xs text-muted-foreground">({lead.mobileNumber})</p>}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="py-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Tools</h1>
                <p className="text-muted-foreground">Advanced features to boost your productivity.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Marketing Campaign Builder</CardTitle>
                    <CardDescription>Engage customers with personalized campaigns using text and images.</CardDescription>
                </CardHeader>
                <CardContent className="grid lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2 text-lg">1. Select Customers</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                Choose from your new leads or upload a list. Total selected: <span className="font-bold text-primary">{selectedLeadIds.length}</span>
                            </p>
                            <Tabs defaultValue="database">
                                 <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="database">From Database</TabsTrigger>
                                    <TabsTrigger value="file">From File</TabsTrigger>
                                </TabsList>
                                <TabsContent value="database">
                                    <ScrollArea className="h-60 rounded-md border p-4 mt-2">
                                        {loading ? (
                                            <div className="space-y-4">
                                                <Skeleton className="h-6 w-3/4" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-1/2" />
                                            </div>
                                        ) : dbLeads.length > 0 ? (
                                            <LeadCheckboxList leads={dbLeads.map(l => ({id: l.id, customerName: l.customerName, mobileNumber: l.mobileNumber}))} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                                <Users className="h-12 w-12 mb-2" /><p>No new leads found in the database.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                                 <TabsContent value="file">
                                     <div className="rounded-md border p-4 mt-2 space-y-2">
                                        <Label htmlFor="file-upload">Upload Excel File</Label>
                                        <Input id="file-upload" type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                                        <p className="text-xs text-muted-foreground">File must have a header with 'name' and 'mobile'/'phone' columns.</p>
                                    </div>
                                    <ScrollArea className="h-48 mt-2">
                                         {uploadedLeads.length > 0 ? (
                                            <LeadCheckboxList leads={uploadedLeads} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-4">
                                                <FileText className="h-12 w-12 mb-2" /><p>Uploaded contacts will appear here.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                    <div className="space-y-6">
                         <div>
                            <h3 className="font-semibold mb-2 text-lg">2. Compose Your Message</h3>
                             <div className="space-y-2">
                               <div className="flex items-center justify-between">
                                 <Label htmlFor="campaign-message">Message Content</Label>
                                  <Button variant="ghost" size="sm" onClick={handleGenerateAIWelcome} disabled={isGenerating}>
                                      {isGenerating ? <LoaderCircle className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                                      AI Generate
                                  </Button>
                               </div>
                                <Textarea
                                    id="campaign-message"
                                    placeholder="Write your message here... Use {{customerName}} for personalization."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="min-h-[120px]"
                                />
                                <p className="text-xs text-muted-foreground">The placeholder `{"{{customerName}}"}` will be replaced with each customer's name.</p>

                                <div className="space-y-2 pt-2">
                                    <Label htmlFor="image-upload-main">Attach Image/Flyer (Optional)</Label>
                                    <Input id="image-upload-main" type="file" accept="image/*" onChange={handleImageUpload} />
                                </div>
                                
                                <div className="space-y-2 pt-2">
                                    <Label htmlFor="sender-number">Your WhatsApp Number (For Replies)</Label>
                                    <Input 
                                        id="sender-number"
                                        type="tel"
                                        placeholder="e.g., 919876543210"
                                        value={senderNumber}
                                        onChange={(e) => setSenderNumber(e.target.value.replace(/\D/g, ''))}
                                    />
                                    <p className="text-xs text-muted-foreground">Include country code without '+' or '00'.</p>
                                </div>
                             </div>
                        </div>
                        <div>
                             <h3 className="font-semibold mb-2 text-lg">3. Send Campaign</h3>
                             <div className="p-4 border-dashed border-2 rounded-lg text-center space-y-4">
                                <div>
                                    <p className="font-medium">Ready to Launch?</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        This will open WhatsApp on your device for each selected customer.
                                    </p>
                                </div>
                                
                                {image && (
                                     <div className="w-24 h-24 mx-auto relative rounded-md border overflow-hidden">
                                         <Image src={image} alt="Uploaded preview" layout="fill" objectFit="cover" />
                                     </div>
                                )}
                                
                                <Button onClick={handleBulkWhatsApp} disabled={selectedLeadIds.length === 0 || !message}>
                                    <WhatsAppIcon /> Send to {selectedLeadIds.length} customer(s)
                                </Button>
                                {image && (
                                     <Alert variant="default" className="mt-4 text-left">
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Manual Step Required</AlertTitle>
                                        <AlertDescription>
                                            The text will be pre-filled. You must attach the image manually in each WhatsApp chat that opens.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    