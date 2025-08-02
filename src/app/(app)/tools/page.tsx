"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Lead } from "@/types";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { LoaderCircle, Wand2, Clipboard, ClipboardCheck, Users } from "lucide-react";

import { generateWelcomeMessage } from "@/ai/flows/welcome-flow";

interface GeneratedContent {
    leadId: string;
    customerName: string;
    text: string;
}

export default function ToolsPage() {
    const { user, isInitialized } = useAuth();
    const { toast } = useToast();
    const [newLeads, setNewLeads] = useState<Lead[]>([]);
    const [selectedLeads, setSelectedLeads] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

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
            setNewLeads(leadsData);
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
    
    const selectedLeadIds = Object.keys(selectedLeads).filter(id => selectedLeads[id]);
    const leadsToProcess = newLeads.filter(lead => selectedLeadIds.includes(lead.id));

    const handleGenerate = async () => {
        if (leadsToProcess.length === 0) {
            toast({ variant: 'destructive', title: 'No leads selected', description: 'Please select at least one lead.' });
            return;
        }

        setIsGenerating(true);
        setGeneratedContent([]);
        try {
            const promises = leadsToProcess.map(lead => generateWelcomeMessage({ customerName: lead.customerName }));
            const results = await Promise.all(promises);
            const content = results.map((result, index) => ({
                leadId: leadsToProcess[index].id,
                customerName: leadsToProcess[index].customerName,
                text: result.welcomeMessage,
            }));
            setGeneratedContent(content);
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

    return (
        <div className="py-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Tools</h1>
                <p className="text-muted-foreground">Advanced features to boost your productivity.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Welcome Campaign</CardTitle>
                    <CardDescription>Generate personalized welcome messages for new leads.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold mb-2">1. Select New Leads</h3>
                        <p className="text-sm text-muted-foreground mb-4">Choose which customers to generate messages for.</p>
                        <ScrollArea className="h-72 rounded-md border p-4">
                            {loading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-6 w-1/2" />
                                </div>
                            ) : newLeads.length > 0 ? (
                                <div className="space-y-2">
                                    {newLeads.map(lead => (
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
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <Users className="h-12 w-12 mb-2" />
                                    <p>No new leads found.</p>
                                </div>
                            )}
                        </ScrollArea>
                         <Button onClick={handleGenerate} disabled={isGenerating || selectedLeadIds.length === 0} className="mt-4 w-full">
                            {isGenerating ? <LoaderCircle className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                            Generate ({selectedLeadIds.length})
                        </Button>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">2. Generated Messages</h3>
                        <p className="text-sm text-muted-foreground mb-4">Copy the generated messages and send them to your customers.</p>
                         <ScrollArea className="h-72 rounded-md border p-4 bg-muted/30">
                            {isGenerating ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <LoaderCircle className="animate-spin h-8 w-8" />
                                </div>
                            ) : generatedContent.length > 0 ? (
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
                            ) : (
                                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                    <p>Generated messages will appear here.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
