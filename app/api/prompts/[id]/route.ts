import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSummaryAndViewpoints } from '@/lib/summary'

/** POST: Ensure summary exists (e.g. after reconnect). Generates if missing. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: { summary: true, responses: { select: { status: true } } },
    })
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }
    const hasCompleted = prompt.responses.some((r) => r.status === 'completed')
    if (!hasCompleted) {
      return NextResponse.json({ summary: null })
    }
    if (prompt.summary) {
      return NextResponse.json({ summary: { content: prompt.summary.content } })
    }
    await generateSummaryAndViewpoints(id)
    const updated = await prisma.prompt.findUnique({
      where: { id },
      include: { summary: true },
    })
    return NextResponse.json({
      summary: updated?.summary ? { content: updated.summary.content } : null,
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
