// Summary generation: concise answers from each model, clustered when they coincide.
// No independent assessment or critique — only a structured recap of what each model said.

import { callModel } from './openrouter'
import { prisma } from './prisma'
import { updateConversationSummary } from './context'
import { DEFAULT_MODELS } from './models'

type LoadedPrompt = {
  id: string
  content: string
  conversationId: string | null
}

type LoadedResponse = {
  id: string
  modelId: string
  modelName: string
  content: string
}

async function loadPromptAndResponses(promptId: string): Promise<{
  prompt: LoadedPrompt | null
  responses: LoadedResponse[]
}> {
  const responses = await prisma.modelResponse.findMany({
    where: {
      promptId,
      status: 'completed',
    },
    select: {
      id: true,
      modelId: true,
      modelName: true,
      content: true,
    },
  })

  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    select: {
      id: true,
      content: true,
      conversationId: true,
    },
  })

  return { prompt, responses }
}

function normaliseName(raw: string): string {
  return raw
    .replace(/\(.*?\)/g, '')
    .trim()
    .toLowerCase()
}

function mapModelNamesToIds(responses: LoadedResponse[]) {
  const nameToId = new Map(
    responses.map((r) => [normaliseName(r.modelName), r.modelId])
  )

  const defaultNameToId = new Map(
    DEFAULT_MODELS.map((m) => [m.name.toLowerCase(), m.id])
  )

  return { nameToId, defaultNameToId }
}

function parsePanelVoteAndSummary(
  raw: string,
  responses: LoadedResponse[]
): { stancesByModelId: Record<string, string>; summaryText: string } {
  const lines = raw.split('\n').map((l) => l.trim())

  const panelIndex = lines.findIndex((line) =>
    /^panel[_\s-]*vote\s*:?\s*$/i.test(line)
  )

  const summaryIndex = lines.findIndex((line) =>
    /^summary\s*:?\s*$/i.test(line)
  )

  const { nameToId, defaultNameToId } = mapModelNamesToIds(responses)
  const stancesByModelId: Record<string, string> = {}

  if (panelIndex !== -1) {
    for (let i = panelIndex + 1; i < (summaryIndex === -1 ? lines.length : summaryIndex); i++) {
      const line = lines[i]
      if (!line) continue
      const match = line.match(/^-?\s*([^:]+):\s*(.+)$/)
      if (!match) continue
      const rawName = match[1].trim()
      const stance = match[2].trim()
      if (!stance) continue

      const name = normaliseName(rawName)

      let modelId = nameToId.get(name)

      if (!modelId) {
        for (const [knownName, id] of nameToId.entries()) {
          if (name.includes(knownName)) {
            modelId = id
            break
          }
        }
      }

      if (!modelId) {
        modelId = defaultNameToId.get(name)
        if (!modelId) {
          for (const [knownName, id] of defaultNameToId.entries()) {
            if (name.includes(knownName)) {
              modelId = id
              break
            }
          }
        }
      }

      if (!modelId) continue

      stancesByModelId[modelId] = stance
    }
  }

  if (Object.keys(stancesByModelId).length === 0) {
    for (const r of responses) {
      stancesByModelId[r.modelId] = 'Read full answer'
    }
  }

  let summaryText = ''
  if (summaryIndex !== -1) {
    const summaryLines = lines.slice(summaryIndex + 1)

    const paragraphs: string[] = []
    let current: string[] = []
    for (const line of summaryLines) {
      if (!line) {
        if (current.length) {
          paragraphs.push(current.join(' '))
          current = []
        }
        continue
      }
      current.push(line)
    }
    if (current.length) {
      paragraphs.push(current.join(' '))
    }

    summaryText = paragraphs.join('\n\n').trim()
  }

  if (!summaryText) {
    const fallbackLines = responses.slice(0, 5).map((r) => `**${r.modelName}:** ${r.content.slice(0, 200)}…`)
    summaryText = fallbackLines.join('\n\n')
  }

  return { stancesByModelId, summaryText }
}

