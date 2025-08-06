'use server';
/**
 * @fileOverview An AI flow to generate a welcome message for a new customer.
 *
 * - generateWelcomeMessage - A function that takes a customer name and returns a welcome message.
 * - WelcomeMessageInput - The input type for the generateWelcomeMessage function.
 * - WelcomeMessageOutput - The return type for the generateWelcomeMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WelcomeMessageInputSchema = z.object({
  customerName: z.string().describe('The name of the new customer.'),
});
export type WelcomeMessageInput = z.infer<typeof WelcomeMessageInputSchema>;

const WelcomeMessageOutputSchema = z.object({
  welcomeMessage: z.string().describe('A friendly, professional, and concise welcome message for the new customer.'),
});
export type WelcomeMessageOutput = z.infer<typeof WelcomeMessageOutputSchema>;

const generateWelcomeMessageFlow = ai.defineFlow(
  {
    name: 'generateWelcomeMessageFlow',
    inputSchema: WelcomeMessageInputSchema,
    outputSchema: WelcomeMessageOutputSchema,
  },
  async ({ customerName }) => {
    
    const prompt = `You are a customer success expert for a solar energy company called HCASolar.
    Your goal is to make a new customer feel welcomed and valued.

    Generate a friendly, professional, and concise welcome message to send to the new customer via SMS or a messaging app.
    
    Customer Name: ${customerName}
    
    The message should:
    - Greet the customer by name.
    - Thank them for choosing HCASolar.
    - Briefly mention that a dedicated sales representative will be in touch shortly to discuss the next steps.
    - Be warm and reassuring.
    - Be under 200 characters.
    `;
    
    const { output } = await ai.generate({
      prompt: prompt,
      output: {
        schema: WelcomeMessageOutputSchema,
      },
    });

    return output!;
  }
);


export async function generateWelcomeMessage(input: WelcomeMessageInput): Promise<WelcomeMessageOutput> {
  return generateWelcomeMessageFlow(input);
}
