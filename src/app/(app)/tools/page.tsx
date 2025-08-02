
"use client";

import { useEffect, useState, useMemo } from "react";
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
import { LoaderCircle, Wand2, Clipboard, ClipboardCheck, Users, Upload, FileText, Bot, Type, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import Image from 'next/image';

import { generateWelcomeMessage, WelcomeMessageInput } from "@/ai/flows/welcome-flow";

interface CampaignLead {
    id: string;
    customerName: string;
}

interface GeneratedContent {
    leadId: string;
    customerName: string;
    text: string;
}

type CampaignType = "ai_welcome" | "custom_text" | "custom_image";

export default function ToolsPage() {
    const { user, isInitialized } = useAuth();
    const { toast } = useToast();
    const [dbLeads, setDbLeads] = useState<Lead[]>([]);
    const [uploadedLeads, setUploadedLeads] = useState<CampaignLead[]>([]);
    const [selectedLeads, setSelectedLeads] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    
    const [campaignType, setCampaignType] = useState<CampaignType>("ai_welcome");
    const [customMessage, setCustomMessage] = useState("");
    const [customImage, setCustomImage] = useState<string | null>(null);

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

                if (!nameKey) {
                    toast({ variant: 'destructive', title: 'Invalid Format', description: 'Could not find a suitable column for customer names.' });
                    return;
                }

                const newLeads = json.map((row, index) => ({
                    id: `file-${index}-${row[nameKey]}`,
                    customerName: String(row[nameKey]),
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
                setCustomImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const allLeadsForCampaign: CampaignLead[] = useMemo(() => [
        ...dbLeads.map(l => ({ id: l.id, customerName: l.customerName })),
        ...uploadedLeads
    ], [dbLeads, uploadedLeads]);

    const selectedLeadIds = Object.keys(selectedLeads).filter(id => selectedLeads[id]);
    const leadsToProcess = allLeadsForCampaign.filter(lead => selectedLeadIds.includes(lead.id));

    const handleGenerate = async () => {
        if (leadsToProcess.length === 0) {
            toast({ variant: 'destructive', title: 'No customers selected', description: 'Please select at least one customer to target.' });
            return;
        }

        setIsGenerating(true);
        setGeneratedContent([]);
        try {
            if (campaignType === 'ai_welcome') {
                const promises = leadsToProcess.map(lead => generateWelcomeMessage({ customerName: lead.customerName }));
                const results = await Promise.all(promises);
                const content = results.map((result, index) => ({
                    leadId: leadsToProcess[index].id,
                    customerName: leadsToProcess[index].customerName,
                    text: result.welcomeMessage,
                }));
                setGeneratedContent(content);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleCopy = (text: string, leadId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [leadId]: true }));
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [leadId]: false })), 2000);
    };
    
    const LeadCheckboxList = ({ leads }: { leads: CampaignLead[] }) => (
        <div className="space-y-2">
            {leads.map(lead => (
                <div key={lead.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                    <Checkbox
                        id={lead.id}
                        checked={selectedLeads[lead.id] || false}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                    />
                    <Label htmlFor={lead.id} className="font-normal cursor-pointer flex-1">{lead.customerName}</Label>
                </div>
            ))}
        </div>
    );

    const renderResults = () => {
        if (campaignType === 'ai_welcome') {
            return (
                <div className="space-y-4">
                    {generatedContent.map(content => (
                        <Alert key={content.leadId}>
                            <AlertTitle className="flex items-center justify-between">
                                For {content.customerName}
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(content.text, content.leadId)}>
                                    {copiedStates[content.leadId] ? <ClipboardCheck className="text-green-500" /> : <Clipboard />}
                                </Button>
                            </AlertTitle>
                            <AlertDescription>{content.text}</AlertDescription>
                        </Alert>
                    ))}
                </div>
            );
        }
        if (campaignType === 'custom_text' && customMessage) {
            return (
                <Alert>
                    <AlertTitle>Your Custom Message</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">{customMessage}</AlertDescription>
                </Alert>
            );
        }
        if (campaignType === 'custom_image' && customImage) {
            return (
                <div className="space-y-2">
                    <Label>Image Preview</Label>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                        <Image src={customImage} alt="Uploaded flyer" layout="fill" objectFit="contain" />
                    </div>
                </div>
            )
        }
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Wand2 className="h-12 w-12 mb-2" />
                <p>Your campaign content will appear here.</p>
            </div>
        )
    };

    return (
        <div className="py-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Tools</h1>
                <p className="text-muted-foreground">Advanced features to boost your productivity.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Marketing Campaign Builder</CardTitle>
                    <CardDescription>Engage customers with personalized campaigns using AI, custom text, or images.</CardDescription>
                </CardHeader>
                <CardContent className="grid lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2 text-lg">1. Select Customers</h3>
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
                                            <LeadCheckboxList leads={dbLeads.map(l => ({id: l.id, customerName: l.customerName}))} />
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
                                        <p className="text-xs text-muted-foreground">File must have a header with a 'name' or 'customerName' column.</p>
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
                        <div>
                            <h3 className="font-semibold mb-2 text-lg">2. Choose Content Type</h3>
                            <RadioGroup value={campaignType} onValueChange={(v) => setCampaignType(v as CampaignType)} className="p-4 border rounded-md grid md:grid-cols-3 gap-4">
                                <Label htmlFor="type-ai" className="flex flex-col items-center gap-2 p-2 rounded-md border border-transparent has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer">
                                    <RadioGroupItem value="ai_welcome" id="type-ai" className="sr-only" />
                                    <Bot className="h-8 w-8" />
                                    <span className="text-center font-normal">AI Welcome Message</span>
                                </Label>
                                <Label htmlFor="type-text" className="flex flex-col items-center gap-2 p-2 rounded-md border border-transparent has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer">
                                    <RadioGroupItem value="custom_text" id="type-text" className="sr-only" />
                                    <Type className="h-8 w-8" />
                                    <span className="text-center font-normal">Custom Text</span>
                                </Label>
                                <Label htmlFor="type-image" className="flex flex-col items-center gap-2 p-2 rounded-md border border-transparent has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer">
                                    <RadioGroupItem value="custom_image" id="type-image" className="sr-only" />
                                    <ImageIcon className="h-8 w-8" />
                                    <span className="text-center font-normal">Image / Flyer</span>
                                </Label>
                            </RadioGroup>
                             {campaignType === 'ai_welcome' && (
                                <Button onClick={handleGenerate} disabled={isGenerating || selectedLeadIds.length === 0} className="mt-4 w-full">
                                    {isGenerating ? <LoaderCircle className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                                    Generate for {selectedLeadIds.length} customer(s)
                                </Button>
                             )}
                              {campaignType === 'custom_text' && (
                                <Textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Write your message here..." className="mt-4 min-h-[120px]" />
                              )}
                              {campaignType === 'custom_image' && (
                                <div className="mt-4">
                                    <Input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} />
                                </div>
                              )}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                             <h3 className="font-semibold mb-2 text-lg">3. Review & Use</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                  There is no "Send" button. Please copy/download the generated content and send it to your customers via your preferred communication channel (e.g., SMS, WhatsApp, Email).
                              </p>
                             <div className="min-h-[24rem] rounded-md border p-4 bg-muted/30">
                                {isGenerating ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <LoaderCircle className="animate-spin h-8 w-8" />
                                    </div>
                                ) : (
                                    renderResults()
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
