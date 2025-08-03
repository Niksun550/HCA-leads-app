
'use server';
/**
 * @fileOverview An AI flow to generate a re-engagement message for a dropped lead.
 *
 * - reengageLead - A function that takes customer details and returns a re-engagement message.
 * - ReengageLeadInput - The input type for the reengageLead function.
 * - ReengageLeadOutput - The return type for the reengageLead function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PropertyType, propertyTypes } from '@/types';

const ReengageLeadInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  propertyType: z.enum(propertyTypes).describe('The type of property for the lead (e.g., Residential, Commercial).'),
});
export type ReengageLeadInput = z.infer<typeof ReengageLeadInputSchema>;

const ReengageLeadOutputSchema = z.object({
  reengagementMessage: z.string().describe('A friendly, professional, and concise re-engagement message for the customer.'),
});
export type ReengageLeadOutput = z.infer<typeof ReengageLeadOutputSchema>;

const reengageLeadFlow = ai.defineFlow(
  {
    name: 'reengageLeadFlow',
    inputSchema: ReengageLeadInputSchema,
    outputSchema: ReengageLeadOutputSchema,
  },
  async ({ customerName, propertyType }) => {
    
    const prompt = `You are a marketing expert for a solar energy company. Your goal is to re-engage a customer who previously showed interest but the lead was dropped.

    Generate a friendly, professional, and concise message to send to the customer via SMS or a messaging app.
    
    Customer Name: ${customerName}
    Property Type: ${propertyType}
    
    The message should:
    - Greet the customer by name.
    - Gently remind them of their previous interest in solar for their ${propertyType.toLowerCase()} property.
    - Mention a new (fictional) incentive or offer that might be relevant to them to spark new interest.
    - Be under 160 characters.
    - End with a soft call to action, like asking if they're open to a brief chat.
    `;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash', // Use a model that supports structured output
      prompt: prompt,
      output: {
        schema: ReengageLeadOutputSchema,
      },
    });

    return output!;
  }
);


export async function reengageLead(input: ReengageLeadInput): Promise<ReengageLeadOutput> {
  return reengageLeadFlow(input);
}
