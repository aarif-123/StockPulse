import { z } from 'zod';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const intelligenceChatSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty.')
    .max(1000, 'Message too long — keep queries under 1000 characters.'),
  /**
   * Recent conversation history for multi-turn context.
   * Frontend is responsible for capping this before sending.
   */
  history: z.array(chatMessageSchema).max(10).optional().default([]),
});

export type IntelligenceChatInput = z.infer<typeof intelligenceChatSchema>;
