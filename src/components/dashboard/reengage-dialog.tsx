
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, LoaderCircle, Clipboard, ClipboardCheck, Download } from 'lucide-react';
import { reengageLead } from '@/ai/flows/reengage-flow';
import { generateMarketingImage } from '@/ai/flows/generate-image-flow';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';

interface ReengageDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  leads: Lead[];
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

type CampaignType = "message" | "image";

export default function ReengageDialog({ isOpen, setIsOpen, leads }: ReengageDialogProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedText, setGeneratedText] = useState<GeneratedTextContent[] | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImageContent[] | null>(null);
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const [campaignType, setCampaignType] = useState<CampaignType>("message");

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedText(null);
        setGeneratedImages(null);
        
        try {
            if (campaignType === 'message') {
                const promises = leads.map(lead => 
                    reengageLead({ customerName: lead.customerName, propertyType: lead.propertyType })
                );
                const results = await Promise.all(promises);
                const content = results.map((result, index) => ({
                    customerId: leads[index].id,
                    customerName: leads[index].customerName,
                    text: result.reengagementMessage,
                }));
                setGeneratedText(content);
            } else if (campaignType === 'image') {
                const promises = leads.map(lead => 
                    generateMarketingImage({ propertyType: lead.propertyType })
                );
                const results = await Promise.all(promises);
                 const images = results.map((result, index) => ({
                    customerId: leads[index].id,
                    customerName: leads[index].customerName,
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
    
    const resetState = () => {
        setGeneratedText(null);
        setGeneratedImages(null);
        setIsGenerating(false);
        setCopiedStates({});
    }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
            resetState();
        }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Re-engage Dropped Leads</DialogTitle>
          <DialogDescription>
            Generate personalized content to win back customers. You have selected {leads.length} lead(s).
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
            <RadioGroup defaultValue="message" onValueChange={(value: CampaignType) => {
                setCampaignType(value);
                resetState();
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="message" id="r1" />
                <Label htmlFor="r1">Re-engagement Message</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="r2" />
                <Label htmlFor="r2">Marketing Image</Label>
              </div>
            </RadioGroup>

             {isGenerating && (
                <div className="flex items-center justify-center p-8">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            
            <div className="space-y-4 max-h-[20rem] overflow-y-auto pr-2">
                {generatedText && (
                    <>
                        {generatedText.map(content => (
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
                    </>
                )}
                 {generatedImages && (
                    <>
                        {generatedImages.map(content => (
                            <div key={content.customerId} className="space-y-2">
                                <p className="font-medium text-sm">For {content.customerName}</p>
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                                    <Image
                                        src={content.imageUrl}
                                        alt={`AI-generated marketing image for ${content.customerName}`}
                                        layout="fill"
                                        objectFit="cover"
                                    />
                                </div>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                >
                                    <a href={content.imageUrl} download={`solar-concept-${content.customerName.replace(/\s+/g, '-')}.png`}>
                                        <Download className="mr-2" /> Download Image
                                    </a>
                                </Button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating || leads.length === 0}>
            {isGenerating ? <LoaderCircle className="mr-2" /> : <Sparkles className="mr-2" />}
            {generatedText || generatedImages ? "Regenerate" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
