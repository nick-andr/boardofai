// Conversation context for multi-turn: build messages and maintain running summary.

import type { ChatMessage } from './openrouter'
import { callModel } from './openrouter'
import { prisma } from './prisma'

const MAX_PREVIOUS_TURNS = 3

/**
 * Build messages for a model call: last N user turns + new user prompt.
 * We deliberately exclude any board/aggregate summaries so models do not see each other's answers.
 */
export async function buildConversationMessages(
  conversationId: string,
  newUserPrompt: string
): Promise<ChatMessage[]> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      prompts: {
        orderBy: { createdAt: 'asc' },
        include: { summary: true },
      },
    },
  })

  if (!conversation) return [{ role: 'user', content: newUserPrompt }]

  const messages: ChatMessage[] = []

  const prompts = conversation.prompts
  const start = Math.max(0, prompts.length - MAX_PREVIOUS_TURNS)

  for (let i = start; i < prompts.length; i++) {
    const p = prompts[i]
    messages.push({ role: 'user', content: p.content })
  }

  messages.push({ role: 'user', content: newUserPrompt })
  return messages
}

/**
 * Update the conversation's running summary after a new turn (call after per-prompt summary is saved).
 */
export async function updateConversationSummary(
  conversationId: string,
  lastPromptContent: string,
  lastPromptSummaryContent: string
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { summary: true },
  })

  if (!conversation) return

  const prev = conversation.summary?.trim() || ''
  const prompt = prev
    ? `Update this conversation summary in 2-4 short sentences. Include the new Q&A.\n\nPrevious summary: ${prev}\n\nNew question: ${lastPromptContent}\n\nNew board summary: ${lastPromptSummaryContent}`
    : `Write a 2-4 sentence conversation summary.\n\nQuestion: ${lastPromptContent}\n\nBoard summary: ${lastPromptSummaryContent}`

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
