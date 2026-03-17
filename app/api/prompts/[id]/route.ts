import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSummaryAndStances } from '@/lib/summary'

/** POST: Ensure summary exists (e.g. after reconnect). Generates if missing. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: { summary: true, responses: { select: { status: true, modelId: true, modelName: true, content: true } } },
    })
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    const completedResponses = prompt.responses.filter((r) => r.status === 'completed')
    const hasCompleted = completedResponses.length > 0
    if (!hasCompleted) {
      return NextResponse.json({ summary: null })
    }

    const completedCount = completedResponses.length

    if (prompt.summary && prompt.summary.stances) {
      const storedStances = prompt.summary.stances as any
      if (storedStances && typeof storedStances === 'object' && !Array.isArray(storedStances)) {
        const storedCount = Object.keys(storedStances as Record<string, string>).length
        if (storedCount >= completedCount && prompt.summary.content.trim().length > 0) {
          return NextResponse.json({
            summary: {
              content: prompt.summary.content,
              stances: storedStances as Record<string, string>,
            },
          })
        }
      }
    }

    const preload = {
      prompt: { id: prompt.id, content: prompt.content, conversationId: prompt.conversationId },
      responses: completedResponses.map((r) => ({
        id: r.id,
        modelId: r.modelId,
        modelName: r.modelName,
        content: r.content,
      })),
    }

    const result = await generateSummaryAndStances(id, preload)

    return NextResponse.json({
      summary: {
        content: result.summaryText,
        stances: result.stancesByModelId,
      },
    })
  } catch (error) {
    console.error('Error ensuring summary:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        summary: true,
        responses: {
          include: {
            viewpoint: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { responses: true },
        },
      },
    })

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Group viewpoints
    const viewpoints = await prisma.viewpoint.findMany({
      where: { promptId: id },
      include: {
        responses: {
          select: {
            id: true,
            modelName: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...prompt,
      viewpoints: viewpoints.map((v) => ({
        title: v.title,
        description: v.description,
        responseIndices: v.responses.map((r) =>
          prompt.responses.findIndex((pr) => pr.id === r.id)
        ),
      })),
    })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
