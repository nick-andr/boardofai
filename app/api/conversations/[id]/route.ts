import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

// DELETE /api/conversations/[id] - remove a conversation and all related data
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    // If this is a parent conversation, delete its children first.
    await prisma.conversation.deleteMany({
      where: { parentId: id },
    })

    await prisma.conversation.delete({
      where: { id },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 },
    )
  }
}

// PATCH /api/conversations/[id] - update conversation (e.g. title)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title } = body as { title?: string }

    if (typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Invalid body: title must be a string' },
        { status: 400 },
      )
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { title: title.trim() || null },
    })
    return NextResponse.json(conversation)
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 },
    )
  }
}

// Optional: GET /api/conversations/[id] - fetch full conversation details
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        prompts: {
          include: {
            responses: {
              include: {
                viewpoint: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            summary: true,
            _count: {
              select: { responses: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
