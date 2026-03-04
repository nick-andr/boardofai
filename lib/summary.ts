// Summary and Viewpoint Clustering Logic
// This module generates summaries and groups responses by viewpoint

import { callModel } from './openrouter'
import { prisma } from './prisma'

export async function generateSummaryAndViewpoints(promptId: string): Promise<void> {
  // Get all completed responses for this prompt
  const responses = await prisma.modelResponse.findMany({
    where: {
      promptId,
      status: 'completed',
    },
  })

  if (responses.length === 0) {
    throw new Error('No completed responses found')
  }

  // Get the prompt
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
  })

  if (!prompt) {
    throw new Error('Prompt not found')
  }

  // Prepare response text for analysis
  const responseTexts = responses
    .map((r, i) => `Response ${i + 1} (${r.modelName}):\n${r.content}`)
    .join('\n\n---\n\n')

  // Generate summary using a model
  const summaryPrompt = `You are analyzing multiple AI responses to the following question:

Question: ${prompt.content}

Responses:
${responseTexts}

Please provide:
1. A concise summary (2-3 paragraphs) that synthesizes the overall insights from all responses
2. Identify distinct viewpoints or perspectives expressed across the responses
3. For each viewpoint, provide:
   - A short title (2-5 words)
   - A brief description (1-2 sentences)
   - Which response numbers support this viewpoint

Format your response as JSON:
{
  "summary": "overall summary text",
  "viewpoints": [
    {
      "title": "viewpoint title",
      "description": "viewpoint description",
      "responseIndices": [0, 1, 2]
    }
  ]
}`

  try {
    // Use GPT-4o-mini for summary generation (fast and cheap)
    const summaryResult = await callModel('openai/gpt-4o-mini', summaryPrompt)

    if (!summaryResult.success || !summaryResult.content) {
      throw new Error('Failed to generate summary')
    }

    // Parse JSON response
    let analysis
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = summaryResult.content.match(/```json\n([\s\S]*?)\n```/) ||
                       summaryResult.content.match(/```\n([\s\S]*?)\n```/) ||
                       summaryResult.content.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } else {
        analysis = JSON.parse(summaryResult.content)
      }
    } catch (parseError) {
      // Fallback: create a simple summary
      analysis = {
        summary: summaryResult.content.substring(0, 500),
        viewpoints: responses.map((r, i) => ({
          title: `${r.modelName}'s Perspective`,
          description: r.content.substring(0, 200),
          responseIndices: [i],
        })),
      }
    }

    // Create summary record
    await prisma.summary.create({
      data: {
        promptId,
        content: analysis.summary,
      },
    })

    // Create viewpoints and link responses
    for (const viewpoint of analysis.viewpoints || []) {
      const viewpointRecord = await prisma.viewpoint.create({
        data: {
          promptId,
          title: viewpoint.title || 'Untitled Viewpoint',
          description: viewpoint.description || '',
        },
      })

      // Link responses to viewpoint
      const responseIndices = viewpoint.responseIndices || []
      for (const index of responseIndices) {
        if (responses[index]) {
          await prisma.modelResponse.update({
            where: { id: responses[index].id },
            data: { viewpointId: viewpointRecord.id },
          })
        }
      }
    }
  } catch (error) {
    console.error('Error generating summary:', error)
    // Create a fallback summary
    await prisma.summary.create({
      data: {
        promptId,
        content: `Summary generation encountered an error. ${responses.length} model(s) provided responses.`,
      },
    })
  }
}
