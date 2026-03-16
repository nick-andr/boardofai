// Summary generation: concise answers from each model, clustered when they coincide.
// No independent assessment or critique — only a structured recap of what each model said.

import { callModel } from './openrouter'
import { prisma } from './prisma'
import { updateConversationSummary } from './context'

export async function generateSummaryAndViewpoints(promptId: string): Promise<void> {
  const responses = await prisma.modelResponse.findMany({
    where: {
      promptId,
      status: 'completed',
    },
  })

  if (responses.length === 0) {
    throw new Error('No completed responses found')
  }

  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
  })

  if (!prompt) {
    throw new Error('Prompt not found')
  }

  const responseTexts = responses
    .map((r) => `**${r.modelName}:**\n${r.content}`)
    .join('\n\n---\n\n')

  const summaryPrompt = `You are writing a very short summary of multiple AI responses to one question. Be extremely concise. Do NOT repeat or paraphrase the full responses.

Question: ${prompt.content}

Responses:
${responseTexts}

Rules:
1. Summarize in 2-5 very short sentences or bullet points at most. Do not list each model's answer separately if they say the same thing.
2. CLUSTER by agreement: when two or more models give the same or nearly identical answer, state that common answer ONCE and list the model names together. Example: "[ChatGPT, Claude, Gemini] X is the most important invention.". Only give a separate line when a model's view is meaningfully different.
3. No meta-commentary, no evaluation, and no third-person phrasing like "they say", "they recommend", "the models think", etc. Just write the statements directly.
4. Format: each line MUST start with a bracketed, comma-separated list of model names, then a space, then one short sentence written in direct form. Example: "[ChatGPT, Claude] X is the best option." DO NOT write "They say X" or "They agree that X". Use the exact model names from the Responses section. Put a blank line between clusters.`

  try {
    const summaryResult = await callModel('openai/gpt-4o-mini', summaryPrompt)

    if (!summaryResult.success || !summaryResult.content) {
      throw new Error('Failed to generate summary')
    }

    const content = summaryResult.content.trim()

    await prisma.summary.upsert({
      where: { promptId },
      create: {
        promptId,
        content,
      },
      update: {
        content,
      },
    })

    try {
      await updateConversationSummary(prompt.conversationId, prompt.content, content)
    } catch (e) {
      console.error('Failed to update conversation summary:', e)
    }

    // No viewpoints created — summary only.
  } catch (error) {
    console.error('Error generating summary:', error)
    await prisma.summary.upsert({
      where: { promptId },
      create: {
        promptId,
        content: `Summary could not be generated. ${responses.length} model(s) provided responses.`,
      },
      update: {
        content: `Summary could not be generated. ${responses.length} model(s) provided responses.`,
      },
    })
  }
}
