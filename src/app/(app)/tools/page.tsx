
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, onSnapshot, query, Query } from 'firebase/firestore';
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Lead, LeadStatus, PropertyType } from "@/types";
import { leadStatuses, propertyTypes } from "@/types";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { LoaderCircle, Wand2, Clipboard, ClipboardCheck, Users, Upload, FileText, Bot, Type, Image as ImageIcon, MessageSquare, Info, RefreshCw, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from 'next/image';

import { generateWelcomeMessage, WelcomeMessageInput } from "@/ai/flows/welcome-flow";
import { reengageLead } from "@/ai/flows/reengage-flow";
import { generateMarketingImage } from "@/ai/flows/generate-image-flow";


interface CampaignLead {
    id: string;
    customerName: string;
    mobileNumber?: string;
    propertyType: PropertyType;
    status: LeadStatus;
}

interface GeneratedTextContent {
    customerId: string;
    customerName: string;
    text: string;
}

interface GeneratedImageContent {
    customerId: string;
    customerName: string;
    imageUrl: string;
}

type CampaignType = "ai_message" | "ai_image" | "custom_message";
type MainTabs = "marketing" | "reengage";

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
)

const LeadCheckboxList = ({ leads, selectedLeads, onSelectLead }: { leads: CampaignLead[], selectedLeads: Record<string, boolean>, onSelectLead: (id: string, checked: boolean) => void }) => (
    <div className="space-y-2">
        {leads.map(lead => (
            <div key={lead.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                <Checkbox
                    id={lead.id}
                    checked={selectedLeads[lead.id] || false}
                    onCheckedChange={(checked) => onSelectLead(lead.id, !!checked)}
                />
                <div className="flex-1">
                    <Label htmlFor={lead.id} className="font-normal cursor-pointer flex-1">{lead.customerName}</Label>
                    {lead.mobileNumber && <p className="text-xs text-muted-foreground">({lead.mobileNumber})</p>}
                </div>
            </div>
        ))}
    </div>
);


export default function ToolsPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();
    const [allDbLeads, setAllDbLeads] = useState<CampaignLead[]>([]);
    const [uploadedLeads, setUploadedLeads] = useState<CampaignLead[]>([]);
    const [selectedLeads, setSelectedLeads] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<MainTabs>("marketing");
    
    // Marketing Campaign State
    const [message, setMessage] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [senderNumber, setSenderNumber] = useState("");
    const [isMessageCopied, setIsMessageCopied] = useState(false);
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("New");
    
    // Re-engage State
    const [selectedDroppedLeads, setSelectedDroppedLeads] = useState<Record<string, boolean>>({});
    const [isReEngaging, setIsReEngaging] = useState(false);
    const [generatedText, setGeneratedText] = useState<GeneratedTextContent[] | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImageContent[] | null>(null);
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const [campaignType, setCampaignType] = useState<CampaignType>("ai_message");
    const [customMessage, setCustomMessage] = useState("");


    // Fetch all leads once on component mount
    useEffect(() => {
        if (isAuthLoading || !user) {
            if (!isAuthLoading) setLoading(false);
            return;
        }

        setLoading(true);
        const { db } = getFirebaseServices();
        if (!db) {
            setLoading(false);
            return;
        }

        const leadsQuery = query(collection(db, 'leads'));
        
        const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
            const leadsData = snapshot.docs.map(doc => {
                const data = doc.data() as Lead;
                return { 
                    id: doc.id, 
                    customerName: data.customerName, 
                    mobileNumber: data.mobileNumber, 
                    propertyType: data.propertyType,
                    status: data.status,
                };
            });
            setAllDbLeads(leadsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching all leads:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, isAuthLoading]);

    
    const marketingDbLeads = useMemo(() => {
        if (activeTab !== 'marketing') return [];
        if (statusFilter === 'All') return allDbLeads;
        return allDbLeads.filter(lead => lead.status === statusFilter);
    }, [allDbLeads, statusFilter, activeTab]);
    
    const droppedLeads = useMemo(() => {
        if (activeTab !== 'reengage') return [];
        return allDbLeads.filter(lead => lead.status === 'Dropped');
    }, [allDbLeads, activeTab]);
    
    
    const handleSelectLead = (leadId: string, checked: boolean) => {
        setSelectedLeads(prev => ({ ...prev, [leadId]: checked }));
    };
    
    const handleSelectDroppedLead = (leadId: string, checked: boolean) => {
        setSelectedDroppedLeads(prev => ({ ...prev, [leadId]: checked }));
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
                const propertyTypeKey = header.find(h => h.toLowerCase().includes('property'));

                if (!nameKey) {
                    toast({ variant: 'destructive', title: 'Invalid Format', description: 'Could not find a suitable column for customer names.' });
                    return;
                }

                const newLeads = json.map((row, index) => ({
                    id: `file-${index}-${row[nameKey]}`,
                    customerName: String(row[nameKey]),
                    mobileNumber: mobileKey ? String(row[mobileKey]).replace(/\D/g, '') : undefined,
                    propertyType: (propertyTypeKey && propertyTypes.includes(row[propertyTypeKey])) ? row[propertyTypeKey] : 'Residential',
                    status: 'New' // Assign a default status for uploaded leads
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
    
    // --- Marketing Campaign Logic ---
    const selectedCampaignLeadIds = Object.keys(selectedLeads).filter(id => selectedLeads[id]);
    const campaignLeadsToProcess = useMemo(() => {
        const allLeads = [...marketingDbLeads, ...uploadedLeads];
        return allLeads.filter(lead => selectedCampaignLeadIds.includes(lead.id));
    }, [marketingDbLeads, uploadedLeads, selectedCampaignLeadIds]);

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
    
    const handleCampaignSend = useCallback(() => {
        if (campaignLeadsToProcess.length === 0) {
            toast({ variant: 'destructive', title: 'No customers selected', description: 'Please select at least one customer to target.' });
            return;
        }
        if (!message) {
            toast({ variant: 'destructive', title: 'No message', description: 'Please write a message to send.' });
            return;
        }

        let personalizedMessage = message;
        if (senderNumber) {
            const replyLink = `https://wa.me/${senderNumber}`;
            personalizedMessage += `\n\nFor more details, click here to reply: ${replyLink}`;
        }

        navigator.clipboard.writeText(personalizedMessage);
        setIsMessageCopied(true);
        setTimeout(() => setIsMessageCopied(false), 2000);

        campaignLeadsToProcess.forEach(lead => {
            if (!lead.mobileNumber) {
                toast({
                    variant: 'destructive',
                    title: 'Missing Number',
                    description: `Cannot send to ${lead.customerName} as no mobile number is available.`,
                });
                return;
            }
            
            const dynamicMessage = personalizedMessage.replace(/{{customerName}}/gi, lead.customerName);
            const url = `https://wa.me/${lead.mobileNumber}?text=${encodeURIComponent(dynamicMessage)}`;
            window.open(url, '_blank');
        });
    }, [campaignLeadsToProcess, message, senderNumber, toast]);

    
    // --- Re-engage Logic ---
    const selectedDroppedLeadIds = Object.keys(selectedDroppedLeads).filter(id => selectedDroppedLeads[id]);
    const reengageLeadsToProcess = useMemo(() => {
        return droppedLeads.filter(lead => selectedDroppedLeadIds.includes(lead.id));
    }, [droppedLeads, selectedDroppedLeadIds]);
    
    const handleReengageGenerate = async () => {
        if (reengageLeadsToProcess.length === 0) {
            toast({ variant: 'destructive', title: 'No leads selected', description: 'Please select at least one dropped lead.' });
            return;
        }
        
        setIsReEngaging(true);
        setGeneratedText(null);
        setGeneratedImages(null);
        
        try {
            if (campaignType === 'ai_message') {
                const promises = reengageLeadsToProcess.map(lead => 
                    reengageLead({ customerName: lead.customerName, propertyType: lead.propertyType })
                );
                const results = await Promise.all(promises);
                const content = results.map((result, index) => ({
                    customerId: reengageLeadsToProcess[index].id,
                    customerName: reengageLeadsToProcess[index].customerName,
                    text: result.reengagementMessage,
                }));
                setGeneratedText(content);
            } else if (campaignType === 'ai_image') {
                const promises = reengageLeadsToProcess.map(lead => 
                    generateMarketingImage({ propertyType: lead.propertyType })
                );
                const results = await Promise.all(promises);
                 const images = results.map((result, index) => ({
                    customerId: reengageLeadsToProcess[index].id,
                    customerName: reengageLeadsToProcess[index].customerName,
                    imageUrl: result.imageUrl,
                }));
                setGeneratedImages(images);
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsReEngaging(false);
        }
    };

    const handleCopy = (text: string, customerId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [customerId]: true }));
        setTimeout(() => {
            setCopiedStates(prev => ({ ...prev, [customerId]: false }));
        }, 2000);
    };

    const resetReengageState = () => {
        setGeneratedText(null);
        setGeneratedImages(null);
        setIsReEngaging(false);
        setCopiedStates({});
        setCustomMessage("");
    }


    return (
        <div className="py-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Tools</h1>
                <p className="text-muted-foreground">Advanced features to boost your productivity.</p>
            </header>

            <Tabs defaultValue="marketing" onValueChange={(value) => setActiveTab(value as MainTabs)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="marketing">Marketing Campaigns</TabsTrigger>
                    <TabsTrigger value="reengage">Re-engage Leads</TabsTrigger>
                </TabsList>
                
                <TabsContent value="marketing">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Marketing Campaign Builder</CardTitle>
                            <CardDescription>Engage customers with personalized campaigns using text and images.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid lg:grid-cols-2 gap-12">
                             <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold mb-2 text-lg">1. Select Customers</h3>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Choose from your leads or upload a list. Total selected: <span className="font-bold text-primary">{selectedCampaignLeadIds.length}</span>
                                    </p>
                                    <Tabs defaultValue="database">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="database">From Database</TabsTrigger>
                                            <TabsTrigger value="file">From File</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="database" className="space-y-4">
                                            <div className="pt-2">
                                                <Label htmlFor="status-filter">Filter by Status</Label>
                                                <Select value={statusFilter} onValueChange={(value: LeadStatus | "All") => setStatusFilter(value)}>
                                                    <SelectTrigger id="status-filter">
                                                        <SelectValue placeholder="Select status..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="All">All Statuses</SelectItem>
                                                        {leadStatuses.map(status => (
                                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <ScrollArea className="h-60 rounded-md border p-4 mt-2">
                                                {loading ? (
                                                    <div className="space-y-4">
                                                        <Skeleton className="h-6 w-3/4" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-1/2" />
                                                    </div>
                                                ) : marketingDbLeads.length > 0 ? (
                                                    <LeadCheckboxList leads={marketingDbLeads} selectedLeads={selectedLeads} onSelectLead={handleSelectLead} />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                                        <Users className="h-12 w-12 mb-2" /><p>No leads found for this status.</p>
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
                                                    <LeadCheckboxList leads={uploadedLeads} selectedLeads={selectedLeads} onSelectLead={handleSelectLead} />
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
                                            AI Suggest
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
                                        
                                        {image && (
                                            <div className="w-24 h-24 mx-auto relative rounded-md border overflow-hidden">
                                                <Image src={image} alt="Uploaded preview" layout="fill" objectFit="cover" />
                                            </div>
                                        )}
                                        <div className="flex flex-col items-center gap-2">
                                            <Button onClick={handleCampaignSend} disabled={selectedCampaignLeadIds.length === 0 || !message}>
                                                <WhatsAppIcon /> Send to {selectedCampaignLeadIds.length} customer(s)
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => navigator.clipboard.writeText(message)}
                                                disabled={!message}
                                            >
                                                {isMessageCopied ? <ClipboardCheck className="text-green-500" /> : <Clipboard />}
                                                Copy Message
                                            </Button>
                                        </div>
                                        
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
                </TabsContent>

                <TabsContent value="reengage">
                   <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Re-engage Dropped Leads</CardTitle>
                            <CardDescription>Generate personalized content with AI to win back customers who went cold.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid lg:grid-cols-2 gap-12">
                             <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold mb-2 text-lg">1. Select Dropped Leads</h3>
                                     <p className="text-sm text-muted-foreground mb-2">
                                        Choose which dropped leads you want to target. Total selected: <span className="font-bold text-primary">{selectedDroppedLeadIds.length}</span>
                                    </p>
                                    <ScrollArea className="h-96 rounded-md border p-4 mt-2">
                                        {loading ? (
                                            <div className="space-y-4">
                                                <Skeleton className="h-6 w-3/4" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-1/2" />
                                            </div>
                                        ) : droppedLeads.length > 0 ? (
                                            <LeadCheckboxList leads={droppedLeads} selectedLeads={selectedDroppedLeads} onSelectLead={handleSelectDroppedLead} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                                <Users className="h-12 w-12 mb-2" /><p>No dropped leads found.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            </div>
                             <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold mb-2 text-lg">2. Choose Re-engagement Tactic</h3>
                                    <RadioGroup value={campaignType} onValueChange={(value: CampaignType) => {
                                        setCampaignType(value);
                                        resetReengageState();
                                    }}>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="ai_message" id="r1" /><Label htmlFor="r1">AI Generated Message</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="ai_image" id="r2" /><Label htmlFor="r2">AI Generated Image</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="custom_message" id="r3" /><Label htmlFor="r3">Custom Message</Label></div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">3. Generate & Send</h3>
                                    {campaignType === 'custom_message' ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="custom-reengage-message">Your Message</Label>
                                            <Textarea 
                                                id="custom-reengage-message"
                                                value={customMessage}
                                                onChange={(e) => setCustomMessage(e.target.value)}
                                                placeholder="Type the message you want to send..."
                                                className="min-h-[100px]"
                                            />
                                             <Button size="sm" onClick={() => {}} disabled={!customMessage || reengageLeadsToProcess.length === 0}>
                                                <WhatsAppIcon /> Send to {reengageLeadsToProcess.length} leads
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button onClick={handleReengageGenerate} disabled={isReEngaging || reengageLeadsToProcess.length === 0}>
                                            {isReEngaging ? <LoaderCircle className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                                            {generatedText || generatedImages ? "Regenerate" : "Generate Content"}
                                        </Button>
                                    )}

                                    {isReEngaging && (
                                        <div className="flex items-center justify-center p-8">
                                            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    )}
                                    
                                    <div className="space-y-4 max-h-[20rem] overflow-y-auto pr-2">
                                        {generatedText?.map(content => (
                                            <Alert key={content.customerId}>
                                                <AlertTitle className="flex items-center justify-between">For {content.customerName}
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(content.text, content.customerId)}>
                                                        {copiedStates[content.customerId] ? <ClipboardCheck className="text-green-500" /> : <Clipboard />}
                                                    </Button>
                                                </AlertTitle>
                                                <AlertDescription>{content.text}</AlertDescription>
                                            </Alert>
                                        ))}
                                        {generatedImages?.map(content => (
                                            <div key={content.customerId} className="space-y-2">
                                                <p className="font-medium text-sm">For {content.customerName}</p>
                                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                                                    <Image src={content.imageUrl} alt={`AI image for ${content.customerName}`} layout="fill" objectFit="cover" />
                                                </div>
                                                <Button asChild variant="outline" size="sm">
                                                    <a href={content.imageUrl} download={`solar-concept-${content.customerName.replace(/\s+/g, '-')}.png`}><Download className="mr-2" /> Download</a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
