
"use client";

import { useState, useMemo } from 'react';
import type { Lead } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, LoaderCircle, Clipboard, ClipboardCheck } from 'lucide-react';
import { reengageLead } from '@/ai/flows/reengage-flow';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ReengageDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  leads: Lead[];
}

interface GeneratedContent {
    customerId: string;
    customerName: string;
    text: string;
}

export default function ReengageDialog({ isOpen, setIsOpen, leads }: ReengageDialogProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent[] | null>(null);
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedContent(null);
        try {
            const promises = leads.map(lead => 
                reengageLead({ customerName: lead.customerName, propertyType: lead.propertyType })
            );
            const results = await Promise.all(promises);
            const content = results.map((result, index) => ({
                customerId: leads[index].id,
                customerName: leads[index].customerName,
                text: result.reengagementMessage,
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
    
    const handleCopy = (text: string, customerId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [customerId]: true }));
        setTimeout(() => {
            setCopiedStates(prev => ({ ...prev, [customerId]: false }));
        }, 2000);
    };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
            setGeneratedContent(null);
            setIsGenerating(false);
        }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Re-engage Dropped Leads</DialogTitle>
          <DialogDescription>
            Generate personalized messages to win back customers. You have selected {leads.length} lead(s).
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
             {!generatedContent && !isGenerating && (
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Ready to generate re-engagement messages for:</p>
                    <ul className="text-sm font-medium mt-2">
                        {leads.map(l => <li key={l.id}>{l.customerName}</li>)}
                    </ul>
                </div>
            )}
            
            {isGenerating && (
                <div className="flex items-center justify-center p-8">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            
            {generatedContent && (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {generatedContent.map(content => (
                        <Alert key={content.customerId}>
                            <AlertTitle className="flex items-center justify-between">
                                For {content.customerName}
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(content.text, content.customerId)}>
                                    {copiedStates[content.customerId] ? <ClipboardCheck className="text-green-500" /> : <Clipboard />}
                                </Button>
                            </AlertTitle>
                            <AlertDescription>
                                {content.text}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className="mr-2" /> : <Sparkles className="mr-2" />}
            {generatedContent ? "Regenerate" : "Generate Messages"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