export async function generateSummaryAndStances(
  promptId: string,
  preload?: { prompt: LoadedPrompt | null; responses: LoadedResponse[] }
): Promise<{ summaryText: string; stancesByModelId: Record<string, string> }> {
  const { prompt, responses } = preload ?? (await loadPromptAndResponses(promptId))

  if (!responses || responses.length === 0) {
    throw new Error('No completed responses found')
  }

  if (!prompt) {
    throw new Error('Prompt not found')
  }

  const completedCount = responses.length

  const existingSummary = await prisma.summary.findUnique({
    where: { promptId },
  })

  if (existingSummary && existingSummary.stances && completedCount > 0) {
    const raw = existingSummary.stances as any
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const stored = raw as Record<string, string>
      const storedCount = Object.keys(stored).length
      if (storedCount >= completedCount && existingSummary.content.trim().length > 0) {
        return { summaryText: existingSummary.content, stancesByModelId: stored }
      }
    }
  }

  const responseTexts = responses
    .map((r) => `**${r.modelName}:**\n${r.content}`)
    .join('\n\n---\n\n')

  const responseNames = responses.map((r) => r.modelName)
  const exemplarPanelLines = responseNames
    .map((name) => `${name}: <stance>`)
    .join('\n')

  const orchestratorPrompt = `You are summarising multiple AI responses to one question for a "board of models" UI.

Question:
${prompt.content}

Responses (verbatim):
${responseTexts}

You must produce TWO sections:
1) PANEL_VOTE: one short stance per model, suitable for a compact vote UI.
2) SUMMARY: 2–5 very short clustered lines that describe the main takeaways.

Rules for PANEL_VOTE:
- For each model, output exactly ONE short stance (a word or short phrase).
- Be as brief and direct as possible. Good examples: "No clear winner", "Neither", "United States", "Gravity", "It depends", "Read full answer".
- Use "It depends" for subjective "best X" questions (best country, best player, best car, etc.).
- Use "Read full answer" ONLY when you genuinely cannot extract a meaningful short stance from the model's answer.
- Do NOT include long explanations or restate the question.
- Use the exact model names from the Responses section. Do NOT change or invent names.

Rules for SUMMARY:
- Write 2–5 very short bullet lines.
- CLUSTER by agreement: when two or more models give the same or nearly identical answer, state that common answer ONCE and list the model names together.
- Each line MUST start with a bracketed, comma-separated list of model names, then a space, then one short sentence written in direct form.
- Example: "[ChatGPT, Claude] X is the best option."
- No meta-commentary, no evaluation, and no third-person phrasing like "they say" or "the models think". Just write the statements directly.
- Put a blank line between clusters.

STRICT OUTPUT FORMAT (no extra commentary):
PANEL_VOTE:
${exemplarPanelLines}

SUMMARY:
[Model A, Model B] very short clustered takeaway.

[Model C] another short clustered takeaway.`

  try {
    const result = await callModel('openai/gpt-4o-mini', orchestratorPrompt, {
      temperature: 0.2,
      maxTokens: 1200,
    })

    if (!result.success || !result.content) {
      throw new Error('Failed to generate summary and panel vote')
    }

    const { stancesByModelId, summaryText } = parsePanelVoteAndSummary(
      result.content,
      responses
    )

    const saved = await prisma.summary.upsert({
      where: { promptId },
      create: {
        promptId,
        content: summaryText,
        stances: stancesByModelId,
      },
      update: {
        content: summaryText,
        stances: stancesByModelId,
      },
    })

    try {
      await updateConversationSummary(prompt.conversationId, prompt.content, saved.content)
    } catch (e) {
      console.error('Failed to update conversation summary:', e)
    }

    return { summaryText: saved.content, stancesByModelId }
  } catch (error) {
    console.error('Error generating summary and panel vote:', error)

    const fallbackStances: Record<string, string> = {}
    for (const r of responses) {
      fallbackStances[r.modelId] = 'Read full answer'
    }
    const fallbackContent = `Summary could not be generated. ${responses.length} model(s) provided responses.`

    const saved = await prisma.summary.upsert({
      where: { promptId },
      create: {
        promptId,
        content: fallbackContent,
        stances: fallbackStances,
      },
      update: {
        content: fallbackContent,
        stances: fallbackStances,
      },
    })

    return { summaryText: saved.content, stancesByModelId: fallbackStances }
  }
}

export async function generateSummaryAndViewpoints(
  promptId: string,
  preload?: { prompt: LoadedPrompt | null; responses: LoadedResponse[] }
): Promise<void> {
  await generateSummaryAndStances(promptId, preload)
}

export async function generateStancesForPrompt(
  promptId: string,
  preload?: { prompt: LoadedPrompt | null; responses: LoadedResponse[] }
): Promise<{ stancesByModelId: Record<string, string> } | null> {
  const { stancesByModelId } = await generateSummaryAndStances(promptId, preload)
  return { stancesByModelId }
}

