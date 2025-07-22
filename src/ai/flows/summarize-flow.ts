
'use server';
/**
 * @fileOverview An AI flow to summarize a conversation about a lead.
 *
 * - summarizeConversation - A function that takes a conversation and returns a summary.
 * - SummarizeConversationInput - The input type for the summarizeConversation function.
 * - SummarizeConversationOutput - The return type for the summarizeConversation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Message } from '@/types';
import { Timestamp } from 'firebase/firestore';

const MessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  authorId: z.string(),
  createdAt: z.custom<Timestamp>()
});

const SummarizeConversationInputSchema = z.array(MessageSchema);
export type SummarizeConversationInput = z.infer<typeof SummarizeConversationInputSchema>;

const SummarizeConversationOutputSchema = z.object({
  summary: z.string().describe('A concise, bulleted summary of the conversation.'),
});
export type SummarizeConversationOutput = z.infer<typeof SummarizeConversationOutputSchema>;


const summarizeConversationFlow = ai.defineFlow(
  {
    name: 'summarizeConversationFlow',
    inputSchema: SummarizeConversationInputSchema,
    outputSchema: SummarizeConversationOutputSchema,
  },
  async (messages) => {
    const { output } = await ai.generate({
      prompt: `You are an expert sales assistant. Your task is to summarize the following conversation about a sales lead. Provide a concise, bulleted summary of the key points, decisions, and action items.
      
      Conversation History:
      ${messages.map(m => `User ${m.authorId} said: "${m.text}"`).join('\n')}
      `,
      output: {
        schema: SummarizeConversationOutputSchema,
      }
    });
    return output!;
  }
);


export async function summarizeConversation(input: SummarizeConversationInput): Promise<SummarizeConversationOutput> {
  return summarizeConversationFlow(input);
}
