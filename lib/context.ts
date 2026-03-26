// Conversation context for multi-turn: build messages and maintain running summary.

import type { ChatMessage } from './openrouter'
import { callModel } from './openrouter'
import { prisma } from './prisma'

/**
 * Build messages for a model call: shared conversation recap (if any) + latest user prompt.
 * Models receive a neutral, stance-free summary as background, and must answer only the latest user message.
 */
export async function buildConversationMessages(
  conversationId: string,
  newUserPrompt: string
): Promise<ChatMessage[]> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { summary: true },
  })

  const messages: ChatMessage[] = []

  const systemContent =
    'You are one of several independent AI models in a "board of models" conversation. ' +
    'You do not see other models’ answers. Never refer to “other models”, “the board”, “we”, consensus, or votes. ' +
    'You may see a brief neutral recap of what has been discussed so far; treat it only as background context, not as a conclusion or something to rely on. ' +
    'Always answer only the latest user message, using prior context only to resolve ambiguity. You may revise earlier views if your reasoning changes.'

  messages.push({ role: 'system', content: systemContent })

  const recap = conversation?.summary?.trim()
  if (recap) {
    messages.push({
      role: 'assistant',
      content: `Conversation recap (context only, not a conclusion):\n${recap}`,
    })
  }

  messages.push({ role: 'user', content: newUserPrompt })
  return messages
}

/**
 * Update the conversation's running summary after a new turn.
 * Uses anonymized model responses (no UI summary) so the recap is derived from what was said, without attributing to any model.
 */
export async function updateConversationSummary(
  conversationId: string,
  lastPromptContent: string,
  anonymizedResponsesText: string
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { summary: true },
  })

  if (!conversation) return

  const prev = conversation.summary?.trim() || ''

  const answersBlock =
    anonymizedResponsesText.trim() ||
    '(No answers to summarize for this turn.)'

  const prompt = prev
    ? `You are maintaining a neutral, factual recap of an ongoing conversation. Aim for 4-8 short sentences so the recap can cover roughly the last 4 exchanges. Give more detail to recent turns; compress older context into a short line or two.

Rules:
- Describe only topics, facts, constraints, and key questions discussed so far. Do not attribute any view to any source or model.
- Do NOT mention "other models", "the board", votes, consensus, winners, or who agreed/disagreed.
- Do NOT state that anything is definitively correct; just recap what has been talked about.
- Keep the recap general and stance-free.

Previous recap:
${prev}

Latest user question:
${lastPromptContent}

Latest answers (anonymized; summarize their substance only):
${answersBlock}`
    : `You are writing the first neutral, factual recap of a conversation. Aim for 4-8 short sentences. Give more detail to the latest exchange.

Rules:
- Describe only topics, facts, constraints, and key questions discussed. Do not attribute any view to any source or model.
- Do NOT mention "other models", "the board", votes, consensus, winners, or who agreed/disagreed.
- Do NOT state that anything is definitively correct; just recap what has been talked about.
- Keep the recap general and stance-free.

Latest user question:
${lastPromptContent}

Latest answers (anonymized; summarize their substance only):
${answersBlock}`

  try {
    const res = await callModel('openai/gpt-4o-mini', prompt)
    if (res.success && res.content?.trim()) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { summary: res.content.trim() },
      })
    }
  } catch (e) {
    console.error('Failed to update conversation summary:', e)
  }
}
