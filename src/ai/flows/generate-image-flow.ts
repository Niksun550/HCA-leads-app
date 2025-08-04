
'use server';
/**
 * @fileOverview An AI flow to generate a marketing image for a solar lead.
 *
 * - generateMarketingImage - A function that takes a property type and returns an image URL.
 * - GenerateImageInput - The input type for the generateMarketingImage function.
 * - GenerateImageOutput - The return type for the generateMarketingImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PropertyType, propertyTypes } from '@/types';

const GenerateImageInputSchema = z.object({
  propertyType: z.enum(propertyTypes).describe('The type of property for the lead (e.g., Residential, Commercial, Industries).'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({ propertyType }) => {
    const prompt = `A cinematic, photorealistic image of a modern ${propertyType.toLowerCase()} building with sleek solar panels seamlessly integrated into the roof. The sun is shining brightly in a clear blue sky, casting a warm, optimistic glow. The property looks clean, prosperous, and environmentally friendly.`;
    
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    const imageUrl = media.url;
    if (!imageUrl) {
        throw new Error("Image generation failed to produce an image.");
    }
    
    return { imageUrl };
  }
);


export async function generateMarketingImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

    