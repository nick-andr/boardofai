import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEnabledModels } from '@/lib/models'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/conversations/[id]/continue-one-to-one
// Create (or reopen) a 1:1 child conversation for the given model, seeded from the parent board conversation.
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()
    const { modelId } = body as { modelId?: string }

    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 },
      )
    }

    const parent = await prisma.conversation.findUnique({
      where: { id },
      include: {
        prompts: {
          orderBy: { createdAt: 'asc' },
          include: {
            responses: true,
          },
        },
        children: true,
      },
    })

    if (!parent) {
      return NextResponse.json(
        { error: 'Parent conversation not found' },
        { status: 404 },
      )
    }

    // If a child for this (parent, model) already exists, just return it.
    const existingChild = parent.children.find((c) => c.modelId === modelId)
    if (existingChild) {
      return NextResponse.json({ childId: existingChild.id })
    }

    // Extract (user, model) pairs where the model responded successfully.
    const pairs: Array<{ user: string; assistant: string }> = []
    for (const p of parent.prompts) {
      const r = p.responses.find(
        (resp) => resp.modelId === modelId && resp.status === 'completed',
      )
      if (r) {
        pairs.push({
          user: p.content,
          assistant: r.content,
        })
      }
    }

    if (pairs.length === 0) {
      return NextResponse.json(
        { error: 'No successful responses for this model in parent conversation' },
        { status: 400 },
      )
    }

    const enabledModels = getEnabledModels()
    const modelConfig = enabledModels.find((m) => m.id === modelId)
    const modelName = modelConfig?.name ?? modelId

    const parentSummary = parent.summary ?? null

    const child = await prisma.conversation.create({
      data: {
        parentId: parent.id,
        modelId,
        summary: parentSummary,
        title:
          `${modelName} · ` +
          (parent.title ||
            parent.prompts[0]?.content.slice(0, 60) ||
            'Follow-up'),
      },
    })

    // Seed prompts/responses in the child.
    for (const pair of pairs) {
      const prompt = await prisma.prompt.create({
        data: {
          conversationId: child.id,
          content: pair.user,
          modelCount: 1,
        },
      })
      await prisma.modelResponse.create({
        data: {
          promptId: prompt.id,
          modelId,
          modelName,
          content: pair.assistant,
          status: 'completed',
        },
      })
    }

    return NextResponse.json({ childId: child.id })
  } catch (error) {
    console.error('Error creating 1:1 conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

